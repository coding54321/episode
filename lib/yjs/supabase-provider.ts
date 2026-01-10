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
        let state: Uint8Array;
        if (typeof data.doc_state === 'string') {
          // base64 문자열인 경우
          state = Uint8Array.from(atob(data.doc_state), c => c.charCodeAt(0));
        } else if (Buffer.isBuffer(data.doc_state)) {
          // Buffer인 경우
          state = new Uint8Array(data.doc_state);
        } else {
          // 이미 Uint8Array인 경우
          state = new Uint8Array(data.doc_state);
        }
        // Yjs 문서에 상태 적용
        Y.applyUpdate(this.ydoc, state, this);
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
      const updateData = Uint8Array.from(
        atob(payload.new.update_data)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
              // Yjs 문서에 업데이트 적용
              Y.applyUpdate(this.ydoc, updateData, this);
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

