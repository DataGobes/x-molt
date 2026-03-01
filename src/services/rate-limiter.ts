import { EFFECTIVE_DELETE_LIMIT, DELETE_RATE_WINDOW_MS } from "../utils/constants.js";

export class RateLimiter {
  private timestamps: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor(limit = EFFECTIVE_DELETE_LIMIT, windowMs = DELETE_RATE_WINDOW_MS) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  private pruneOld() {
    const cutoff = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }

  canProceed(): boolean {
    this.pruneOld();
    return this.timestamps.length < this.limit;
  }

  record() {
    this.timestamps.push(Date.now());
  }

  getWaitTime(): number {
    this.pruneOld();
    if (this.timestamps.length < this.limit) return 0;
    // Wait until the oldest request in the window expires
    const oldest = this.timestamps[0];
    return oldest + this.windowMs - Date.now();
  }

  get remaining(): number {
    this.pruneOld();
    return Math.max(0, this.limit - this.timestamps.length);
  }

  async waitForSlot(signal?: AbortSignal): Promise<boolean> {
    while (!this.canProceed()) {
      if (signal?.aborted) return false;
      const wait = this.getWaitTime();
      if (wait <= 0) break;
      await new Promise<void>((resolve, reject) => {
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
