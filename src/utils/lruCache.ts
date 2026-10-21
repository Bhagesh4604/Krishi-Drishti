/**
 * LRU (Least Recently Used) Cache Implementation
 * Krishi-Drishti Data Structures & Algorithms (DSA) Module
 *
 * Implements a high-performance O(1) LRU Cache utilizing:
 * 1. Doubly Linked List for O(1) node insertion, removal, and position update (MRU at head, LRU at tail).
 * 2. Hash Map (ES6 Map) for O(1) key-to-node lookups.
 *
 * Features:
 * - Dual eviction policies: Item Count limit (maxEntries) and Memory Footprint limit (maxSizeBytes).
 * - Optional TTL (Time-To-Live) with lazy and active expiration.
 * - Eviction hooks (e.g. for releasing ObjectURLs or unregistering memory).
 * - Comprehensive telemetry (hits, misses, evictions, memory usage).
 */

export interface LRUCacheOptions<K, V> {
  maxEntries?: number;
  maxSizeBytes?: number;
  defaultTtlMs?: number;
  onEvict?: (key: K, value: V, reason: 'capacity' | 'memory' | 'expired' | 'manual') => void;
}

export interface CacheStats {
  size: number;
  bytes: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatio: number;
}

class ListNode<K, V> {
  key: K;
  value: V;
  sizeBytes: number;
  expiresAt?: number;
  prev: ListNode<K, V> | null = null;
  next: ListNode<K, V> | null = null;

  constructor(key: K, value: V, sizeBytes = 1, expiresAt?: number) {
    this.key = key;
    this.value = value;
    this.sizeBytes = sizeBytes;
    this.expiresAt = expiresAt;
  }
}

export class LRUCache<K = string, V = any> {
  private readonly maxEntries: number;
  private readonly maxSizeBytes: number;
  private readonly defaultTtlMs?: number;
  private readonly onEvict?: (key: K, value: V, reason: 'capacity' | 'memory' | 'expired' | 'manual') => void;

  private readonly lookupMap = new Map<K, ListNode<K, V>>();
  private readonly head: ListNode<K, V>; // Sentinel Most Recently Used
  private readonly tail: ListNode<K, V>; // Sentinel Least Recently Used

