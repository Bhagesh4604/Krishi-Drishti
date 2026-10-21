/**
 * Binary Min-Heap Priority Queue (DSA)
 * Krishi-Drishti Networking Architecture
 *
 * Provides O(log N) enqueue and dequeue operations.
 * Allows critical user interactions (AI crop diagnosis, authentication) to
 * supersede background polling and telemetry during Render backend cold-starts.
 */

export enum PriorityLevel {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface QueuedTask<T = any> {
  id: string;
  priority: PriorityLevel;
  timestamp: number;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  metadata?: Record<string, any>;
}

export class PriorityQueue<T = any> {
  private heap: QueuedTask<T>[] = [];

  /**
   * Enqueues a task into the min-heap.
   * O(log N) complexity.
   */
  enqueue(task: QueuedTask<T>): void {
    this.heap.push(task);
    this.siftUp(this.heap.length - 1);
  }

  /**
   * Extracts and returns the highest-priority task (lowest numeric priority value).
   * O(log N) complexity.
   */
  dequeue(): QueuedTask<T> | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const top = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.siftDown(0);
    return top;
  }

  /**
   * Peeks at the highest-priority task without removing it.
   * O(1) complexity.
   */
  peek(): QueuedTask<T> | undefined {
    return this.heap[0];
  }

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  clear(): void {
    this.heap = [];
  }

  // ── Heap Primitives ────────────────────────────────────────────────────────

  private siftUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(this.heap[current], this.heap[parent]) < 0) {
        this.swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    let current = index;
    const length = this.heap.length;

    while (true) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let smallest = current;

      if (left < length && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest !== current) {
        this.swap(current, smallest);
        current = smallest;
      } else {
        break;
      }
    }
  }

  /**
   * Primary comparator: Priority level (lower number = higher priority).
   * Secondary comparator (tie-breaker): Timestamp FIFO (older task executes first).
   */
  private compare(a: QueuedTask<T>, b: QueuedTask<T>): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.timestamp - b.timestamp;
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
