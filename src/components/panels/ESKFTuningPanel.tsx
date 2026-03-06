import React from 'react';
import { Tooltip } from '../Tooltip';

interface ESKFParams {
  tau: number;
  R_scalar: number;
  Q_scalar: number;
}

interface ESKFTuningPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isTrackingCam: boolean;
  eskfParams: ESKFParams;
  onESKFParamsChange: (params: Partial<ESKFParams>) => void;
  onESKFReset: () => void;
  onSliderDrag: (isDragging: boolean) => void;
}

export const ESKFTuningPanel: React.FC<ESKFTuningPanelProps> = ({
  isCollapsed,
  onToggleCollapse,
  isTrackingCam,
  eskfParams,
  onESKFParamsChange,
  onESKFReset,
  onSliderDrag,
}) => {
  return (
    <div className="px-6 py-3">
      <div
        className={`flex items-center justify-between cursor-pointer select-none group ${!isCollapsed ? 'mb-4' : ''}`}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
          <Tooltip title="Webcam ESKF Tuning" content="Adjusts the Error-State Kalman Filter (ESKF) parameters that fuse webcam tracking data for responsive, low-latency head orientation. Use these settings to balance smoothness against responsiveness.">
            <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">ESKF Tuning</h3>
          </Tooltip>
        </div>
        <button
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
          onClick={(e) => { e.stopPropagation(); onESKFReset(); }}
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Reset
        </button>
      </div>

      {!isCollapsed && (
        <div className={`space-y-4 pb-1 transition-opacity duration-300 ${!isTrackingCam ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
          {!isTrackingCam && (
            <div className="py-2 px-3 bg-slate-900/60 border border-white/5 rounded-md text-[10px] text-slate-400 text-center italic">
              Head tracking must be active to tune ESKF
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
              <Tooltip title="τ (Prediction)" content="Offsets system delay. Increase until audio panning feels instantaneous. If the sound field 'rubber-bands' or overshoots when you abruptly stop your head, decrease this value.">
                <span className="hover:text-slate-300 transition-colors">τ (Time Constant)</span>
              </Tooltip>
              <span className="text-primary font-medium">{eskfParams.tau.toFixed(3)}s</span>
            </div>
            <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="1.0" step="0.001" value={eskfParams.tau} onChange={(e) => onESKFParamsChange({ tau: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
              <Tooltip title="R (Measurement Noise)" content="Trust in the webcam. Lower = faster response but captures more micro-jitter. Higher = smoother but can feel sluggish. Listen for rapid stutters in the audio field; increase until the stutter disappears.">
                <span className="hover:text-slate-300 transition-colors">R (Meas Noise)</span>
              </Tooltip>
              <span className="text-primary font-medium">{eskfParams.R_scalar.toExponential(2)}</span>
            </div>
            <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="0.01" step="0.000001" value={eskfParams.R_scalar} onChange={(e) => onESKFParamsChange({ R_scalar: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
              <Tooltip title="Q (Process Noise)" content="Trust in head momentum. Lower = assumes smooth, predictable movement. Higher = better tracking for sudden, erratic head whips. Increase if the audio feels like it drags behind your fast turns.">
                <span className="hover:text-slate-300 transition-colors">Q (Proc Noise)</span>
              </Tooltip>
              <span className="text-primary font-medium">{eskfParams.Q_scalar.toExponential(2)}</span>
            </div>
            <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="1.0" step="0.0001" value={eskfParams.Q_scalar} onChange={(e) => onESKFParamsChange({ Q_scalar: Number(e.target.value) })} onMouseDown={() => onSliderDrag(true)} onMouseUp={() => onSliderDrag(false)} onTouchStart={() => onSliderDrag(true)} onTouchEnd={() => onSliderDrag(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
