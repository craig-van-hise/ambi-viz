/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { ControlSidebar } from './ControlSidebar';

afterEach(cleanup);

describe('ControlSidebar component (Phase 2)', () => {
  const defaultProps = {
    width: 320,
    onResizeStart: vi.fn(),
    visualizationMode: 'volumetric' as const,
    setVisualizationMode: vi.fn(),
    viewMode: 'inside' as const,
    setViewMode: vi.fn(),
    isTrackingCam: false,
    setIsTrackingCam: vi.fn(),
    zoomFov: 75,
    onZoomChange: vi.fn(),
    gain: 1.0,
    onGainChange: vi.fn(),
    cameraUIState: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
    onCameraUIChange: vi.fn(),
    onCameraReset: vi.fn(),
    visualParams: { densityThreshold: 0, densityMult: 0, emissionMult: 0, heatmapKnee: 0, edgeFalloff: 0, dissipationRate: 0 },
    onVisualParamsChange: vi.fn(),
    deformationParams: { frequency: 0, amplitude: 0, speed: 0 },
    onDeformationParamsChange: vi.fn(),
    onVisualReset: vi.fn(),
    eskfParams: { tau: 0, R_scalar: 0, Q_scalar: 0 },
    onESKFParamsChange: vi.fn(),
    onESKFReset: vi.fn(),
    onSliderDrag: vi.fn(),
  };

  it('renders the tracking button at the top of the sidebar before the ViewPanel', () => {
    const { getByRole, container } = render(<ControlSidebar {...defaultProps} />);

    // Assert the tracking button exists
    const trackingBtn = getByRole('button', { name: /start tracking/i });
    expect(trackingBtn).toBeDefined();

    // Verify it is positioned before the View panel header
    const buttonsAndHeaders = Array.from(
      container.querySelectorAll('button, h3')
    ).map(el => el.textContent?.trim());

    const trackingIndex = buttonsAndHeaders.findIndex(txt => txt?.includes('Start Tracking'));
    const viewIndex = buttonsAndHeaders.findIndex(txt => txt === 'View');

    expect(trackingIndex).toBeGreaterThan(-1);
    expect(viewIndex).toBeGreaterThan(-1);
    expect(trackingIndex).toBeLessThan(viewIndex);
  });

  it('renders ViewPanel in a collapsed state by default', () => {
    const { queryByText } = render(<ControlSidebar {...defaultProps} />);
    
    // Zoom label is inside ViewPanel. Since ViewPanel is collapsed by default, it should not be visible.
    expect(queryByText('Zoom')).toBeNull();
  });

  it('does not contain the bg-blue-600 utility class on the tracking button', () => {
    const { getByRole } = render(<ControlSidebar {...defaultProps} />);
    const trackingBtn = getByRole('button', { name: /start tracking/i });
    
    expect(trackingBtn.className).not.toContain('bg-blue-600');
    expect(trackingBtn.className).toContain('w-full');
  });

  it('Given the ControlSidebar renders, When inspecting the DOM, Assert that the Tracking Button container is no longer a child of the overflow-y-auto container', () => {
    const { container, getByRole } = render(<ControlSidebar {...defaultProps} />);
    const trackingBtn = getByRole('button', { name: /start tracking/i });
    const trackingBtnWrapper = trackingBtn.parentElement; // The relative div wrapper containing tooltip and button
    
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeTruthy();
    
    expect(scrollContainer?.contains(trackingBtnWrapper)).toBe(false);
  });
});
