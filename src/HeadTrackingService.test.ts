/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SAB_SCHEMA } from './types/HeadTracking';
import { calculateAudioOrientation } from './utils/OrientationUtils';

describe('HeadTracking Audio Yaw Inversion (Phase 1 TDD)', () => {
    const tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const outQuat = new THREE.Quaternion();

    it('Test Case 1: should invert positive Yaw (rotating Left by 45 degrees)', () => {
        // Given a positive Yaw input (45 degrees Left)
        const yawDeg = 45;
        const yawRad = yawDeg * (Math.PI / 180);
        const trackerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawRad, 0, 'YXZ'));

        // When processed for audio
        calculateAudioOrientation(trackerQuat, outQuat, tempEuler);
        const audioEuler = new THREE.Euler().setFromQuaternion(outQuat, 'YXZ');

        // Then the resulting Euler Y component must be exactly -45 degrees
        expect(audioEuler.y * (180 / Math.PI)).toBeCloseTo(-yawDeg, 5);
    });

    it('Test Case 2: should invert Yaw in complex 3DOF rotation without mutating Pitch/Roll', () => {
        // Given a complex 3DOF rotation (Pitch: 10°, Yaw: -30°, Roll: 5°)
        const pDeg = 10, yDeg = -30, rDeg = 5;
        const pRad = pDeg * (Math.PI / 180);
        const yRad = yDeg * (Math.PI / 180);
        const rRad = rDeg * (Math.PI / 180);

        const trackerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pRad, yRad, rRad, 'YXZ'));

        // When processed
        calculateAudioOrientation(trackerQuat, outQuat, tempEuler);
        const audioEuler = new THREE.Euler().setFromQuaternion(outQuat, 'YXZ');

        // Then the audio quaternion must accurately reflect (Pitch: 10°, Yaw: 30°, Roll: 5°)
        expect(audioEuler.x * (180 / Math.PI)).toBeCloseTo(pDeg, 5);
        expect(audioEuler.y * (180 / Math.PI)).toBeCloseTo(-yDeg, 5);
        expect(audioEuler.z * (180 / Math.PI)).toBeCloseTo(rDeg, 5);
    });

    it('SAB Integration: should write inverted Yaw to the correct SAB indices', () => {
        // Mock SAB and views
        const sab = new SharedArrayBuffer(128);
        const sabFloat32 = new Float32Array(sab);

        // Input: 30 degree Yaw
        const yRad = 30 * (Math.PI / 180);
        const trackerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yRad, 0, 'YXZ'));

        calculateAudioOrientation(trackerQuat, outQuat, tempEuler);

        // Emulate writing to SAB
        sabFloat32[SAB_SCHEMA.QUAT_ADTRK_X] = outQuat.x;
        sabFloat32[SAB_SCHEMA.QUAT_ADTRK_Y] = outQuat.y;
        sabFloat32[SAB_SCHEMA.QUAT_ADTRK_Z] = outQuat.z;
        sabFloat32[SAB_SCHEMA.QUAT_ADTRK_W] = outQuat.w;

        // Verify SAB contents
        const resultQuat = new THREE.Quaternion(
            sabFloat32[SAB_SCHEMA.QUAT_ADTRK_X],
            sabFloat32[SAB_SCHEMA.QUAT_ADTRK_Y],
            sabFloat32[SAB_SCHEMA.QUAT_ADTRK_Z],
            sabFloat32[SAB_SCHEMA.QUAT_ADTRK_W]
        );
        const resultEuler = new THREE.Euler().setFromQuaternion(resultQuat, 'YXZ');

        expect(resultEuler.y * (180 / Math.PI)).toBeCloseTo(-30, 5);
    });
});
