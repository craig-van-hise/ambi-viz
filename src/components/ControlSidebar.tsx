import React, { useState } from 'react';
import { ViewAndTrackingPanel } from './panels/ViewAndTrackingPanel';
import { CameraControlPanel } from './panels/CameraControlPanel';
import { VisualizerSettingsPanel } from './panels/VisualizerSettingsPanel';
import { ESKFTuningPanel } from './panels/ESKFTuningPanel';
import type { ViewMode, VisualizationMode } from '../visualizer/AmbiScene';
import type { CameraUIState } from './panels/CameraControlPanel';
import type { VisualParams, DeformationParams } from '../App';

interface ControlSidebarProps {
  width: number;
  onResizeStart: () => void;
  visualizationMode: VisualizationMode;
  setVisualizationMode: (mode: VisualizationMode) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTrackingCam: boolean;
  setIsTrackingCam: (isTracking: boolean) => void;
  zoomFov: number;
  onZoomChange: (fov: number) => void;
  gain: number;
  onGainChange: (gain: number) => void;
  cameraUIState: CameraUIState;
  onCameraUIChange: (axis: keyof CameraUIState, value: number) => void;
  onCameraReset: () => void;
  visualParams: VisualParams;
  onVisualParamsChange: (params: Partial<VisualParams>) => void;
  deformationParams: DeformationParams;
  onDeformationParamsChange: (params: Partial<DeformationParams>) => void;
  onVisualReset: () => void;
  eskfParams: { tau: number; R_scalar: number; Q_scalar: number };
  onESKFParamsChange: (params: Partial<{ tau: number; R_scalar: number; Q_scalar: number }>) => void;
  onESKFReset: () => void;
  onSliderDrag: (isDragging: boolean) => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  width,
  onResizeStart,
  visualizationMode,
  setVisualizationMode,
  viewMode,
  setViewMode,
  isTrackingCam,
  setIsTrackingCam,
  zoomFov,
  onZoomChange,
  gain,
  onGainChange,
  cameraUIState,
  onCameraUIChange,
  onCameraReset,
  visualParams,
  onVisualParamsChange,
  deformationParams,
  onDeformationParamsChange,
  onVisualReset,
  eskfParams,
  onESKFParamsChange,
  onESKFReset,
  onSliderDrag,
}) => {
  const [isViewTrackingCollapsed, setIsViewTrackingCollapsed] = useState(false);
  const [isCameraCollapsed, setIsCameraCollapsed] = useState(true);
  const [isVisualizerCollapsed, setIsVisualizerCollapsed] = useState(true);
  const [isESKFCollapsed, setIsESKFCollapsed] = useState(true);

  return (
    <aside style={{ width }} className="h-full glass border-l border-primary/10 flex flex-col z-40 shrink-0 relative">
      <div
        className="absolute top-0 -left-1 w-2 h-full cursor-col-resize hover:bg-slate-500/30 z-50 transition-colors"
        onMouseDown={onResizeStart}
      />

      <div className="flex-1 overflow-y-auto w-full p-4 space-y-6 pb-24 customized-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">tune</span>
            <h3 className="font-semibold text-sm uppercase tracking-widest text-slate-300">Controls</h3>
          </div>
        </div>

        <ViewAndTrackingPanel
          isCollapsed={isViewTrackingCollapsed}
          onToggleCollapse={() => setIsViewTrackingCollapsed(!isViewTrackingCollapsed)}
          visualizationMode={visualizationMode}
          setVisualizationMode={setVisualizationMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isTrackingCam={isTrackingCam}
          setIsTrackingCam={setIsTrackingCam}
          zoomFov={zoomFov}
          onZoomChange={onZoomChange}
          gain={gain}
          onGainChange={onGainChange}
          onSliderDrag={onSliderDrag}
        />

        <CameraControlPanel
          isCollapsed={isCameraCollapsed}
          onToggleCollapse={() => setIsCameraCollapsed(!isCameraCollapsed)}
          viewMode={viewMode}
          cameraUIState={cameraUIState}
          onCameraUIChange={onCameraUIChange}
          onCameraReset={onCameraReset}
          onSliderDrag={onSliderDrag}
        />

        <VisualizerSettingsPanel
          isCollapsed={isVisualizerCollapsed}
          onToggleCollapse={() => setIsVisualizerCollapsed(!isVisualizerCollapsed)}
          visualizationMode={visualizationMode}
          visualParams={visualParams}
          onVisualParamsChange={onVisualParamsChange}
          deformationParams={deformationParams}
          onDeformationParamsChange={onDeformationParamsChange}
          onVisualReset={onVisualReset}
          onSliderDrag={onSliderDrag}
        />

        <ESKFTuningPanel
          isCollapsed={isESKFCollapsed}
          onToggleCollapse={() => setIsESKFCollapsed(!isESKFCollapsed)}
          isTrackingCam={isTrackingCam}
          eskfParams={eskfParams}
          onESKFParamsChange={onESKFParamsChange}
          onESKFReset={onESKFReset}
          onSliderDrag={onSliderDrag}
        />
      </div>
    </aside>
  );
};
