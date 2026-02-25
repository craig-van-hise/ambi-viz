/**
 * QuatPredictor — Quaternion smoothing + constant-velocity extrapolation
 * 
 * Pipeline:
 * 1. Smooth each raw quaternion component through a 1€ Filter
 * 2. Re-normalize the smoothed quaternion to maintain unit length
 * 3. Compute angular velocity ω from the delta quaternion between consecutive frames
 * 4. Extrapolate forward by τ = 45ms using constant-velocity dead reckoning
 */

import { OneEuroFilter } from './OneEuroFilter';

/** Quaternion as [x, y, z, w] */
export type Quat = [number, number, number, number];

export interface QuatPredictorOptions {
    /** 1€ Filter minimum cutoff (Hz). Default: 1.0 */
    minCutoff?: number;
    /** 1€ Filter speed coefficient. Default: 0.007 */
    beta?: number;
    /** 1€ Filter derivative cutoff (Hz). Default: 1.0 */
    dCutoff?: number;
    /** Prediction horizon in seconds. Default: 0.045 (45ms) */
    predictionHorizon?: number;
}

export class QuatPredictor {
    private filters: [OneEuroFilter, OneEuroFilter, OneEuroFilter, OneEuroFilter];
    private prevSmoothed: Quat | null = null;
    private prevTime: number = -1;
    private predictionHorizon: number;

    constructor(options: QuatPredictorOptions = {}) {
        const filterOpts = {
            minCutoff: options.minCutoff ?? 1.0,
            beta: options.beta ?? 0.007,
            dCutoff: options.dCutoff ?? 1.0,
        };
        this.filters = [
            new OneEuroFilter(filterOpts),
            new OneEuroFilter(filterOpts),
            new OneEuroFilter(filterOpts),
            new OneEuroFilter(filterOpts),
        ];
        this.predictionHorizon = options.predictionHorizon ?? 0.045;
    }

    /**
     * Process a raw quaternion and return a predicted (smoothed + extrapolated) quaternion.
     * @param raw - Raw quaternion [x, y, z, w] from MediaPipe
     * @param timestamp - Timestamp in seconds
     * @returns Predicted quaternion [x, y, z, w]
     */
    update(raw: Quat, timestamp: number): Quat {
        // 1. Smooth each component through its own 1€ Filter
        const smoothed: Quat = [
            this.filters[0].filter(raw[0], timestamp),
            this.filters[1].filter(raw[1], timestamp),
            this.filters[2].filter(raw[2], timestamp),
            this.filters[3].filter(raw[3], timestamp),
        ];

        // 2. Re-normalize to maintain unit quaternion
        const sNorm = quatNormalize(smoothed);

        // 3. Compute angular velocity from delta quaternion
        if (this.prevSmoothed === null || this.prevTime < 0) {
            this.prevSmoothed = sNorm;
            this.prevTime = timestamp;
            return sNorm; // No history → return smoothed, no prediction
        }

        const dt = timestamp - this.prevTime;
        if (dt <= 0) {
            return sNorm; // Guard against bad timestamps
        }

        // Delta quaternion: q_delta = q_current * conj(q_prev)
        const qPrevConj = quatConjugate(this.prevSmoothed);
        let qDelta = quatMultiply(sNorm, qPrevConj);

        // Ensure shortest path (keep w >= 0)
        if (qDelta[3] < 0) {
            qDelta = [-qDelta[0], -qDelta[1], -qDelta[2], -qDelta[3]];
        }

        // Convert delta quaternion to axis-angle to get angular velocity
        // q_delta represents the rotation over dt seconds
        // angle = 2 * acos(w), axis = (x,y,z) / sin(angle/2)
        const halfAngle = Math.acos(Math.min(1, Math.max(-1, qDelta[3])));
        const sinHalfAngle = Math.sin(halfAngle);

        let omega: [number, number, number] = [0, 0, 0];
        if (sinHalfAngle > 1e-6) {
            const angle = 2 * halfAngle;
            const angularSpeed = angle / dt; // rad/s

            // axis * angularSpeed = angular velocity vector
            omega = [
                (qDelta[0] / sinHalfAngle) * angularSpeed,
                (qDelta[1] / sinHalfAngle) * angularSpeed,
                (qDelta[2] / sinHalfAngle) * angularSpeed,
            ];
        }

        // 4. Constant velocity extrapolation: rotate q_current by ω * τ
        const tau = this.predictionHorizon;
        const predicted = extrapolate(sNorm, omega, tau);

        // Update state
        this.prevSmoothed = sNorm;
        this.prevTime = timestamp;

        return predicted;
    }

    reset(): void {
        this.prevSmoothed = null;
        this.prevTime = -1;
        this.filters.forEach(f => f.reset());
    }
}

// --- Pure math helpers ---

function quatNormalize(q: Quat): Quat {
    const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (len < 1e-10) return [0, 0, 0, 1];
    return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function quatConjugate(q: Quat): Quat {
    return [-q[0], -q[1], -q[2], q[3]];
}

function quatMultiply(a: Quat, b: Quat): Quat {
    // Hamilton product: a * b
    // Both are [x, y, z, w]
    return [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],  // x
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],  // y
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],  // z
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],  // w
    ];
}

/**
 * Extrapolate a quaternion forward in time by applying angular velocity ω for duration τ.
 * q_pred = q_rotation(ω * τ) * q_current
 */
function extrapolate(qCurrent: Quat, omega: [number, number, number], tau: number): Quat {
    const speed = Math.sqrt(omega[0] * omega[0] + omega[1] * omega[1] + omega[2] * omega[2]);

    if (speed < 1e-8) {
        return qCurrent; // No rotation → prediction equals current
    }

    // Rotation angle for the prediction horizon
    const angle = speed * tau;
    const halfAngle = angle / 2;

    // Axis of rotation (normalized ω)
    const ax = omega[0] / speed;
    const ay = omega[1] / speed;
    const az = omega[2] / speed;

    // Quaternion representing the extrapolated rotation
    const sinH = Math.sin(halfAngle);
    const qRot: Quat = [
        ax * sinH,
        ay * sinH,
        az * sinH,
        Math.cos(halfAngle),
    ];

    // Apply: q_predicted = q_rotation * q_current
    const predicted = quatMultiply(qRot, qCurrent);
    return quatNormalize(predicted);
}
