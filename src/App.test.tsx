/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import App from './App';

// Mock heavy dependencies that fail in jsdom
vi.mock('./audio/AudioEngine', () => {
    return {
        AudioEngine: vi.fn().mockImplementation(function () {
            return {
                queue: [],
                currentIndex: -1,
                init: vi.fn(),
                update: vi.fn(),
                setLoop: vi.fn(),
                setVolume: vi.fn(),
                onStateChange: undefined,
                getCovariance: vi.fn().mockReturnValue(new Float32Array(16)),
            };
        })
    };
});

vi.mock('./visualizer/AmbiScene', () => {
    return {
        AmbiScene: vi.fn().mockImplementation(function () {
            return {
                setDensityThreshold: vi.fn(),
                setDensityMult: vi.fn(),
                setEmissionMult: vi.fn(),
                setHeatmapKnee: vi.fn(),
                setEdgeFalloff: vi.fn(),
                setDissipationRate: vi.fn(),
                destroy: vi.fn(),
                setTrackingIndicatorsVisible: vi.fn(),
                setVisualizationMode: vi.fn(),
                setFov: vi.fn(),
                updateCovariance: vi.fn(),
                getNaturalQuaternion: vi.fn().mockReturnValue([0, 0, 0, 1]),
                updateTrackingIndicators: vi.fn(),
                updateFromUI: vi.fn(),
                setViewMode: vi.fn(),
                setDeformationParams: vi.fn(),
            };
        })
    };
});

vi.mock('./HeadTrackingService', () => {
    return {
        HeadTrackingService: vi.fn().mockImplementation(function () {
            return {
                init: vi.fn(),
                updateESKFParams: vi.fn(),
                getRawQuaternion: vi.fn().mockReturnValue([0, 0, 0, 1]),
                getPredictedQuaternion: vi.fn().mockReturnValue([0, 0, 0, 1]),
                setUIRotation: vi.fn(),
                stopCamera: vi.fn(),
            };
        })
    };
});

describe('App UI Integration', () => {
    it('contains the "opus" string in the drop overlay (Phase 3 Checkpoint)', () => {
        const { container } = render(<App />);

        const vizContainer = container.querySelector('.viz-container');
        if (vizContainer) {
            fireEvent.dragOver(vizContainer);
        }

        expect(container.textContent).toContain('.opus');
    });
});
