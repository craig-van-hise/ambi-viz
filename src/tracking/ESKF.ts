/**
 * Error-State Kalman Filter (ESKF) for 3DOF Head Tracking
 * 
 * State model:
 *   Nominal state:  q (quaternion), ω (angular velocity)
 *   Error state:    δθ (3D rotation error), δω (3D angular velocity error)
 *   Covariance:     6×6 matrix P over the error state
 * 
 * The error state lives in the tangent space (3D) to avoid the quaternion
 * covariance singularity that would arise from a 4D quaternion covariance.
 * 
 * References:
 *   - Joan Solà, "Quaternion kinematics for the error-state Kalman filter" (2017)
 *   - Madgwick, "An efficient orientation filter for inertial and inertial/magnetic sensor arrays"
 */

/** Quaternion as [x, y, z, w] */
export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];

export interface ESKFOptions {
    /** Process noise for angular velocity (rad/s/√Hz). Default: 0.5 */
    sigmaGyro?: number;
    /** Process noise for angular acceleration (rad/s²/√Hz). Default: 5.0 */
    sigmaAccel?: number;
    /** Measurement noise (rad). Default: 0.05 */
    sigmaMeas?: number;
    /** Forward prediction horizon (s). Default: 0.045 */
    predictionHorizon?: number;
}

/** Parameters accepted by setParams() for real-time ESKF tuning */
export interface ESKFTuningParams {
    /** Forward prediction horizon in seconds */
    tau?: number;
    /** Measurement noise covariance scalar (R = R_scalar · I₃) */
    R_scalar?: number;
    /** Process noise covariance scalar (Q_θ = Q_scalar · dt · I₃) */
    Q_scalar?: number;
}

export class ESKF {
    // Nominal state
    private q: Quat = [0, 0, 0, 1];       // orientation
    private omega: Vec3 = [0, 0, 0];       // angular velocity (rad/s)

    // Error state (6D): [δθx, δθy, δθz, δωx, δωy, δωz]
    private dx: Float64Array = new Float64Array(6);

    // Covariance matrix P (6×6, stored row-major)
    private P: Float64Array;

    // Noise parameters
    private sigmaGyro: number;
    private sigmaAccel: number;
    private sigmaMeas: number;
    private predictionHorizon: number;

    constructor(options: ESKFOptions = {}) {
        this.sigmaGyro = options.sigmaGyro ?? 0.5;
        this.sigmaAccel = options.sigmaAccel ?? 5.0;
        this.sigmaMeas = options.sigmaMeas ?? 0.05;
        this.predictionHorizon = options.predictionHorizon ?? 0.045;

        // Initialize P as diagonal with moderate initial uncertainty
        this.P = new Float64Array(36);
        const initOrientVar = 0.1;
        const initOmegaVar = 1.0;
        this.P[0] = initOrientVar;   // δθx
        this.P[7] = initOrientVar;   // δθy
        this.P[14] = initOrientVar;  // δθz
        this.P[21] = initOmegaVar;   // δωx
        this.P[28] = initOmegaVar;   // δωy
        this.P[35] = initOmegaVar;   // δωz
    }

    /**
     * Prediction step: propagate nominal state and covariance forward by dt.
     */
    predict(dt: number): void {
        if (dt <= 0) return;

        // --- 1. Propagate nominal quaternion by ω ---
        const speed = vecNorm(this.omega);
        if (speed > 1e-10) {
            const angle = speed * dt;
            const halfAngle = angle / 2;
            const sinH = Math.sin(halfAngle);
            const cosH = Math.cos(halfAngle);

            const ax = this.omega[0] / speed;
            const ay = this.omega[1] / speed;
            const az = this.omega[2] / speed;

            const qRot: Quat = [ax * sinH, ay * sinH, az * sinH, cosH];
            this.q = quatMultiply(this.q, qRot);
            this.q = quatNormalize(this.q);
        }

        // --- 2. Propagate covariance: P = F * P * F^T + Q ---
        // 
        // Error-state dynamics Jacobian F (6×6):
        //   F = | -[ω]×   I₃  |
        //       |  0₃     0₃  |
        //
        // Discrete approximation: Fd ≈ I + F*dt
        //   Fd = | I₃ - [ω]×·dt   I₃·dt |
        //        |    0₃            I₃   |

        const Fd = mat6Identity();

        // Top-left 3×3: I - [ω]× * dt  (skew-symmetric of omega)
        const wx = this.omega[0] * dt;
        const wy = this.omega[1] * dt;
        const wz = this.omega[2] * dt;

        // -[ω]×·dt applied to I:
        //   [ 0   wz  -wy ]
        //   [-wz   0   wx ]
        //   [ wy  -wx   0 ]
        Fd[0 * 6 + 1] = wz; Fd[0 * 6 + 2] = -wy;
        Fd[1 * 6 + 0] = -wz; Fd[1 * 6 + 2] = wx;
        Fd[2 * 6 + 0] = wy; Fd[2 * 6 + 1] = -wx;

        // Top-right 3×3: I₃·dt
        Fd[0 * 6 + 3] = dt;
        Fd[1 * 6 + 4] = dt;
        Fd[2 * 6 + 5] = dt;

        // Process noise Q (6×6 diagonal)
        const Q = new Float64Array(36);
        const qTheta = this.sigmaGyro * this.sigmaGyro * dt;
        const qOmega = this.sigmaAccel * this.sigmaAccel * dt;
        Q[0] = qTheta; Q[7] = qTheta; Q[14] = qTheta;
        Q[21] = qOmega; Q[28] = qOmega; Q[35] = qOmega;

        // P = Fd * P * Fd^T + Q
        const FdP = mat6Multiply(Fd, this.P);
        const FdT = mat6Transpose(Fd);
        const FdPFdT = mat6Multiply(FdP, FdT);
        mat6Add(FdPFdT, Q, this.P);
    }

