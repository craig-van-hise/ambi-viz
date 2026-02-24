/**
 * shaderMath.ts — TypeScript mirror of the GLSL SH basis functions and energy computation.
 * Used as:
 *   1. A reference implementation to verify the shader's correctness.
 *   2. A testable module for TDD.
 *
 * All functions match the GLSL equivalents in ambisonic.ts exactly.
 * Coordinate convention: Three.js Y-up mapped to Ambisonics ACN/SN3D.
 *   Ambi X = -d.z  (Front = -Z)
 *   Ambi Y = -d.x  (Left  = -X)
 *   Ambi Z =  d.y  (Up    = +Y)
 */

/**
 * Evaluate the i-th real Spherical Harmonic basis function (ACN/SN3D, Order 0-3)
 * for a normalized direction vector d (in Three.js coordinates: Y-up).
 */
export function getSH(i: number, d: [number, number, number]): number {
    // Map Three.js coords to Ambisonics coords
    const x = -d[2]; // Ambi X (front)
    const y = -d[0]; // Ambi Y (left)
    const z = d[1];  // Ambi Z (up)

    switch (i) {
        // Order 0
        case 0: return 1.0;
        // Order 1
        case 1: return y;
        case 2: return z;
        case 3: return x;
        // Order 2
        case 4: return Math.sqrt(3.0) * x * y;
        case 5: return Math.sqrt(3.0) * y * z;
        case 6: return 0.5 * (3.0 * z * z - 1.0);
        case 7: return Math.sqrt(3.0) * x * z;
        case 8: return Math.sqrt(3.0) * 0.5 * (x * x - y * y);
        // Order 3
        case 9: return Math.sqrt(5.0 / 8.0) * y * (3.0 * x * x - y * y);
        case 10: return Math.sqrt(15.0) * x * y * z;
        case 11: return Math.sqrt(3.0 / 8.0) * y * (5.0 * z * z - 1.0);
        case 12: return 0.5 * z * (5.0 * z * z - 3.0);
        case 13: return Math.sqrt(3.0 / 8.0) * x * (5.0 * z * z - 1.0);
        case 14: return Math.sqrt(15.0 / 4.0) * z * (x * x - y * y);
        case 15: return Math.sqrt(5.0 / 8.0) * x * (x * x - 3.0 * y * y);
        default: return 0.0;
    }
}

/**
 * Compute directional energy E = Y^T * C * Y for a given direction.
 * @param dir — Normalized direction vector [x, y, z] in Three.js coordinates.
 * @param cov — Flat 16×16 covariance matrix (256 floats, row-major).
 * @returns The scalar energy value (may be negative due to numerical issues; caller should clamp).
 */
export function computeDirectionalEnergy(
    dir: [number, number, number],
    cov: number[]
): number {
    const nCh = 16;

    // Evaluate SH basis for this direction
    const Y: number[] = [];
    for (let i = 0; i < nCh; i++) {
        Y.push(getSH(i, dir));
    }

    // Compute R = C * Y
    const R: number[] = [];
    for (let i = 0; i < nCh; i++) {
        let sum = 0;
        for (let j = 0; j < nCh; j++) {
            sum += cov[i * nCh + j] * Y[j];
        }
        R.push(sum);
    }

    // Compute E = Y · R
    let energy = 0;
    for (let i = 0; i < nCh; i++) {
        energy += Y[i] * R[i];
    }

    return energy;
}

/**
 * Normalize a 3-component vector.
 */
export function normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
}
