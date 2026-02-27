/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { AmbiScene } from './visualizer/AmbiScene';

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
            target: new THREE.Vector3(0, 0, -1),
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

describe('Orientation Logic (Pitch & Roll)', () => {
    it('should invert pitch from head tracking to camera', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Pitch +30 degrees in the tracker
        const pitchRad = 30 * (Math.PI / 180);
        // Using YXZ order as in AmbiScene
        const trackerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitchRad, 0, 0, 'YXZ'));

        scene.headTrackingQuat = trackerQuat;

        // Emulate frame
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (() => 0) as any;
        scene.animate();
        window.requestAnimationFrame = originalRAF;

        // Camera should have -30 degrees pitch internally
        expect(scene.camera.rotation.x).toBeCloseTo(-pitchRad, 5);
    });

    it('should invert pitch from camera back to UI callback', () => {
        const originalNow = performance.now;
        performance.now = () => 0;

        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        let uiState: any = null;
        scene.onCameraStateChange = (state) => { uiState = state; };

        // Internally camera is at -30 deg
        const pitchRad = -30 * (Math.PI / 180);
        scene.camera.rotation.x = pitchRad;

        // Update target to match this rotation so lookAt doesn't reset it
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(scene.camera.rotation);
        scene.controls.target.copy(forward);

        // Mock performance.now to ensure throttle passes
        performance.now = () => 2000;

        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (() => 0) as any;
        scene.animate();
        window.requestAnimationFrame = originalRAF;
        performance.now = originalNow;

        // UI should see +30 deg
        expect(uiState).not.toBeNull();
        expect(uiState.pitch).toBeCloseTo(30, 1);
    });

    it('should correctly set camera.up based on Roll angle from UI', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Roll 90 degrees
        scene.updateFromUI('roll', 90);

        // Up vector should be [-1, 0, 0] since sin(90)=1, cos(90)=0
        expect(scene.camera.up.x).toBeCloseTo(-1, 5);
        expect(scene.camera.up.y).toBeCloseTo(0, 5);
    });

    it('should extract and apply Roll from tracker to camera.up', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Roll 45 degrees in tracker
        const rollRad = 45 * (Math.PI / 180);
        const trackerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rollRad, 'YXZ'));

        scene.headTrackingQuat = trackerQuat;

        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = (() => 0) as any;
        scene.animate();
        window.requestAnimationFrame = originalRAF;

        // Up vector should be [-sin(45), cos(45), 0]
        const expectedX = -Math.sin(rollRad);
        const expectedY = Math.cos(rollRad);

        expect(scene.camera.up.x).toBeCloseTo(expectedX, 5);
        expect(scene.camera.up.y).toBeCloseTo(expectedY, 5);
    });
});
