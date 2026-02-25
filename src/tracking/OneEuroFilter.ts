/**
 * 1€ Filter (One Euro Filter)
 * 
 * An adaptive low-pass filter that adjusts its cutoff frequency based on the
 * speed of the input signal. At low speeds (near-static), it applies heavy 
 * smoothing. At high speeds (fast motion), it reduces smoothing to minimize lag.
 * 
 * Reference: https://gery.casiez.net/1euro/
 */

export interface OneEuroFilterOptions {
    /** Minimum cutoff frequency in Hz. Lower = more smoothing at rest. */
    minCutoff?: number;
    /** Speed coefficient. Higher = less smoothing during fast motion. */
    beta?: number;
    /** Derivative cutoff frequency in Hz. */
    dCutoff?: number;
}

class LowPassFilter {
    private y: number = 0;
    private s: number = 0;
    private initialized: boolean = false;

    filter(value: number, alpha: number): number {
        if (!this.initialized) {
            this.s = value;
            this.initialized = true;
        } else {
            this.s = alpha * value + (1 - alpha) * this.s;
        }
        this.y = this.s;
        return this.y;
    }

    lastValue(): number {
        return this.y;
    }

    reset(): void {
        this.initialized = false;
    }
}

export class OneEuroFilter {
    private minCutoff: number;
    private beta: number;
    private dCutoff: number;

    private xFilter: LowPassFilter;
    private dxFilter: LowPassFilter;

    private lastTime: number = -1;
    private initialized: boolean = false;

    constructor(options: OneEuroFilterOptions = {}) {
        this.minCutoff = options.minCutoff ?? 1.0;
        this.beta = options.beta ?? 0.007;
        this.dCutoff = options.dCutoff ?? 1.0;

        this.xFilter = new LowPassFilter();
        this.dxFilter = new LowPassFilter();
    }

    /**
     * Compute the smoothing factor alpha from a cutoff frequency and time delta.
     * alpha = 1 / (1 + tau / dt), where tau = 1 / (2 * PI * fc)
     */
    private alpha(cutoff: number, dt: number): number {
        const tau = 1.0 / (2.0 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / dt);
    }

    /**
     * Filter a single scalar value.
     * @param value - The raw input value
     * @param timestamp - The timestamp in seconds
     * @returns The filtered value
     */
    filter(value: number, timestamp: number): number {
        if (!this.initialized) {
            this.initialized = true;
            this.lastTime = timestamp;
            this.dxFilter.filter(0, this.alpha(this.dCutoff, 1.0 / 30)); // seed derivative
            this.xFilter.filter(value, 1.0); // first value passes through
            return value;
        }

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Guard: if dt is zero or negative, return last value
        if (dt <= 0) {
            return this.xFilter.lastValue();
        }

        // 1. Estimate derivative (speed)
        const dx = (value - this.xFilter.lastValue()) / dt;
        const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));

        // 2. Adaptive cutoff: fc = minCutoff + beta * |speed|
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);

        // 3. Filter the value with the adaptive cutoff
        return this.xFilter.filter(value, this.alpha(cutoff, dt));
    }

    reset(): void {
        this.initialized = false;
        this.lastTime = -1;
        this.xFilter.reset();
        this.dxFilter.reset();
    }
}
