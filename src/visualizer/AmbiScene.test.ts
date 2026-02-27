/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { AmbiScene } from './AmbiScene';

// Mocking dependencies to avoid WebGL/DOM errors
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
            target: new THREE.Vector3(),
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

describe('AmbiScene FOV Logic', () => {
    it('should correctly decouple Inside and Outside FOV', () => {
        const container = document.createElement('div');
        // Define dimensions to avoid division by zero
        Object.defineProperty(container, 'clientWidth', { value: 1000 });
        Object.defineProperty(container, 'clientHeight', { value: 500 });

        const scene = new AmbiScene(container);

        // Initial state should be 'inside' with default 75
        expect(scene.viewMode).toBe('inside');
        expect(scene.camera.fov).toBe(75);

        // Update inside FOV
        scene.setFov(120);
        expect(scene.camera.fov).toBe(120);

        // Switch to outside
        const updateProjectionSpy = vi.spyOn(scene.camera, 'updateProjectionMatrix');
        scene.setViewMode('outside');
        expect(scene.viewMode).toBe('outside');
        expect(scene.camera.fov).toBe(50); // DEFAULT_OUTSIDE_FOV
        expect(updateProjectionSpy).toHaveBeenCalled();

        // Set FOV while in outside mode should update internal state but NOT the camera lens
        scene.setFov(140);
        expect(scene.camera.fov).toBe(50); // Still 50

        // Switch back to inside
        scene.setViewMode('inside');
        expect(scene.viewMode).toBe('inside');
        expect(scene.camera.fov).toBe(140); // Restore custom FOV
        expect(updateProjectionSpy).toHaveBeenCalledTimes(2);
    });
});

describe('AmbiScene Roll Visualization Math (Phase 3)', () => {
    it('should set camera.up to (-1, 0) when roll is 90 degrees (π/2 radians)', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Roll = 90° = π/2 radians
        scene.updateFromUI('roll', 90);

        // Math: up.x = -sin(π/2) = -1, up.y = cos(π/2) = 0
        expect(scene.camera.up.x).toBeCloseTo(-1, 5);
        expect(scene.camera.up.y).toBeCloseTo(0, 5);
    });

    it('should set camera.up to (0, 1) when roll is 0 degrees', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        scene.updateFromUI('roll', 0);

        // Math: up.x = -sin(0) = 0, up.y = cos(0) = 1
        expect(scene.camera.up.x).toBeCloseTo(0, 5);
        expect(scene.camera.up.y).toBeCloseTo(1, 5);
    });

    it('should reset camera.up to (0,1) when switching to inside mode', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);

        // First go outside
        scene.setViewMode('outside');

        // Go to inside
        scene.setViewMode('inside');

        // camera.up should be default (0, 1, 0)
        expect(scene.camera.up.x).toBeCloseTo(0, 5);
        expect(scene.camera.up.y).toBeCloseTo(1, 5);
    });
});
