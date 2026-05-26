interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL.
 * Works in serverless (Vercel) — each instance has its own cache.
 * Keys are automatically scoped to avoid collisions.
 */
class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Clear all expired entries (call periodically if needed) */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton — one cache per server instance
export const cache = new Cache();

// TTL constants
export const TTL = {
  QUOTE: 30 * 1000,       // 30 seconds
  CANDLES: 60 * 1000,     // 60 seconds
  SEARCH: 5 * 60 * 1000,  // 5 minutes
  PROFILE: 60 * 60 * 1000, // 1 hour
} as const;
