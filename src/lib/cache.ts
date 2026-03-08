/**
 * Simple In-Memory Cache
 * 
 * For production with multiple servers, use Redis.
 * This implementation provides basic caching for single-instance deployments.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds = 300) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttl;

    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get or compute a value
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; cleanupRecommended: boolean } {
    const size = this.store.size;
    // Recommend cleanup if size exceeds 1000 entries
    const cleanupRecommended = size > 1000;

    return { size, cleanupRecommended };
  }
}

// Global cache instance
export const cache = new Cache(300); // 5 minute default TTL

// Cache key generators
export const CacheKeys = {
  /**
   * Supplier profile cache key
   */
  supplierProfile(supplierId: string): string {
    return `supplier:profile:${supplierId}`;
  },

  /**
   * Supplier config cache key
   */
  supplierConfig(supplierId: string): string {
    return `supplier:config:${supplierId}`;
  },

  /**
   * Client suppliers cache key
   */
  clientSuppliers(clientId: string): string {
    return `client:suppliers:${clientId}`;
  },

  /**
   * Supplier clients cache key
   */
  supplierClients(supplierId: string): string {
    return `supplier:clients:${supplierId}`;
  },

  /**
   * Quote results cache key
   */
  quoteResults(quoteId: string): string {
    return `quote:results:${quoteId}`;
  },

  /**
   * Global stats cache key
   */
  globalStats(): string {
    return `admin:global-stats`;
  },

  /**
   * Supplier stats cache key
   */
  supplierStats(supplierId: string): string {
    return `supplier:stats:${supplierId}`;
  },
};

// Cache TTL configurations (in seconds)
export const CacheTTL = {
  supplierProfile: 300, // 5 minutes
  supplierConfig: 600, // 10 minutes
  clientSuppliers: 180, // 3 minutes
  supplierClients: 180, // 3 minutes
  quoteResults: 3600, // 1 hour
  globalStats: 300, // 5 minutes
  supplierStats: 180, // 3 minutes
};

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));

  for (const key of cache['store'].keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate supplier cache
 */
export function invalidateSupplierCache(supplierId: string): void {
  cache.delete(CacheKeys.supplierProfile(supplierId));
  cache.delete(CacheKeys.supplierConfig(supplierId));
  cache.delete(CacheKeys.supplierStats(supplierId));
  cache.delete(CacheKeys.supplierClients(supplierId));
}

/**
 * Invalidate client cache
 */
export function invalidateClientCache(clientId: string): void {
  cache.delete(CacheKeys.clientSuppliers(clientId));
}

// Periodic cleanup (every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(() => {
    const cleaned = cache.cleanup();
    const stats = cache.getStats();

    if (cleaned > 0 || stats.cleanupRecommended) {
      console.log(`[Cache] Cleaned ${cleaned} entries. Size: ${stats.size}`);
    }
  }, 5 * 60 * 1000);
}
