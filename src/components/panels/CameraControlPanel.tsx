import React from 'react';
import type { ViewMode } from '../../visualizer/AmbiScene';

export interface CameraUIState {
  yaw: number;
  pitch: number;
  roll: number;
  x: number;
  y: number;
  z: number;
}

interface CameraControlPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  viewMode: ViewMode;
  cameraUIState: CameraUIState;
  onCameraUIChange: (axis: keyof CameraUIState, value: number) => void;
  onCameraReset: () => void;
  onSliderDrag: (isDragging: boolean) => void;
}

export const CameraControlPanel: React.FC<CameraControlPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  viewMode,
  cameraUIState,
  onCameraUIChange,
  onCameraReset,
  onSliderDrag,
}) => {
  return (
    <div className="px-6 py-3 border-b border-primary/10">
      <div
        className={`flex items-center justify-between cursor-pointer select-none group ${!isCollapsed ? 'mb-4' : ''}`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
          <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">
            {viewMode === 'inside' ? 'Camera Orientation' : 'Camera Position'}
          </h3>
        </div>
        <button
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
          onClick={(e) => { e.stopPropagation(); onCameraReset(); }}
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Reset
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pb-1">
          {viewMode === 'inside' ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <span>Yaw</span>
                  <span className="text-primary font-medium">{cameraUIState.yaw.toFixed(1)}°</span>
                </div>
                <input
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  type="range" min="-180" max="180" step="0.1"
                  value={cameraUIState.yaw}
                  onChange={(e) => onCameraUIChange('yaw', Number(e.target.value))}
                  onMouseDown={() => onSliderDrag(true)}
                  onMouseUp={() => onSliderDrag(false)}
                  onTouchStart={() => onSliderDrag(true)}
                  onTouchEnd={() => onSliderDrag(false)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <span>Pitch</span>
                  <span className="text-primary font-medium">{cameraUIState.pitch.toFixed(1)}°</span>
                </div>
                <input
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  type="range" min="-89.4" max="89.4" step="0.1"
                  value={cameraUIState.pitch}
                  onChange={(e) => onCameraUIChange('pitch', Number(e.target.value))}
                  onMouseDown={() => onSliderDrag(true)}
                  onMouseUp={() => onSliderDrag(false)}
                  onTouchStart={() => onSliderDrag(true)}
                  onTouchEnd={() => onSliderDrag(false)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <span>Roll</span>
                  <span className="text-primary font-medium">{cameraUIState.roll.toFixed(1)}°</span>
                </div>
                <input
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  type="range" min="-180" max="180" step="0.1"
                  value={cameraUIState.roll}
                  onChange={(e) => onCameraUIChange('roll', Number(e.target.value))}
                  onMouseDown={() => onSliderDrag(true)}
                  onMouseUp={() => onSliderDrag(false)}
                  onTouchStart={() => onSliderDrag(true)}
                  onTouchEnd={() => onSliderDrag(false)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <span>X</span>
                  <span className="text-primary font-medium">{cameraUIState.x.toFixed(2)}</span>
                </div>
                <input
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  type="range" min="-50" max="50" step="0.1"
                  value={cameraUIState.x}
                  onChange={(e) => onCameraUIChange('x', Number(e.target.value))}
                  onMouseDown={() => onSliderDrag(true)}
                  onMouseUp={() => onSliderDrag(false)}
                  onTouchStart={() => onSliderDrag(true)}
                  onTouchEnd={() => onSliderDrag(false)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <span>Y</span>
                  <span className="text-primary font-medium">{cameraUIState.y.toFixed(2)}</span>
                </div>
                <input
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  type="range" min="-50" max="50" step="0.1"
                  value={cameraUIState.y}
                  onChange={(e) => onCameraUIChange('y', Number(e.target.value))}
                  onMouseDown={() => onSliderDrag(true)}
                  onMouseUp={() => onSliderDrag(false)}
                  onTouchStart={() => onSliderDrag(true)}
                  onTouchEnd={() => onSliderDrag(false)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <span>Z</span>
                  <span className="text-primary font-medium">{cameraUIState.z.toFixed(2)}</span>
                </div>
                <input
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  type="range" min="-50" max="50" step="0.1"
                  value={cameraUIState.z}
                  onChange={(e) => onCameraUIChange('z', Number(e.target.value))}
                  onMouseDown={() => onSliderDrag(true)}
                  onMouseUp={() => onSliderDrag(false)}
                  onTouchStart={() => onSliderDrag(true)}
                  onTouchEnd={() => onSliderDrag(false)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
