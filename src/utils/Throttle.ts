/**
 * Throttle.ts — Frame-rate throttle utility.
 * Decouples expensive operations (like uniform uploads) from the render rate.
 */
export class Throttle {
    private intervalMs: number;
    private lastTime: number = 0;
    private firstCall: boolean = true;

    /**
     * @param targetFps — How many times per second this should return true.
     */
    constructor(targetFps: number) {
        this.intervalMs = targetFps > 0 ? 1000 / targetFps : 0;
    }

    /**
     * Call this every frame. Returns true if enough time has elapsed since the last "true".
     * @param now — Current timestamp in ms (e.g., performance.now()). 
     */
    shouldUpdate(now: number): boolean {
        if (this.intervalMs <= 0) return true;
        if (this.firstCall) {
            this.firstCall = false;
            this.lastTime = now;
            return true;
        }
        if (now - this.lastTime >= this.intervalMs) {
            this.lastTime = now;
            return true;
        }
        return false;
    }

    /** Reset the throttle (e.g., on file load). */
    reset(): void {
        this.lastTime = 0;
        this.firstCall = true;
    }
}