    /**
     * Correction step: incorporate a quaternion measurement from MediaPipe.
     * Uses the rotation vector residual in tangent space.
     */
    correct(qMeas: Quat): void {
        // --- 1. Compute measurement residual ---
        // δz = 2 * vec( q_meas ⊗ q_nom^{-1} )
        // This gives a 3D rotation vector representing the difference

        const qNomInv = quatConjugate(this.q);
        let qErr = quatMultiply(qMeas, qNomInv);

        // Ensure shortest path
        if (qErr[3] < 0) {
            qErr = [-qErr[0], -qErr[1], -qErr[2], -qErr[3]];
        }

        // Small-angle approximation: δz ≈ 2 * [qErr.x, qErr.y, qErr.z]
        const dz: Vec3 = [2 * qErr[0], 2 * qErr[1], 2 * qErr[2]];

        // --- 2. Measurement model ---
        // H = [I₃  0₃] (3×6) — we observe orientation directly, not velocity
        // Innovation covariance: S = H * P * H^T + R
        //   Since H selects the top-left 3×3 of P:
        //   S = P[0:3, 0:3] + R

        const R_val = this.sigmaMeas * this.sigmaMeas;

        // S = P_θθ + R·I₃ (3×3)
        const S = new Float64Array(9);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                S[i * 3 + j] = this.P[i * 6 + j];
            }
            S[i * 3 + i] += R_val;
        }

        // --- 3. Kalman Gain K (6×3) = P * H^T * S^{-1} ---
        // P * H^T (6×3) = first 3 columns of P
        const PHt = new Float64Array(18); // 6×3
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                PHt[i * 3 + j] = this.P[i * 6 + j];
            }
        }

        const Sinv = mat3Inverse(S);
        const K = mat6x3_times_mat3x3(PHt, Sinv); // 6×3

        // --- 4. Update error state: dx = K * dz ---
        for (let i = 0; i < 6; i++) {
            this.dx[i] = K[i * 3 + 0] * dz[0] + K[i * 3 + 1] * dz[1] + K[i * 3 + 2] * dz[2];
        }

        // --- 5. Update covariance: P = (I - K*H) * P ---
        // K*H (6×6): K (6×3) * H (3×6) = K columns extend with zeros
        const KH = new Float64Array(36);
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                KH[i * 6 + j] = K[i * 3 + j];
            }
            // columns 3-5 remain zero since H has zeros there
        }

        // (I - KH)
        const IminusKH = mat6Identity();
        for (let i = 0; i < 36; i++) {
            IminusKH[i] -= KH[i];
        }

        const newP = mat6Multiply(IminusKH, this.P);
        this.P.set(newP);

        // --- 6. Inject error state into nominal state and reset ---
        this.inject();
    }

    /**
     * Inject the error state into the nominal state, then reset error to zero.
     */
    private inject(): void {
        // Apply orientation error: q = q_δθ ⊗ q_nom
        const dTheta: Vec3 = [this.dx[0], this.dx[1], this.dx[2]];
        const angle = vecNorm(dTheta);

        if (angle > 1e-12) {
            const halfAngle = angle / 2;
            const sinH = Math.sin(halfAngle) / angle;  // sinc-like

            const qDelta: Quat = [
                dTheta[0] * sinH,
                dTheta[1] * sinH,
                dTheta[2] * sinH,
                Math.cos(halfAngle),
            ];

            this.q = quatMultiply(qDelta, this.q);
            this.q = quatNormalize(this.q);
        }

        // Apply angular velocity error
        this.omega[0] += this.dx[3];
        this.omega[1] += this.dx[4];
        this.omega[2] += this.dx[5];

        // Reset error state to zero
        this.dx.fill(0);
    }

    /**
     * Return the nominal state for inspection.
     */
    getNominalState(): { q: Quat; omega: Vec3 } {
        return {
            q: [...this.q] as Quat,
            omega: [...this.omega] as Vec3,
        };
    }

    /**
     * Return the error state for inspection (should be zero after inject).
     */
    getErrorState(): Float64Array {
        return new Float64Array(this.dx);
    }

    /**
     * Forward-predict the quaternion by τ seconds using current ω.
     */
    getPredicted(tau?: number): Quat {
        const t = tau ?? this.predictionHorizon;
        const speed = vecNorm(this.omega);

        if (speed < 1e-10) {
            return [...this.q] as Quat;
        }

        const angle = speed * t;
        const halfAngle = angle / 2;
        const sinH = Math.sin(halfAngle);
        const cosH = Math.cos(halfAngle);

        const ax = this.omega[0] / speed;
        const ay = this.omega[1] / speed;
        const az = this.omega[2] / speed;

        const qRot: Quat = [ax * sinH, ay * sinH, az * sinH, cosH];
        const predicted = quatMultiply(qRot, this.q);
        return quatNormalize(predicted);
    }

    reset(): void {
        this.q = [0, 0, 0, 1];
        this.omega = [0, 0, 0];
        this.dx.fill(0);

        this.P.fill(0);
        this.P[0] = 0.1; this.P[7] = 0.1; this.P[14] = 0.1;
        this.P[21] = 1.0; this.P[28] = 1.0; this.P[35] = 1.0;
    }

    /**
     * Dynamically update noise parameters and prediction horizon at runtime.
     * Safe because Q and R are rebuilt fresh on each predict()/correct() call.
     */
    setParams(params: ESKFTuningParams): void {
        if (params.tau !== undefined) {
            this.predictionHorizon = params.tau;
        }
        if (params.R_scalar !== undefined) {
            // R = R_scalar · I₃, and code uses sigmaMeas² = R_scalar
            this.sigmaMeas = Math.sqrt(params.R_scalar);
        }
        if (params.Q_scalar !== undefined) {
            // Q_θ = sigmaGyro² · dt · I₃, so sigmaGyro = √Q_scalar
            this.sigmaGyro = Math.sqrt(params.Q_scalar);
        }
    }
}