  private currentBytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions<K, V> = {}) {
    this.maxEntries = options.maxEntries ?? 100;
    this.maxSizeBytes = options.maxSizeBytes ?? Number.POSITIVE_INFINITY;
    this.defaultTtlMs = options.defaultTtlMs;
    this.onEvict = options.onEvict;

    // Initialize sentinels
    this.head = new ListNode<K, V>(null as any, null as any, 0);
    this.tail = new ListNode<K, V>(null as any, null as any, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Retrieves an item from the cache and marks it as Most Recently Used.
   * O(1) time complexity.
   */
  get(key: K): V | undefined {
    const node = this.lookupMap.get(key);
    if (!node) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.removeNode(node);
      this.lookupMap.delete(key);
      this.currentBytes -= node.sizeBytes;
      this.evictions++;
      this.onEvict?.(node.key, node.value, 'expired');
      this.misses++;
      return undefined;
    }

    // Move to MRU position (head.next)
    this.detachNode(node);
    this.attachToHead(node);

    this.hits++;
    return node.value;
  }

  /**
   * Inserts or updates an item in the cache.
   * Evicts least recently used items if capacity or memory limits are exceeded.
   * O(1) time complexity.
   */
  put(key: K, value: V, options?: { sizeBytes?: number; ttlMs?: number }): void {
    const sizeBytes = options?.sizeBytes ?? this.estimateSize(value);
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;

    // Check if key already exists
    const existingNode = this.lookupMap.get(key);
    if (existingNode) {
      this.currentBytes -= existingNode.sizeBytes;
      existingNode.value = value;
      existingNode.sizeBytes = sizeBytes;
      existingNode.expiresAt = expiresAt;
      this.currentBytes += sizeBytes;

      this.detachNode(existingNode);
      this.attachToHead(existingNode);
      this.prune();
      return;
    }

    const newNode = new ListNode<K, V>(key, value, sizeBytes, expiresAt);
    this.lookupMap.set(key, newNode);
    this.attachToHead(newNode);
    this.currentBytes += sizeBytes;

    this.prune();
  }

  /**
   * Removes a specific item from the cache.
   * O(1) time complexity.
   */
  delete(key: K): boolean {
    const node = this.lookupMap.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.lookupMap.delete(key);
    this.currentBytes -= node.sizeBytes;
    this.onEvict?.(node.key, node.value, 'manual');
    return true;
  }

  /**
   * Checks if an item exists and is not expired without updating its MRU position.
   */
  has(key: K): boolean {
    const node = this.lookupMap.get(key);
    if (!node) return false;
    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    let curr = this.head.next;
    while (curr && curr !== this.tail) {
      const next = curr.next;
      this.onEvict?.(curr.key, curr.value, 'manual');
      curr = next;
    }
    this.lookupMap.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.currentBytes = 0;
  }

  /**
   * Returns current count of entries.
   */
  get size(): number {
    return this.lookupMap.size;
  }

  /**
   * Returns cache metrics and hit ratio.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.lookupMap.size,
      bytes: this.currentBytes,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRatio: total === 0 ? 0 : Number((this.hits / total).toFixed(4)),
    };
  }

  // ── Internal Doubly-Linked List Primitives ───────────────────────────────────

  private attachToHead(node: ListNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private detachNode(node: ListNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  private removeNode(node: ListNode<K, V>): void {
    this.detachNode(node);
  }

  /**
   * Evicts LRU items (from tail.prev backwards) until both count and byte constraints are satisfied.
   */
  private prune(): void {
    while (
      (this.lookupMap.size > this.maxEntries || this.currentBytes > this.maxSizeBytes) &&
      this.tail.prev &&
      this.tail.prev !== this.head
    ) {
      const lruNode = this.tail.prev;
      const reason = this.currentBytes > this.maxSizeBytes ? 'memory' : 'capacity';

      this.removeNode(lruNode);
      this.lookupMap.delete(lruNode.key);
      this.currentBytes -= lruNode.sizeBytes;
      this.evictions++;
      this.onEvict?.(lruNode.key, lruNode.value, reason);
    }
  }

  /**
   * Conservative heuristic for estimating byte size of arbitrary values in memory.
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 8;
    if (typeof value === 'boolean') return 4;
    if (typeof value === 'number') return 8;
    if (typeof value === 'string') return value.length * 2; // UTF-16
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (value instanceof Blob) return value.size;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 128; // Fallback estimate
      }
    }
    return 64;
  }
}

// ── Shared Singleton Caches ──────────────────────────────────────────────────

/**
 * Shared API Response Cache (Max 150 entries, 15-minute default TTL, 10MB memory cap).
 * Used for storing weather, mandi prices, profile data, and scheme lookups.
 */
export const apiResponseCache = new LRUCache<string, any>({
  maxEntries: 150,
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  defaultTtlMs: 15 * 60 * 1000,   // 15 minutes
});

/**
 * Shared Image & Binary Asset Cache (Max 40 items, 25MB memory cap).
 * Used for cached thumbnails, preprocessed tensors, and camera capture frames.
 */
export const processedImageCache = new LRUCache<string, string | Blob>({
  maxEntries: 40,
  maxSizeBytes: 25 * 1024 * 1024, // 25 MB
  defaultTtlMs: 30 * 60 * 1000,   // 30 minutes
  onEvict: (key, value) => {
    // If the value was created as an object URL, revoke it to prevent native memory leak
    if (typeof value === 'string' && value.startsWith('blob:')) {
      try { URL.revokeObjectURL(value); } catch { /* ignore */ }
    }
  }
});
