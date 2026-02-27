/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { AmbiScene } from './AmbiScene';

// Mocking dependencies
vi.mock('three', async (importOriginal) => {
    const original = await importOriginal<typeof THREE>();
    return {
        ...original,
        WebGLRenderer: vi.fn().mockImplementation(function () {
            return {
                setSize: vi.fn(),
                setPixelRatio: vi.fn(),
                setRenderTarget: vi.fn(),
                render: vi.fn(),
                dispose: vi.fn(),
                domElement: document.createElement('canvas'),
            };
        }),
    };
});

vi.mock('three/addons/controls/OrbitControls.js', () => ({
    OrbitControls: vi.fn().mockImplementation(function () {
        return {
            update: vi.fn(),
            dispose: vi.fn(),
            target: new THREE.Vector3(0, 0, 0),
            enabled: true,
            enableDamping: false,
            dampingFactor: 0,
            enablePan: true,
            enableZoom: true,
            minDistance: 0,
            maxDistance: 1000
        };
    }),
}));

describe('AmbiScene Camera Control & Persistence', () => {
    it('should disable pan in both inside and outside modes', () => {
        const container = document.createElement('div');
        Object.defineProperty(container, 'clientWidth', { value: 1000 });
        Object.defineProperty(container, 'clientHeight', { value: 500 });

        const scene = new AmbiScene(container);

        // Inside mode (default)
        expect(scene.viewMode).toBe('inside');
        expect(scene.controls.enablePan).toBe(false);

        // Outside mode
        scene.setViewMode('outside');
        expect(scene.viewMode).toBe('outside');
        expect(scene.controls.enablePan).toBe(false);
    });

    it('should lock target to (0,0,-1) in inside mode and (0,0,0) in outside mode', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);

        // Inside mode (initial)
        expect(scene.controls.target.x).toBe(0);
        expect(scene.controls.target.y).toBe(0);
        expect(scene.controls.target.z).toBe(-1);

        scene.setViewMode('outside');
        expect(scene.controls.target.x).toBe(0);
        expect(scene.controls.target.y).toBe(0);
        expect(scene.controls.target.z).toBe(0);
    });

    it('should persist outside camera position when toggling', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);

        scene.setViewMode('outside');
        const targetPos = new THREE.Vector3(5, 5, 5);
        scene.camera.position.copy(targetPos);

        // Switch to inside
        scene.setViewMode('inside');
        expect(scene.camera.position.x).toBe(0);
        expect(scene.camera.position.y).toBe(0);
        expect(scene.camera.position.z).toBe(0);

        // Switch back to outside
        scene.setViewMode('outside');
        expect(scene.camera.position.x).toBe(5);
        expect(scene.camera.position.y).toBe(5);
        expect(scene.camera.position.z).toBe(5);
    });

    it('should update controls.target when rotation sliders change in inside mode', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Initial target at (0,0,-1), camera at (0,0,0)
        expect(scene.controls.target.x).toBe(0);
        expect(scene.controls.target.y).toBe(0);
        expect(scene.controls.target.z).toBe(-1);

        // Pitch slider change
        scene.updateFromUI('pitch', 45);

        // Assert that target moved from (0,0,0)
        expect(scene.controls.target.y).not.toBe(0);
        expect(scene.controls.target.z).not.toBe(0);
    });

    it('should clamp pitch to prevent gimbal lock singularities (with inversion)', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        const MAX_PITCH_EXPECTED = (Math.PI / 2) - 0.01;

        // Phase 2: UI pitch is INVERTED before being applied to camera.rotation.x
        // So UI pitch +90° → camera.rotation.x = clamp(-MAX_PITCH, MAX_PITCH, -PI/2) = -MAX_PITCH
        scene.updateFromUI('pitch', 90);
        expect(scene.camera.rotation.x).toBeGreaterThan(-Math.PI / 2);
        expect(scene.camera.rotation.x).toBeCloseTo(-MAX_PITCH_EXPECTED, 5);

        // UI pitch -120° → correctedRad = +120 * PI/180 (above MAX_PITCH) → clamped to +MAX_PITCH
        scene.updateFromUI('pitch', -120);
        expect(scene.camera.rotation.x).toBeLessThan(Math.PI / 2);
        expect(scene.camera.rotation.x).toBeCloseTo(MAX_PITCH_EXPECTED, 5);
    });

    it('should update camera rotation and fire onCameraStateChange from headTrackingQuat', async () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        let receivedState: any = null;
        scene.onCameraStateChange = (state) => {
            receivedState = state;
        };

        // Create a quaternion representing a 30 degree yaw (y-axis rotation)
        const yawDeg = 30;
        const yawRad = yawDeg * (Math.PI / 180);
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawRad, 0, 'YXZ'));

        // Inject the quaternion
        scene.headTrackingQuat = quat;

        // Manually trigger one frame logic
        // We override requestAnimationFrame to prevent recursion in tests
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (() => 0) as any;

        scene.animate();

        window.requestAnimationFrame = originalRAF;

        // Camera rotation should match the quaternion (Euler extraction)
        expect(scene.camera.rotation.y).toBeCloseTo(yawRad, 5);

        // Callback should have been fired with degrees
        expect(receivedState).not.toBeNull();
        expect(receivedState.yaw).toBeCloseTo(yawDeg, 5);
    });

    it('should strictly lock camera to origin in inside mode even after controls.update', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Force a displacement
        scene.camera.position.set(10, 10, 10);

        // Mock controls.update to simulate movement if pan was enabled
        // In our mock, update doesn't do anything, but we want to ensure animate() fixes it

        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (() => 0) as any;
        scene.animate();
        window.requestAnimationFrame = originalRAF;

        expect(scene.camera.position.x).toBe(0);
        expect(scene.camera.position.y).toBe(0);
        expect(scene.camera.position.z).toBe(0);
    });
});
