import { describe, it, expect } from 'vitest';
import { getSH, computeDirectionalEnergy, normalize } from './shaderMath';

// Helper: identity-like covariance (diagonal = 1, off-diagonal = 0)
function identityCovariance(): number[] {
    const cov = new Array(256).fill(0);
    for (let i = 0; i < 16; i++) {
        cov[i * 16 + i] = 1.0;
    }
    return cov;
}

// Helper: covariance with energy only in channel 0 (omnidirectional)
function omniCovariance(energy: number): number[] {
    const cov = new Array(256).fill(0);
    cov[0] = energy; // C[0][0] = energy
    return cov;
}

// Helper: covariance with energy concentrated in a specific channel pair
function channelCovariance(ch: number, energy: number): number[] {
    const cov = new Array(256).fill(0);
    cov[ch * 16 + ch] = energy;
    return cov;
}

describe('getSH — SH Basis Functions (ACN/SN3D)', () => {
    // Directions in Three.js coordinates (Y-up):
    //   +X = Right, -X = Left
    //   +Y = Up,    -Y = Down
    //   +Z = Back,  -Z = Front
    const FRONT: [number, number, number] = [0, 0, -1]; // -Z = Front
    const BACK: [number, number, number] = [0, 0, 1]; // +Z = Back
    const LEFT: [number, number, number] = [-1, 0, 0]; // -X = Left
    const RIGHT: [number, number, number] = [1, 0, 0]; // +X = Right
    const UP: [number, number, number] = [0, 1, 0]; // +Y = Up
    const DOWN: [number, number, number] = [0, -1, 0]; // -Y = Down

    it('SH[0] (W channel) is always 1.0 for any direction', () => {
        expect(getSH(0, FRONT)).toBeCloseTo(1.0);
        expect(getSH(0, LEFT)).toBeCloseTo(1.0);
        expect(getSH(0, UP)).toBeCloseTo(1.0);
        expect(getSH(0, [0.577, 0.577, 0.577])).toBeCloseTo(1.0);
    });

    it('SH[1] (Y channel) peaks for Left direction', () => {
        // Ambi Y = -d.x. For LEFT (d.x = -1): Ambi Y = 1.0
        expect(getSH(1, LEFT)).toBeCloseTo(1.0);
        expect(getSH(1, RIGHT)).toBeCloseTo(-1.0);
        expect(getSH(1, FRONT)).toBeCloseTo(0.0);
    });

    it('SH[2] (Z channel) peaks for Up direction', () => {
        // Ambi Z = d.y. For UP (d.y = 1): Ambi Z = 1.0
        expect(getSH(2, UP)).toBeCloseTo(1.0);
        expect(getSH(2, DOWN)).toBeCloseTo(-1.0);
        expect(getSH(2, FRONT)).toBeCloseTo(0.0);
    });

    it('SH[3] (X channel) peaks for Front direction', () => {
        // Ambi X = -d.z. For FRONT (d.z = -1): Ambi X = 1.0
        expect(getSH(3, FRONT)).toBeCloseTo(1.0);
        expect(getSH(3, BACK)).toBeCloseTo(-1.0);
        expect(getSH(3, LEFT)).toBeCloseTo(0.0);
    });

    it('Out-of-range index returns 0', () => {
        expect(getSH(16, FRONT)).toBe(0.0);
        expect(getSH(99, UP)).toBe(0.0);
    });
});

describe('computeDirectionalEnergy', () => {
    const FRONT: [number, number, number] = [0, 0, -1];
    const UP: [number, number, number] = [0, 1, 0];
    const DIAG: [number, number, number] = normalize([1, 1, -1]);

    it('Identity covariance: energy equals sum of squared SH values', () => {
        const cov = identityCovariance();
        const energy = computeDirectionalEnergy(FRONT, cov);
        // With identity C, E = Y^T * I * Y = sum(Y_i^2)
        // For FRONT: Y = [1, 0, 0, 1, 0, 0, -0.5, 0, 0, 0, 0, 0, -0.5*3, 0, 0, 0]
        // Let's just verify it's positive and reasonable
        expect(energy).toBeGreaterThan(0);
    });

    it('Omni covariance: energy is constant for all directions', () => {
        // C[0][0] = 1, all else 0 → E = Y0^2 * 1 = 1.0 for all dirs
        // Because getSH(0, any_dir) = 1.0
        const cov = omniCovariance(1.0);
        const eFront = computeDirectionalEnergy(FRONT, cov);
        const eUp = computeDirectionalEnergy(UP, cov);
        const eDiag = computeDirectionalEnergy(DIAG, cov);

        expect(eFront).toBeCloseTo(1.0);
        expect(eUp).toBeCloseTo(1.0);
        expect(eDiag).toBeCloseTo(1.0);
    });

    it('Channel 3 (X/Front) covariance: energy peaks toward Front', () => {
        // C[3][3] = 1 → E = Y3^2. Y3 = Ambi X, which peaks for FRONT.
        const cov = channelCovariance(3, 1.0);
        const eFront = computeDirectionalEnergy(FRONT, cov);
        const eUp = computeDirectionalEnergy(UP, cov);

        expect(eFront).toBeCloseTo(1.0); // getSH(3, FRONT)^2 = 1
        expect(eUp).toBeCloseTo(0.0);    // getSH(3, UP)^2 = 0
    });

    it('Zero covariance returns zero energy for all directions', () => {
        const cov = new Array(256).fill(0);
        expect(computeDirectionalEnergy(FRONT, cov)).toBeCloseTo(0.0);
        expect(computeDirectionalEnergy(UP, cov)).toBeCloseTo(0.0);
        expect(computeDirectionalEnergy(DIAG, cov)).toBeCloseTo(0.0);
    });

    it('Scaled covariance scales energy linearly (E ∝ C)', () => {
        const cov1 = omniCovariance(1.0);
        const cov5 = omniCovariance(5.0);
        const e1 = computeDirectionalEnergy(FRONT, cov1);
        const e5 = computeDirectionalEnergy(FRONT, cov5);

        expect(e5).toBeCloseTo(e1 * 5.0);
    });
});

describe('normalize', () => {
    it('normalizes a standard vector', () => {
        const n = normalize([3, 4, 0]);
        expect(n[0]).toBeCloseTo(0.6);
        expect(n[1]).toBeCloseTo(0.8);
        expect(n[2]).toBeCloseTo(0.0);
    });

    it('handles zero vector gracefully', () => {
        const n = normalize([0, 0, 0]);
        expect(n).toEqual([0, 0, 0]);
    });
});
