/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ViewPanel } from './ViewPanel';

describe('ViewPanel component (Phase 1)', () => {
  it('does not contain tracking-related text or buttons', () => {
    const mockSetVisualizationMode = vi.fn();
    const mockSetViewMode = vi.fn();
    const mockOnZoomChange = vi.fn();
    const mockOnGainChange = vi.fn();
    const mockOnSliderDrag = vi.fn();
    const mockOnToggleCollapse = vi.fn();

    const { queryByText, queryByRole } = render(
      <ViewPanel
        isCollapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
        visualizationMode="volumetric"
        setVisualizationMode={mockSetVisualizationMode}
        viewMode="inside"
        setViewMode={mockSetViewMode}
        zoomFov={75}
        onZoomChange={mockOnZoomChange}
        gain={1.0}
        onGainChange={mockOnGainChange}
        onSliderDrag={mockOnSliderDrag}
      />
    );

    // Assert that tracking-related text or buttons do not exist
    expect(queryByText(/tracking/i)).toBeNull();
    expect(queryByRole('button', { name: /tracking/i })).toBeNull();
  });
});
