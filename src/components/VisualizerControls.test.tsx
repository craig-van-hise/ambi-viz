/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { VisualizerControls, DEFAULT_VISUAL_PARAMS } from './VisualizerControls';

afterEach(cleanup);

describe('VisualizerControls', () => {
    const mockProps = {
        gain: 5.0,
        onGainChange: vi.fn(),
        zoomFov: 90,
        onZoomChange: vi.fn(),
        isInsideView: true
    };

    it('renders all sliders and labels correctly', () => {
        render(
            <VisualizerControls
                params={DEFAULT_VISUAL_PARAMS}
                onChange={vi.fn()}
                {...mockProps}
            />
        );

        // Core visualizer params
        expect(screen.getByText('🎨 Visualizer Controls')).toBeDefined();
        expect(screen.getByText('Threshold')).toBeDefined();
        expect(screen.getByText('Density')).toBeDefined();
        expect(screen.getByText('Emission')).toBeDefined();
        expect(screen.getByText('Knee (Color)')).toBeDefined();
        expect(screen.getByText('Edge Falloff')).toBeDefined();
        expect(screen.getByText('Dissipation')).toBeDefined();

        // Migrated params
        expect(screen.getByText('Zoom')).toBeDefined();
        expect(screen.getByText('Gain')).toBeDefined();
    });

    it('triggers onChange internally when sliders are moved', async () => {
        const handleChange = vi.fn();
        const { getByTestId } = render(
            <VisualizerControls
                params={DEFAULT_VISUAL_PARAMS}
                onChange={handleChange}
                {...mockProps}
            />
        );

        const thresholdInput = getByTestId('Threshold');
        fireEvent.change(thresholdInput, { target: { value: '0.25' } });

        // Wait for debounce flush
        await waitFor(() => {
            expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
                densityThreshold: 0.25
            }));
        });
    });

    it('contains all 8 exactly matching tooltips in the DOM', () => {
        const { getByTitle } = render(
            <VisualizerControls
                params={DEFAULT_VISUAL_PARAMS}
                onChange={vi.fn()}
                {...mockProps}
            />
        );

        expect(getByTitle("Adjusts the camera's field of view and proximity within the 3D ambisonic scene.")).toBeDefined();
        expect(getByTitle("Scales the raw Ambisonic audio energy before it enters the visual ray-marching pipeline.")).toBeDefined();
        expect(getByTitle("Sets the minimum audio energy required to render a cloud. Increase this to hide background room noise.")).toBeDefined();
        expect(getByTitle("Controls the physical thickness and opacity of the volumetric audio clouds.")).toBeDefined();
        expect(getByTitle("Controls the glowing heat and brightness of the volume independently of its thickness.")).toBeDefined();
        expect(getByTitle("Shifts the color transfer function to prevent loud transient sounds from blowing out the visualizer into solid white.")).toBeDefined();
        expect(getByTitle("Adjusts the geometric sharpness of the spatial audio lobes. Higher values create tighter, more focused clouds.")).toBeDefined();
        expect(getByTitle("Controls how slowly the visual energy fades over time, creating lingering smoke trails that smooth out erratic flickering.")).toBeDefined();
    });

    it('calls onReset when reset button is clicked', () => {
        const handleReset = vi.fn();
        const { getByText } = render(
            <VisualizerControls
                params={DEFAULT_VISUAL_PARAMS}
                onChange={vi.fn()}
                onReset={handleReset}
                {...mockProps}
            />
        );

        const resetBtn = getByText('Reset');
        fireEvent.click(resetBtn);

        expect(handleReset).toHaveBeenCalledTimes(1);
    });
});