// ===================== Linear Algebra Helpers =====================

function vecNorm(v: Vec3): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function quatNormalize(q: Quat): Quat {
    const len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (len < 1e-10) return [0, 0, 0, 1];
    return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function quatConjugate(q: Quat): Quat {
    return [-q[0], -q[1], -q[2], q[3]];
}

function quatMultiply(a: Quat, b: Quat): Quat {
    return [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ];
}

// --- 6×6 matrix operations (row-major Float64Array) ---

function mat6Identity(): Float64Array {
    const m = new Float64Array(36);
    m[0] = 1; m[7] = 1; m[14] = 1; m[21] = 1; m[28] = 1; m[35] = 1;
    return m;
}

function mat6Multiply(A: Float64Array, B: Float64Array): Float64Array {
    const C = new Float64Array(36);
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            let sum = 0;
            for (let k = 0; k < 6; k++) {
                sum += A[i * 6 + k] * B[k * 6 + j];
            }
            C[i * 6 + j] = sum;
        }
    }
    return C;
}

function mat6Transpose(A: Float64Array): Float64Array {
    const T = new Float64Array(36);
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            T[j * 6 + i] = A[i * 6 + j];
        }
    }
    return T;
}

function mat6Add(A: Float64Array, B: Float64Array, out: Float64Array): void {
    for (let i = 0; i < 36; i++) {
        out[i] = A[i] + B[i];
    }
}

// --- 3×3 matrix inverse (for innovation covariance S) ---

function mat3Inverse(m: Float64Array): Float64Array {
    const a = m[0], b = m[1], c = m[2];
    const d = m[3], e = m[4], f = m[5];
    const g = m[6], h = m[7], k = m[8];

    const det = a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);

    if (Math.abs(det) < 1e-20) {
        // Singular — return identity as fallback
        const I = new Float64Array(9);
        I[0] = 1; I[4] = 1; I[8] = 1;
        return I;
    }

    const invDet = 1 / det;
    const inv = new Float64Array(9);

    inv[0] = (e * k - f * h) * invDet;
    inv[1] = (c * h - b * k) * invDet;
    inv[2] = (b * f - c * e) * invDet;
    inv[3] = (f * g - d * k) * invDet;
    inv[4] = (a * k - c * g) * invDet;
    inv[5] = (c * d - a * f) * invDet;
    inv[6] = (d * h - e * g) * invDet;
    inv[7] = (b * g - a * h) * invDet;
    inv[8] = (a * e - b * d) * invDet;

    return inv;
}

// 6×3 * 3×3 → 6×3
function mat6x3_times_mat3x3(A: Float64Array, B: Float64Array): Float64Array {
    const C = new Float64Array(18);
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
            let sum = 0;
            for (let k = 0; k < 3; k++) {
                sum += A[i * 3 + k] * B[k * 3 + j];
            }
            C[i * 3 + j] = sum;
        }
    }
    return C;
}
