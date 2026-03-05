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
                clear: vi.fn(),
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

// Mock ResizeObserver
global.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};

describe('AmbiScene FOV Logic', () => {
    it('should correctly decouple Inside and Outside FOV', () => {
        const container = document.createElement('div');
        // Define dimensions to avoid division by zero
        Object.defineProperty(container, 'clientWidth', { value: 1000 });
        Object.defineProperty(container, 'clientHeight', { value: 500 });

        const scene = new AmbiScene(container);

        // Initial state should be 'inside' with default 150
        expect(scene.viewMode).toBe('inside');
        expect(scene.camera.fov).toBe(150);

        // Update inside FOV
        scene.setFov(120);
        expect(scene.camera.fov).toBe(120);

        // Switch to outside
        const updateProjectionSpy = vi.spyOn(scene.camera, 'updateProjectionMatrix');
        scene.setViewMode('outside');
        expect(scene.viewMode).toBe('outside');
        expect(scene.camera.fov).toBe(60); // DEFAULT_OUTSIDE_FOV
        expect(updateProjectionSpy).toHaveBeenCalled();

        // Set FOV while in outside mode should update the outside FOV and the camera lens
        scene.setFov(140);
        expect(scene.camera.fov).toBe(140);

        // Switch back to inside
        scene.setViewMode('inside');
        expect(scene.viewMode).toBe('inside');
        expect(scene.camera.fov).toBe(150); // Reset to default insideFov because state isn't remembered
        expect(updateProjectionSpy).toHaveBeenCalledTimes(3);
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

describe('AmbiScene Volumetric Parameters (Phase 1)', () => {
    it('should initialize uniforms with default values', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);

        expect(scene.getDensityThreshold()).toBe(0.05);
        expect(scene.getDensityMult()).toBe(1.0);
        expect(scene.getEmissionMult()).toBe(1.0);
        expect(scene.getHeatmapKnee()).toBe(0.5);
        expect(scene.getEdgeFalloff()).toBe(1.0);
        expect(scene.getDissipationRate()).toBe(0.9);
    });

    it('should correctly set and get uniform values with strict type coercion', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);

        // Valid numbers
        scene.setDensityThreshold(0.2);
        expect(scene.getDensityThreshold()).toBe(0.2);

        // Type coercion (string to number)
        scene.setDensityMult('2.5' as any);
        expect(scene.getDensityMult()).toBe(2.5);

        // Invalid input protection (NaN defaults to 0)
        scene.setEmissionMult(NaN);
        expect(scene.getEmissionMult()).toBe(0);

        scene.setHeatmapKnee(undefined as any);
        expect(scene.getHeatmapKnee()).toBe(0);

        scene.setEdgeFalloff('invalid_string' as any);
        expect(scene.getEdgeFalloff()).toBe(0);
    });
});

describe('AmbiScene Inside View Persistence (Snap-Back Fix)', () => {
    it('should update target and reset position when manual rotation is detected', () => {
        const container = document.createElement('div');
        const scene = new AmbiScene(container);
        scene.setViewMode('inside');

        // Initial state: position at origin, target at (0,0,-1)
        expect(scene.camera.position.x).toBe(0);
        expect(scene.camera.position.z).toBe(0);
        expect(scene.controls.target.z).toBe(-1);

        // Simulate OrbitControls drag: camera moved to (1, 0, 1), target stayed at (0, 0, 0)
        scene.camera.position.set(1, 0, 1);
        scene.controls.target.set(0, 0, 0);

        // Run animation frame
        scene.animate();

        // 1. Camera should be back at origin
        expect(scene.camera.position.x).toBe(0);
        expect(scene.camera.position.y).toBe(0);
        expect(scene.camera.position.z).toBe(0);

        // 2. target should be projected forward (normalized direction from camera pos to previous target)
        // dir = target - camera_pos = (0,0,0) - (1,0,1) = (-1, 0, -1)
        // normalized = (-0.707, 0, -0.707)
        expect(scene.controls.target.x).toBeCloseTo(-0.707, 3);
        expect(scene.controls.target.z).toBeCloseTo(-0.707, 3);
    });
});
