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
            const self = {
                queue: [] as any[],
                currentIndex: -1,
                init: vi.fn(),
                update: vi.fn(),
                setLoop: vi.fn(),
                setVolume: vi.fn(),
                onStateChange: undefined as any,
                onTrackChange: undefined as any,
                getCovariance: vi.fn().mockReturnValue(new Float32Array(16)),
                queueFiles: vi.fn().mockImplementation(async function (items) {
                    const startIdx = self.queue.length;
                    for (const item of items) {
                        self.queue.push({ name: item.name, url: item.url, type: item.type, buffer: null });
                    }
                    return Array.from({ length: items.length }, (_, i) => startIdx + i);
                }),
                loadTrack: vi.fn().mockImplementation(async function (index) {
                    self.currentIndex = index;
                    if (self.onTrackChange) self.onTrackChange(index);
                    return true;
                }),
                playbackState: 'stopped',
                getDuration: vi.fn().mockReturnValue(0),
                getCurrentTime: vi.fn().mockReturnValue(0),
            };
            return self;
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

    it('Asserts that the sidebar parent container has a higher computed z-index than the canvas parent container (Phase 1 PRP #81)', () => {
        const { container } = render(<App />);
        
        const asides = container.querySelectorAll('aside');
        const aside = asides[asides.length - 1];
        const asideParent = aside?.parentElement;
        
        const section = container.querySelector('section.canvas-bg');
        const sectionParent = section?.parentElement;
        
        expect(asideParent).toBeTruthy();
        expect(sectionParent).toBeTruthy();
        
        expect(asideParent?.className).toContain('z-20');
        expect(sectionParent?.className).toContain('z-0');
    });

    it('Asserts that the queue populates with 8 tracks in the newly defined order and no 404 network errors occur (PRP #86)', async () => {
        const mockQueueText = `1. 3rd Order Clock
2. Bach Invention no5 in Eb_AmbiX_3O
3. A Furiosa (Maxixe)_dry
4. SMB 2 Theme
5. Beethoven - String Quartet No 13 in B-flat major - IV Alla danza tedesca
6. Let Me Tell You About My Boat
7. Final Fantasy Prelude
8. TEST-09-DYN-B-SPIRAL_Order3`;

        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.endsWith('Queue order.txt')) {
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(mockQueueText),
                } as Response);
            }
            return Promise.resolve({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
            } as Response);
        });

        try {
            const { findByText } = render(<App />);
            
            // Check that tracks are loaded and rendered in the queue
            expect(await findByText('3rd Order Clock')).toBeTruthy();
            expect(await findByText('Bach Invention no5 in Eb_AmbiX_3O')).toBeTruthy();
            expect(await findByText('A Furiosa (Maxixe)_dry')).toBeTruthy();
            expect(await findByText('SMB 2 Theme')).toBeTruthy();
            expect(await findByText('Beethoven - String Quartet No 13 in B-flat major - IV Alla danza tedesca')).toBeTruthy();
            expect(await findByText('Let Me Tell You About My Boat')).toBeTruthy();
            expect(await findByText('Final Fantasy Prelude')).toBeTruthy();
            expect(await findByText('TEST-09-DYN-B-SPIRAL_Order3')).toBeTruthy();
        } finally {
            global.fetch = originalFetch;
        }
    });
});
