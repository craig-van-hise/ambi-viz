import React from 'react';
import { Tooltip } from '../Tooltip';
import type { ViewMode, VisualizationMode } from '../../visualizer/AmbiScene';

interface ViewAndTrackingPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  onSliderDrag: (isDragging: boolean) => void;
}

export const ViewAndTrackingPanel: React.FC<ViewAndTrackingPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
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
  onSliderDrag,
}) => {
  return (
    <div className="px-6 py-3 border-b border-primary/10 bg-primary/5">
      <div
        className={`flex items-center justify-between cursor-pointer select-none group ${!isCollapsed ? 'mb-4' : ''}`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
          <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">View & Tracking</h3>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300 normal-case">Visualization</span>
            <div className="flex p-1 bg-slate-800/80 rounded-lg border border-white/5 shadow-inner">
              <button
                onClick={() => setVisualizationMode('volumetric')}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${visualizationMode === 'volumetric' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >Volumetric</button>
              <button
                onClick={() => setVisualizationMode('sphere')}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${visualizationMode === 'sphere' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >Sphere</button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300 normal-case">View Mode</span>
            <div className="flex p-1 bg-slate-800/80 rounded-lg border border-white/5 shadow-inner">
              <button
                onClick={() => setViewMode('inside')}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${viewMode === 'inside' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >Inside</button>
              <button
                onClick={() => setViewMode('outside')}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${viewMode === 'outside' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >Outside</button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300 normal-case">Head Tracking</span>
            <button
              onClick={() => setIsTrackingCam(!isTrackingCam)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isTrackingCam
                ? 'bg-green-600 text-white hover:bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.3)]'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/5'
                }`}
            >
              <span className="material-symbols-outlined text-sm">videocam</span>
              <span>{isTrackingCam ? 'Tracking Active' : 'Start Tracking'}</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
              <Tooltip title="Zoom (FOV)" content="Adjusts the field of view. Lower values zoom in, higher values provide a wider perspective.">
                <span className="hover:text-slate-300 transition-colors">Zoom</span>
              </Tooltip>
              <span className="text-primary font-medium">{zoomFov.toFixed(1)}</span>
            </div>
            <input
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              type="range"
              min="10"
              max="150"
              step="1"
              value={zoomFov}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              onMouseDown={() => onSliderDrag(true)}
              onMouseUp={() => onSliderDrag(false)}
              onTouchStart={() => onSliderDrag(true)}
              onTouchEnd={() => onSliderDrag(false)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
              <Tooltip title="Gain" content="Scales the raw Ambisonic audio energy before it enters the visual ray-marching pipeline.">
                <span className="hover:text-slate-300 transition-colors">Gain</span>
              </Tooltip>
              <span className="text-primary font-medium">{gain.toFixed(2)}</span>
            </div>
            <input
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              type="range"
              min="0"
              max="20"
              step="0.01"
              value={gain}
              onChange={(e) => onGainChange(Number(e.target.value))}
              onMouseDown={() => onSliderDrag(true)}
              onMouseUp={() => onSliderDrag(false)}
              onTouchStart={() => onSliderDrag(true)}
              onTouchEnd={() => onSliderDrag(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
