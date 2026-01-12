import { User } from '@/types'

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class AuthCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5분

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    const now = Date.now()

    if (now > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 사용자 정보 캐싱
  setUser(userId: string, user: User): void {
    this.set(`user:${userId}`, user, 10 * 60 * 1000) // 10분
  }

  getUser(userId: string): User | null {
    return this.get<User>(`user:${userId}`)
  }

  // 세션 정보 캐싱
  setSessionValid(userId: string, isValid: boolean): void {
    this.set(`session:${userId}`, isValid, 2 * 60 * 1000) // 2분
  }

  isSessionValid(userId: string): boolean | null {
    return this.get<boolean>(`session:${userId}`)
  }

  // 사용자 관련 모든 캐시 삭제
  clearUserCache(userId: string): void {
    this.delete(`user:${userId}`)
    this.delete(`session:${userId}`)
  }

  // 만료된 항목 정리
  cleanup(): void {
    const now = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

export const authCache = new AuthCache()

// 정기적으로 만료된 캐시 정리
if (typeof window !== 'undefined') {
  setInterval(() => {
    authCache.cleanup()
  }, 5 * 60 * 1000) // 5분마다
}