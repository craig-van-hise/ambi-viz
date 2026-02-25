import { describe, it, expect } from 'vitest';
import { OneEuroFilter } from './OneEuroFilter';

describe('OneEuroFilter', () => {
    it('first call returns the input value unchanged', () => {
        const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 });
        const result = filter.filter(5.0, 0);
        expect(result).toBe(5.0);
    });

    it('heavy smoothing at low velocity (near-static input with noise)', () => {
        const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 });
        const dt = 1 / 30; // 30fps

        // Feed a mostly-static signal with small jitter
        filter.filter(1.0, 0);
        filter.filter(1.02, dt);
        filter.filter(0.98, dt * 2);
        filter.filter(1.01, dt * 3);
        filter.filter(0.99, dt * 4);
        const result = filter.filter(1.03, dt * 5);

        // With heavy smoothing, the output should stay very close to 1.0
        expect(result).toBeCloseTo(1.0, 1);
        // And specifically, it should NOT jump to 1.03
        expect(Math.abs(result - 1.03)).toBeGreaterThan(0.005);
    });

    it('light smoothing at high velocity (fast ramp tracks input closely)', () => {
        const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 1.0, dCutoff: 1.0 });
        const dt = 1 / 30;

        // Fast ramp: 0, 10, 20, 30, 40...
        filter.filter(0, 0);
        filter.filter(10, dt);
        filter.filter(20, dt * 2);
        filter.filter(30, dt * 3);
        const result = filter.filter(40, dt * 4);

        // With high beta and fast velocity, output should be close to the input
        // Allow up to 15% lag on a fast ramp
        expect(result).toBeGreaterThan(40 * 0.85);
    });

    it('monotonically converges toward step input', () => {
        const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 });
        const dt = 1 / 30;

        // Start at 0, then step to 10
        filter.filter(0, 0);
        const outputs: number[] = [];
        for (let i = 1; i <= 20; i++) {
            outputs.push(filter.filter(10, dt * i));
        }

        // Each successive output should be >= the previous (monotonically increasing toward 10)
        for (let i = 1; i < outputs.length; i++) {
            expect(outputs[i]).toBeGreaterThanOrEqual(outputs[i - 1] - 1e-9);
        }
        // Final output should be approaching 10
        expect(outputs[outputs.length - 1]).toBeGreaterThan(5);
    });

    it('adapts cutoff: higher velocity produces less smoothing (higher cutoff)', () => {
        const filterSlow = new OneEuroFilter({ minCutoff: 1.0, beta: 0.5, dCutoff: 1.0 });
        const filterFast = new OneEuroFilter({ minCutoff: 1.0, beta: 0.5, dCutoff: 1.0 });
        const dt = 1 / 30;

        // Slow signal: small step
        filterSlow.filter(0, 0);
        const slowResult = filterSlow.filter(0.1, dt);

        // Fast signal: large step  
        filterFast.filter(0, 0);
        const fastResult = filterFast.filter(10.0, dt);

        // The fast signal should track proportionally closer to its target
        const slowRatio = slowResult / 0.1;
        const fastRatio = fastResult / 10.0;

        // Higher velocity → less smoothing → closer to target (higher ratio)
        expect(fastRatio).toBeGreaterThan(slowRatio);
    });
});
