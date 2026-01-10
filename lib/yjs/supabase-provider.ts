import * as Y from 'yjs';
import { supabase } from '../supabase/client';
import { getCurrentUser } from '../supabase/auth';

export interface SupabaseProviderOptions {
  projectId: string;
  awareness?: any; // Yjs awareness (선택사항)
}

/**
 * Supabase Realtime을 사용한 Yjs Provider
 * yjs_updates 테이블을 통해 업데이트를 동기화합니다.
 */
export class SupabaseProvider {
  private ydoc: Y.Doc;
  private projectId: string;
  private clientId: string;
  private channel: any; // Supabase Realtime channel
  private synced: boolean = false;
  private awareness: any;
  private updateHandler: (update: Uint8Array, origin: any) => void;
  private unsubscribe: (() => void) | null = null;

  constructor(ydoc: Y.Doc, options: SupabaseProviderOptions) {
    this.ydoc = ydoc;
    this.projectId = options.projectId;
    this.clientId = this.generateClientId();
    this.awareness = options.awareness;

    // Yjs 업데이트 핸들러
    this.updateHandler = (update: Uint8Array, origin: any) => {
      // 로컬에서 발생한 업데이트만 Supabase에 저장
      if (origin !== this) {
        this.broadcastUpdate(update);
      }
    };

    this.ydoc.on('update', this.updateHandler);
    this.connect();
  }

  /**
   * 고유한 클라이언트 ID 생성
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Supabase에 연결하고 초기 문서 상태 로드
   */
  private async connect() {
    try {
      // 1. 초기 문서 상태 로드 (yjs_docs)
      await this.loadDocumentState();

      // 2. Realtime 구독 설정
      this.setupRealtimeSubscription();

      // 3. 동기화 완료
      this.synced = true;
      this.emit('synced', [{ synced: true }]);
    } catch (error) {
      console.error('Failed to connect to Supabase:', error);
      this.emit('connection-error', [error]);
    }
  }

  /**
   * yjs_docs 테이블에서 문서 상태 로드
   */
  private async loadDocumentState() {
    try {
      const { data, error } = await supabase
        .from('yjs_docs')
        .select('*')
        .eq('project_id', this.projectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // 문서가 없는 경우는 정상 (새 프로젝트)
        throw error;
      }

      if (data && data.doc_state) {
        // bytea를 Uint8Array로 변환
        // Supabase에서 bytea는 base64 문자열로 반환됨
        let state: Uint8Array | null = null;
        
        try {
          const docState = data.doc_state as any; // 타입 체크를 위해 any로 캐스팅
          
          if (typeof docState === 'string') {
            // base64 문자열인지 확인하고 디코딩
            try {
              // 유효한 base64 문자열인지 검증
              const decoded = atob(docState);
              state = Uint8Array.from(decoded, c => c.charCodeAt(0));
            } catch (base64Error) {
              // base64가 아닌 경우, 이미 바이너리 데이터일 수 있음
              console.warn('doc_state is not valid base64, skipping:', base64Error);
              return; // 유효하지 않은 base64면 건너뜀
            }
          } else if (Buffer.isBuffer(docState)) {
            // Buffer인 경우
            state = new Uint8Array(docState);
          } else if (docState instanceof Uint8Array) {
            // 이미 Uint8Array인 경우
            state = docState;
          } else if (Array.isArray(docState)) {
            // 배열인 경우
            state = new Uint8Array(docState);
          } else {
            console.warn('Unknown doc_state format, skipping:', typeof docState);
            return; // 알 수 없는 형식이면 건너뜀
          }
          
          // Yjs 문서에 상태 적용
          // encodeStateAsUpdate로 인코딩된 데이터는 applyUpdate로 직접 적용 가능
          // 하지만 유효성 검증을 위해 try-catch로 감싸기
          if (state && state.length > 0) {
            try {
              // 최소 길이 검증 (Yjs 업데이트는 최소 몇 바이트 필요)
              if (state.length < 1) {
                console.warn('doc_state is too short, skipping');
                return;
              }
              
              // Yjs 문서에 상태 적용
              Y.applyUpdate(this.ydoc, state, this);
              console.log('Successfully loaded document state from Supabase');
            } catch (applyError) {
              // applyUpdate 실패 시 로그만 남기고 계속 진행
              // (로컬에서 이미 초기화된 노드를 사용)
              console.warn('Failed to apply document state, using local state:', applyError, {
                stateLength: state.length,
                statePreview: Array.from(state.slice(0, 20)),
              });
            }
          }
        } catch (error) {
          console.error('Failed to decode document state:', error, {
            docStateType: typeof data.doc_state,
            docStateLength: data.doc_state?.length,
            docStatePreview: typeof data.doc_state === 'string' 
              ? data.doc_state.substring(0, 100) 
              : 'not a string',
          });
          // 에러가 발생해도 계속 진행 (로컬 상태 사용)
        }
      } else {
        // doc_state가 없으면 새 문서로 시작
        console.log('No document state found in Supabase, starting with local state');
      }
    } catch (error) {
      console.error('Failed to load document state:', error);
    }
  }

