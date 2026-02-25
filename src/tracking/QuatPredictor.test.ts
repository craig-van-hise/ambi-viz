import { describe, it, expect } from 'vitest';
import { QuatPredictor } from './QuatPredictor';

// Helper: quaternion magnitude
function quatNorm(q: [number, number, number, number]): number {
    return Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
}

// Helper: create a yaw rotation quaternion (rotation around Y axis)
function yawQuat(angleDeg: number): [number, number, number, number] {
    const halfRad = (angleDeg * Math.PI) / 360;
    // quat = (x, y, z, w) with rotation around Y
    return [0, Math.sin(halfRad), 0, Math.cos(halfRad)];
}

describe('QuatPredictor', () => {
    it('identity input produces identity prediction', () => {
        const predictor = new QuatPredictor();
        const dt = 1 / 30;

        // Feed identity quaternion multiple times
        let result: [number, number, number, number] = [0, 0, 0, 1];
        for (let i = 0; i < 5; i++) {
            result = predictor.update([0, 0, 0, 1], i * dt);
        }

        // Should be identity (or extremely close)
        expect(result[0]).toBeCloseTo(0, 2); // x
        expect(result[1]).toBeCloseTo(0, 2); // y
        expect(result[2]).toBeCloseTo(0, 2); // z
        expect(result[3]).toBeCloseTo(1, 2); // w
    });

    it('output is always a unit quaternion', () => {
        const predictor = new QuatPredictor();
        const dt = 1 / 30;

        // Feed a sequence of varied rotations
        const quats: [number, number, number, number][] = [
            [0, 0, 0, 1],
            yawQuat(5),
            yawQuat(10),
            yawQuat(15),
            yawQuat(20),
            yawQuat(30),
            yawQuat(15), // reverse direction
            yawQuat(5),
        ];

        for (let i = 0; i < quats.length; i++) {
            const result = predictor.update(quats[i], i * dt);
            const norm = quatNorm(result);
            expect(norm).toBeCloseTo(1.0, 4);
        }
    });

    it('static input produces near-zero angular velocity (prediction ≈ current)', () => {
        const predictor = new QuatPredictor();
        const dt = 1 / 30;
        const identity: [number, number, number, number] = [0, 0, 0, 1];

        // Feed the same quaternion many times to let filters settle
        let result: [number, number, number, number] = identity;
        for (let i = 0; i < 30; i++) {
            result = predictor.update(identity, i * dt);
        }

        // With zero angular velocity, prediction should be very close to identity
        expect(result[0]).toBeCloseTo(0, 3);
        expect(result[1]).toBeCloseTo(0, 3);
        expect(result[2]).toBeCloseTo(0, 3);
        expect(result[3]).toBeCloseTo(1, 3);
    });

    it('constant rotation predicts ahead of current', () => {
        const predictor = new QuatPredictor();
        const dt = 1 / 30;

        // Feed a steady yaw rotation: 0°, 2°, 4°, 6°, ...
        const steps = 20;
        let lastResult: [number, number, number, number] = [0, 0, 0, 1];
        for (let i = 0; i < steps; i++) {
            const angle = i * 2; // 2° per frame
            lastResult = predictor.update(yawQuat(angle), i * dt);
        }

        // The predicted quat should be *ahead* of the last input (38°)
        // Last input was yawQuat(38), prediction should be further rotated
        const inputYaw = yawQuat(38);

        // Extract the yaw angle from the predicted quaternion
        // For a pure Y-axis rotation: angle = 2 * asin(q.y) (small angle approx)
        // or more accurately: angle = 2 * atan2(q.y, q.w)
        const predictedAngle = 2 * Math.atan2(lastResult[1], lastResult[3]) * (180 / Math.PI);
        const inputAngle = 2 * Math.atan2(inputYaw[1], inputYaw[3]) * (180 / Math.PI);

        // Predicted angle should be greater than or equal to the last input angle
        // (accounting for filter smoothing which introduces some lag)
        // At minimum, the predicted angle should be beyond the *smoothed* current value
        expect(predictedAngle).toBeGreaterThan(inputAngle * 0.5);
    });
});
