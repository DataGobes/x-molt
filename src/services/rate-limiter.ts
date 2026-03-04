import { EFFECTIVE_DELETE_LIMIT, DELETE_RATE_WINDOW_MS, ENDPOINT_RATE_LIMITS } from "../utils/constants.js";

interface Bucket {
  timestamps: number[];
  limit: number;
  windowMs: number;
}

export class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();
  private defaultEndpoint: string;

  constructor(limit = EFFECTIVE_DELETE_LIMIT, windowMs = DELETE_RATE_WINDOW_MS) {
    // Default bucket for backward compat (batch-delete uses `new RateLimiter()`)
    this.defaultEndpoint = "tweets/delete";
    this.buckets.set(this.defaultEndpoint, { timestamps: [], limit, windowMs });
  }

  registerEndpoint(endpoint: string, limit?: number, windowMs?: number): void {
    if (this.buckets.has(endpoint)) return;
    const config = ENDPOINT_RATE_LIMITS[endpoint];
    const effectiveLimit = limit ?? (config ? config.limit - config.safetyBuffer : 45);
    const effectiveWindow = windowMs ?? DELETE_RATE_WINDOW_MS;
    this.buckets.set(endpoint, { timestamps: [], limit: effectiveLimit, windowMs: effectiveWindow });
  }

  private getBucket(endpoint?: string): Bucket {
    const key = endpoint ?? this.defaultEndpoint;
    if (!this.buckets.has(key)) {
      this.registerEndpoint(key);
    }
    return this.buckets.get(key)!;
  }

  private pruneOld(bucket: Bucket) {
    const cutoff = Date.now() - bucket.windowMs;
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  }

  canProceed(endpoint?: string): boolean {
    const bucket = this.getBucket(endpoint);
    this.pruneOld(bucket);
    return bucket.timestamps.length < bucket.limit;
  }

  record(endpoint?: string) {
    const bucket = this.getBucket(endpoint);
    bucket.timestamps.push(Date.now());
  }

  getWaitTime(endpoint?: string): number {
    const bucket = this.getBucket(endpoint);
    this.pruneOld(bucket);
    if (bucket.timestamps.length < bucket.limit) return 0;
    const oldest = bucket.timestamps[0];
    return oldest + bucket.windowMs - Date.now();
  }

  remaining(endpoint?: string): number {
    const bucket = this.getBucket(endpoint);
    this.pruneOld(bucket);
    return Math.max(0, bucket.limit - bucket.timestamps.length);
  }

  async waitForSlot(signal?: AbortSignal, endpoint?: string): Promise<boolean> {
    while (!this.canProceed(endpoint)) {
      if (signal?.aborted) return false;
      const wait = this.getWaitTime(endpoint);
      if (wait <= 0) break;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, Math.min(wait, 1000));
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
    return !signal?.aborted;
  }
}
