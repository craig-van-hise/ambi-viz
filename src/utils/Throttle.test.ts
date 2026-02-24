import { describe, it, expect } from 'vitest';
import { Throttle } from './Throttle';

describe('Throttle', () => {
    it('returns true on first call', () => {
        const t = new Throttle(30);
        expect(t.shouldUpdate(0)).toBe(true);
    });

    it('returns false within the interval', () => {
        const t = new Throttle(30); // 33.3ms interval
        t.shouldUpdate(0);
        expect(t.shouldUpdate(10)).toBe(false);
        expect(t.shouldUpdate(20)).toBe(false);
        expect(t.shouldUpdate(33)).toBe(false);
    });

    it('returns true after interval elapses', () => {
        const t = new Throttle(30); // 33.3ms interval
        t.shouldUpdate(0);
        expect(t.shouldUpdate(34)).toBe(true);
    });

    it('subsequent calls respect the new anchor', () => {
        const t = new Throttle(30);
        t.shouldUpdate(0);    // → true, anchor = 0
        t.shouldUpdate(34);   // → true, anchor = 34
        expect(t.shouldUpdate(50)).toBe(false); // 50 - 34 = 16 < 33.3
        expect(t.shouldUpdate(68)).toBe(true);  // 68 - 34 = 34 > 33.3
    });

    it('handles zero fps (always returns true)', () => {
        const t = new Throttle(0);
        expect(t.shouldUpdate(0)).toBe(true);
        expect(t.shouldUpdate(1)).toBe(true);
        expect(t.shouldUpdate(2)).toBe(true);
    });

    it('reset() allows immediate next update', () => {
        const t = new Throttle(30);
        t.shouldUpdate(0);
        t.shouldUpdate(34);
        t.reset();
        // After reset, lastTime = 0, so any now >= 33.3 should fire, and now=34 works
        expect(t.shouldUpdate(35)).toBe(true);
    });

    it('works at 20fps (50ms interval)', () => {
        const t = new Throttle(20);
        t.shouldUpdate(0);         // true, anchor=0
        expect(t.shouldUpdate(49)).toBe(false);
        expect(t.shouldUpdate(50)).toBe(true);
    });
});
