import { describe, it, expect } from 'vitest';
import { ESKF } from './ESKF';

// Helper: quaternion magnitude
function quatNorm(q: [number, number, number, number]): number {
    return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

// Helper: create a yaw rotation quaternion (rotation around Y axis)
function yawQuat(angleDeg: number): [number, number, number, number] {
    const halfRad = (angleDeg * Math.PI) / 360;
    return [0, Math.sin(halfRad), 0, Math.cos(halfRad)];
}

describe('ESKF', () => {
    it('nominal state maintains unit-norm after predict+correct+inject cycle', () => {
        const eskf = new ESKF();
        const dt = 1 / 30;

        // Feed a non-trivial measurement
        const measurement: [number, number, number, number] = yawQuat(15);

        eskf.predict(dt);
        eskf.correct(measurement);
        const state = eskf.getNominalState();

        const norm = quatNorm(state.q);
        expect(norm).toBeCloseTo(1.0, 6);
    });

    it('error state resets to zero after injection', () => {
        const eskf = new ESKF();
        const dt = 1 / 30;

        eskf.predict(dt);
        eskf.correct(yawQuat(10));

        const errorState = eskf.getErrorState();
        // After correct() calls inject internally, error should be zero
        for (let i = 0; i < 6; i++) {
            expect(errorState[i]).toBeCloseTo(0, 10);
        }
    });

    it('static input converges to identity', () => {
        const eskf = new ESKF();
        const dt = 1 / 30;
        const identity: [number, number, number, number] = [0, 0, 0, 1];

        // Feed identity for many frames
        for (let i = 0; i < 60; i++) {
            eskf.predict(dt);
            eskf.correct(identity);
        }

        const state = eskf.getNominalState();
        expect(state.q[0]).toBeCloseTo(0, 3); // x
        expect(state.q[1]).toBeCloseTo(0, 3); // y
        expect(state.q[2]).toBeCloseTo(0, 3); // z
        expect(state.q[3]).toBeCloseTo(1, 3); // w

        // Angular velocity should be near zero
        expect(state.omega[0]).toBeCloseTo(0, 2);
        expect(state.omega[1]).toBeCloseTo(0, 2);
        expect(state.omega[2]).toBeCloseTo(0, 2);
    });

    it('constant rotation tracks and predicts ahead', () => {
        const eskf = new ESKF();
        const dt = 1 / 30;

        // Feed a steady yaw rotation: 0°, 2°, 4°, ...
        for (let i = 0; i < 30; i++) {
            const angle = i * 2;
            eskf.predict(dt);
            eskf.correct(yawQuat(angle));
        }

        // Get predicted quaternion (should be ahead of last input = 58°)
        const predicted = eskf.getPredicted(0.045);
        const predictedAngle = 2 * Math.atan2(predicted[1], predicted[3]) * (180 / Math.PI);

        // Last input was 58°, prediction should be beyond it
        expect(predictedAngle).toBeGreaterThan(50);
    });

    it('post-movement settling — no persistent overshoot', () => {
        const eskf = new ESKF();
        const dt = 1 / 30;

        // Phase 1: rapid rotation to 30°
        for (let i = 0; i <= 15; i++) {
            eskf.predict(dt);
            eskf.correct(yawQuat(i * 2));
        }

        // Phase 2: hold at 30° for many frames (movement stopped)
        for (let i = 0; i < 60; i++) {
            eskf.predict(dt);
            eskf.correct(yawQuat(30));
        }

        const predicted = eskf.getPredicted(0.045);
        const predictedAngle = 2 * Math.atan2(predicted[1], predicted[3]) * (180 / Math.PI);

        // After holding still, prediction should converge to ~30° (not overshoot)
        expect(predictedAngle).toBeCloseTo(30, 0);
    });

    it('getPredicted output is always unit quaternion', () => {
        const eskf = new ESKF();
        const dt = 1 / 30;

        const quats: [number, number, number, number][] = [
            [0, 0, 0, 1],
            yawQuat(5),
            yawQuat(15),
            yawQuat(30),
            yawQuat(20),
            yawQuat(10),
        ];

        for (const q of quats) {
            eskf.predict(dt);
            eskf.correct(q);
            const pred = eskf.getPredicted(0.045);
            expect(quatNorm(pred)).toBeCloseTo(1.0, 5);
        }
    });
});
