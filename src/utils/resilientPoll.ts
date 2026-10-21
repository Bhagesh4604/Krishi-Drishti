/**
 * Resilient Network Polling & Request Dispatcher
 * Krishi-Drishti Networking Architecture
 *
 * Implements:
 * 1. Exponential Backoff with Decorrelated Jitter to handle Render free-tier cold-starts
 *    and prevent server overload / thundering herd.
 * 2. Binary Min-Heap Priority Queue for backend requests, allowing interactive user
 *    inference requests to jump ahead of background telemetry and polling.
 * 3. Safe polling loop (`pollWithBackoff`) with terminal conditions and max latency budgets.
 */

import { PriorityQueue, PriorityLevel, QueuedTask } from './priorityQueue';

export interface BackoffOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitterFactor?: number; // 0 to 1 (e.g. 0.25 = ±25% randomized jitter)
  maxRetries?: number;
  timeoutMs?: number;
  priority?: PriorityLevel;
  retryOnStatus?: number[]; // HTTP status codes to retry (e.g. [408, 429, 500, 502, 503, 504])
}

const DEFAULT_OPTIONS: Required<BackoffOptions> = {
  initialDelayMs: 1500,
  maxDelayMs: 25000,
  backoffFactor: 1.8,
  jitterFactor: 0.25,
  maxRetries: 5,
  timeoutMs: 90000,
  priority: PriorityLevel.NORMAL,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

export class ResilientDispatcher {
  private queue = new PriorityQueue();
  private activeWorkers = 0;
  private readonly maxConcurrent = 4;
  private taskIdCounter = 0;

  /**
   * Dispatches a request through the priority queue with exponential backoff on transient errors.
   */
  public execute<T>(
    requestFn: () => Promise<T>,
    options: BackoffOptions = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: `task_${++this.taskIdCounter}_${Date.now()}`,
        priority: opts.priority,
        timestamp: Date.now(),
        execute: () => this.executeWithBackoff(requestFn, opts),
        resolve,
        reject,
      };

      this.queue.enqueue(task);
      this.drain();
    });
  }

  /**
   * Executes a polling loop with exponential backoff until a condition is met or timeout expires.
   */
  public async pollUntil<T>(
    pollFn: () => Promise<T>,
    isComplete: (result: T) => boolean,
    isFailed: (result: T) => string | null | false,
    options: BackoffOptions = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let attempt = 0;

    while (true) {
      if (Date.now() - startTime > opts.timeoutMs) {
        throw new Error(`Polling timed out after ${opts.timeoutMs}ms (Render cold start/inference dropped).`);
      }

      try {
        const result = await this.execute(pollFn, {
          priority: opts.priority,
          timeoutMs: opts.timeoutMs,
        });

        const failureReason = isFailed(result);
        if (failureReason) {
          throw new Error(typeof failureReason === 'string' ? failureReason : 'Operation reported failure status');
        }

        if (isComplete(result)) {
          return result;
        }
      } catch (err: any) {
        // If it's a non-retryable error, abort immediately
        if (!this.isTransientError(err, opts.retryOnStatus)) {
          throw err;
        }
        console.warn(`[ResilientPoll] Transient failure on attempt ${attempt + 1}:`, err?.message || err);
      }

      attempt++;
      const delay = this.calculateDelay(attempt, opts);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // ── Concurrency Engine ───────────────────────────────────────────────────────

  private async drain(): Promise<void> {
    while (this.activeWorkers < this.maxConcurrent && !this.queue.isEmpty()) {
      const nextTask = this.queue.dequeue();
      if (!nextTask) break;

      this.activeWorkers++;
      (async () => {
        try {
          const res = await nextTask.execute();
          nextTask.resolve(res);
        } catch (err) {
          nextTask.reject(err);
        } finally {
          this.activeWorkers--;
          this.drain();
        }
      })();
    }
  }

  private async executeWithBackoff<T>(
    requestFn: () => Promise<T>,
    opts: Required<BackoffOptions>
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await requestFn();
      } catch (err: any) {
        attempt++;

        if (attempt > opts.maxRetries || !this.isTransientError(err, opts.retryOnStatus)) {
          throw err;
        }

        const delay = this.calculateDelay(attempt, opts);
        console.warn(
          `[ResilientDispatcher] Request failed (${err?.message || 'Error'}). Retrying in ${Math.round(delay)}ms (Attempt ${attempt}/${opts.maxRetries})...`
        );
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  private calculateDelay(attempt: number, opts: Required<BackoffOptions>): number {
    const rawDelay = opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1);
    const cappedDelay = Math.min(rawDelay, opts.maxDelayMs);
    // Decorrelated jitter: cappedDelay * (1 ± jitterFactor)
    const jitter = (Math.random() * 2 - 1) * opts.jitterFactor;
    return Math.max(500, cappedDelay * (1 + jitter));
  }

  private isTransientError(error: any, retryStatuses: number[]): boolean {
    if (!error) return false;

    // Network errors (no response from server)
    if (error.code === 'ECONNABORTED' || error.message?.includes('Network Error') || error.message?.includes('timeout')) {
      return true;
    }

    // Axios error response status check
    const status = error.response?.status;
    if (status && retryStatuses.includes(status)) {
      return true;
    }

    // Fetch TypeError (network failed)
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return true;
    }

    return false;
  }
}

// Global Singleton Dispatcher
export const resilientDispatcher = new ResilientDispatcher();
