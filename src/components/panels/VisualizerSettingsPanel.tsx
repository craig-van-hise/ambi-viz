import React from 'react';
import { Tooltip } from '../Tooltip';
import type { VisualizationMode } from '../../visualizer/AmbiScene';
import type { VisualParams, DeformationParams } from '../../App';

interface VisualizerSettingsPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  visualizationMode: VisualizationMode;
  visualParams: VisualParams;
  onVisualParamsChange: (params: Partial<VisualParams>) => void;
  deformationParams: DeformationParams;
  onDeformationParamsChange: (params: Partial<DeformationParams>) => void;
  onVisualReset: () => void;
  onSliderDrag: (isDragging: boolean) => void;
}

export const VisualizerSettingsPanel: React.FC<VisualizerSettingsPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  visualizationMode,
  visualParams,
  onVisualParamsChange,
  deformationParams,
  onDeformationParamsChange,
  onVisualReset,
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
          <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">Visualizer Controls</h3>
        </div>
        <button
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
          onClick={(e) => { e.stopPropagation(); onVisualReset(); }}
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Reset
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pb-1">
          {visualizationMode === 'volumetric' ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Threshold" content="Sets the minimum audio energy required to render a cloud. Increase this to hide background room noise.">
                    <span className="hover:text-slate-300 transition-colors">Threshold</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{visualParams.densityThreshold.toFixed(3)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="0.5" step="0.001" value={visualParams.densityThreshold} onChange={(e) => onVisualParamsChange({ densityThreshold: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Density" content="Controls the physical thickness and opacity of the volumetric audio clouds.">
                    <span className="hover:text-slate-300 transition-colors">Density</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{visualParams.densityMult.toFixed(1)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="500" step="1" value={visualParams.densityMult} onChange={(e) => onVisualParamsChange({ densityMult: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Emission" content="Controls the glowing heat and brightness of the volume independently of its thickness.">
                    <span className="hover:text-slate-300 transition-colors">Emission</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{visualParams.emissionMult.toFixed(2)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="50" step="0.1" value={visualParams.emissionMult} onChange={(e) => onVisualParamsChange({ emissionMult: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Knee (Color)" content="Shifts the color transfer function to prevent loud transient sounds from blowing out the visualizer into solid white.">
                    <span className="hover:text-slate-300 transition-colors">Knee</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{visualParams.heatmapKnee.toFixed(2)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0.01" max="1" step="0.01" value={visualParams.heatmapKnee} onChange={(e) => onVisualParamsChange({ heatmapKnee: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Edge Falloff" content="Adjusts the geometric sharpness of the spatial audio lobes. Higher values create tighter, more focused clouds.">
                    <span className="hover:text-slate-300 transition-colors">Edge Falloff</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{visualParams.edgeFalloff.toFixed(2)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="2" step="0.01" value={visualParams.edgeFalloff} onChange={(e) => onVisualParamsChange({ edgeFalloff: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Dissipation" content="Controls how slowly the visual energy fades over time, creating lingering smoke trails that smooth out erratic flickering.">
                    <span className="hover:text-slate-300 transition-colors">Dissipation</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{visualParams.dissipationRate.toFixed(2)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="1" step="0.01" value={visualParams.dissipationRate} onChange={(e) => onVisualParamsChange({ dissipationRate: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Amplitude" content="Controls the amount of deformation (peak height) applied to the sphere based on audio energy.">
                    <span className="hover:text-slate-300 transition-colors">Amplitude</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{deformationParams.amplitude.toFixed(1)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="5" step="0.1" value={deformationParams.amplitude} onChange={(e) => onDeformationParamsChange({ amplitude: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Base Radius" content="Sets the resting radius of the underlying sphere.">
                    <span className="hover:text-slate-300 transition-colors">Base Radius</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{deformationParams.baseRadius.toFixed(1)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0.1" max="3" step="0.1" value={deformationParams.baseRadius} onChange={(e) => onDeformationParamsChange({ baseRadius: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Sharpness" content="Adjusts how sharp or smooth the audio peaks appear.">
                    <span className="hover:text-slate-300 transition-colors">Sharpness</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{deformationParams.sharpness.toFixed(1)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0.1" max="5.0" step="0.1" value={deformationParams.sharpness} onChange={(e) => onDeformationParamsChange({ sharpness: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Color Intensity" content="Controls the intensity of the heatmap colors mapped onto the surface.">
                    <span className="hover:text-slate-300 transition-colors">Color Intensity</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{deformationParams.colorIntensity.toFixed(1)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0.1" max="5.0" step="0.1" value={deformationParams.colorIntensity} onChange={(e) => onDeformationParamsChange({ colorIntensity: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Smoothing" content="Smooths the audio data over time to prevent erratic flickering.">
                    <span className="hover:text-slate-300 transition-colors">Smoothing</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{deformationParams.smoothing.toFixed(2)}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0.0" max="0.99" step="0.01" value={deformationParams.smoothing} onChange={(e) => onDeformationParamsChange({ smoothing: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                  <Tooltip title="Resolution" content="Adjust the number of vertices in the sphere. High resolution looks smoother but requires more geometry rebuilding.">
                    <span className="hover:text-slate-300 transition-colors">Resolution</span>
                  </Tooltip>
                  <span className="text-primary font-medium">{deformationParams.resolution}</span>
                </div>
                <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="32" max="256" step="16" value={deformationParams.resolution} onChange={(e) => onDeformationParamsChange({ resolution: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Tooltip title="Wireframe" content="Toggles wireframe rendering mode for the sphere surface.">
                  <span className="text-[11px] font-normal normal-case text-slate-400 hover:text-slate-300 transition-colors">Wireframe</span>
                </Tooltip>
                <button
                  onClick={() => onDeformationParamsChange({ wireframe: !deformationParams.wireframe })}
                  className={`w-8 h-4 rounded-full transition-colors relative ${deformationParams.wireframe ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${deformationParams.wireframe ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
