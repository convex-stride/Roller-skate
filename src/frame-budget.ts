/** Slow adjustment with hysteresis: loading spikes don't permanently lower quality. */
export class FrameBudget {
  level = 0;
  averageMs = 16.7;
  private slow = 0;
  private fast = 0;
  private warmup = 2;
  private busyTime = 0;
  reset() { this.level = 0; this.averageMs = 16.7; this.slow = this.fast = this.busyTime = 0; this.warmup = 2; }
  sample(seconds: number, busy = false): boolean {
    if (!Number.isFinite(seconds) || seconds <= 0) return false;
    const dt = Math.min(seconds, .5);
    this.busyTime = busy ? this.busyTime + dt : 0;
    if (this.warmup > 0) { this.warmup -= dt; this.slow = this.fast = 0; return false; }
    // A short loading pulse must not erase an already sustained slow-frame
    // history; otherwise a sequence of chunks can keep auto quality stuck high.
    if (busy && this.busyTime < .75) { this.fast = 0; return false; }
    this.averageMs += (Math.min(seconds,1) * 1000 - this.averageMs) * (1 - Math.exp(-dt * 3));
    this.slow = seconds > .025 && this.averageMs > 25 ? this.slow + dt : 0;
    this.fast = !busy && this.averageMs < 18 ? this.fast + dt : 0;
    if (this.slow > 1.5 && this.level < 4) { this.level++; this.slow = this.fast = 0; return true; }
    if (this.fast > 10 && this.level > 0) { this.level--; this.slow = this.fast = 0; return true; }
    return false;
  }
  get scale() { return [1, .85, .7, .55, .45][this.level]; }
}