  /**
   * Supabase Realtime 구독 설정
   */
  private setupRealtimeSubscription() {
    // yjs_updates 테이블 변경 감지
    this.channel = supabase
      .channel(`yjs_updates:${this.projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yjs_updates',
          filter: `project_id=eq.${this.projectId}`,
        },
        async (payload: any) => {
          // 다른 클라이언트의 업데이트만 처리 (자신의 업데이트는 제외)
          if (payload.new.client_id !== this.clientId) {
            try {
              // bytea를 Uint8Array로 변환
              // Supabase에서 bytea는 base64로 인코딩되어 옴
              let updateData: Uint8Array;
              
              if (typeof payload.new.update_data === 'string') {
                try {
                  const decoded = atob(payload.new.update_data);
                  updateData = Uint8Array.from(decoded, c => c.charCodeAt(0));
                } catch (base64Error) {
                  console.error('Failed to decode update_data as base64:', base64Error, {
                    updateDataType: typeof payload.new.update_data,
                    updateDataLength: payload.new.update_data?.length,
                    updateDataPreview: payload.new.update_data?.substring(0, 100),
                  });
                  return; // 디코딩 실패 시 건너뜀
                }
              } else if (payload.new.update_data instanceof Uint8Array) {
                updateData = payload.new.update_data;
              } else if (Array.isArray(payload.new.update_data)) {
                updateData = new Uint8Array(payload.new.update_data);
              } else {
                console.error('Unknown update_data format:', typeof payload.new.update_data);
                return;
              }
              
              // Yjs 문서에 업데이트 적용
              if (updateData && updateData.length > 0) {
                Y.applyUpdate(this.ydoc, updateData, this);
              }
            } catch (error) {
              console.error('Failed to apply update:', error);
            }
          }
        }
      )
      .subscribe();

    this.unsubscribe = () => {
      if (this.channel) {
        supabase.removeChannel(this.channel);
      }
    };
  }

  /**
   * 업데이트를 Supabase에 브로드캐스트
   */
  private async broadcastUpdate(update: Uint8Array) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Uint8Array를 base64로 변환
      const base64Update = btoa(
        String.fromCharCode(...Array.from(update))
      );

      // yjs_updates 테이블에 저장
      const { error } = await supabase.from('yjs_updates').insert({
        project_id: this.projectId,
        update_data: base64Update,
        client_id: this.clientId,
      });

      if (error) {
        console.error('Failed to broadcast update:', error);
      } else {
        // 문서 상태도 주기적으로 저장 (최적화: debounce 필요)
        await this.saveDocumentState();
      }
    } catch (error) {
      console.error('Failed to broadcast update:', error);
    }
  }

  /**
   * 문서 상태를 yjs_docs 테이블에 저장
   */
  private async saveDocumentState() {
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc);
      const base64State = btoa(String.fromCharCode(...Array.from(state)));

      const { error } = await supabase
        .from('yjs_docs')
        .upsert(
          {
            project_id: this.projectId,
            doc_state: base64State,
            version: (this.ydoc as any).version || 0,
          },
          { onConflict: 'project_id' }
        );

      if (error) {
        console.error('Failed to save document state:', error);
      }
    } catch (error) {
      console.error('Failed to save document state:', error);
    }
  }

  /**
   * 이벤트 발생 (Yjs Provider 인터페이스 호환)
   */
  private emit(event: string, args: any[]) {
    // 간단한 이벤트 시스템 (필요시 확장)
    if (event === 'synced' && this.onSynced) {
      this.onSynced();
    }
    if (event === 'connection-error' && this.onConnectionError) {
      this.onConnectionError(args[0]);
    }
  }

  onSynced?: () => void;
  onConnectionError?: (error: any) => void;

  /**
   * Provider 연결 해제
   */
  destroy() {
    if (this.updateHandler) {
      this.ydoc.off('update', this.updateHandler);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.synced = false;
  }

  /**
   * 동기화 상태 확인
   */
  get isSynced(): boolean {
    return this.synced;
  }
}

