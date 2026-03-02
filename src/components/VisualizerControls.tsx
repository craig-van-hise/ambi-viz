import { useCallback, useRef, useEffect, useState } from 'react';

export interface VisualParams {
    densityThreshold: number;
    densityMult: number;
    emissionMult: number;
    heatmapKnee: number;
    edgeFalloff: number;
    dissipationRate: number;
}

export const DEFAULT_VISUAL_PARAMS: VisualParams = {
    densityThreshold: 0,
    densityMult: 1.0,
    emissionMult: 1.0,
    heatmapKnee: 0.5,
    edgeFalloff: 1.0,
    dissipationRate: 0,
};

interface Props {
    params: VisualParams;
    onChange: (params: Partial<VisualParams>) => void;
    onReset?: () => void;

    // Migrated from App.tsx
    gain: number;
    onGainChange: (val: number) => void;
    zoomFov: number;
    onZoomChange: (val: number) => void;
    isInsideView: boolean;
}

export function VisualizerControls({
    params, onChange, onReset,
    gain, onGainChange, zoomFov, onZoomChange, isInsideView
}: Props) {
    // Keep local state for fast slider response, sync to parent debounced
    const [localParams, setLocalParams] = useState<VisualParams>(params);

    // Sync from parent if reset or loaded from persistence
    useEffect(() => {
        setLocalParams(params);
    }, [params]);

    const pendingRef = useRef<Partial<VisualParams> | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flush = useCallback(() => {
        if (pendingRef.current) {
            onChange(pendingRef.current);
            pendingRef.current = null;
        }
    }, [onChange]);

    const scheduleUpdate = useCallback((newParams: Partial<VisualParams>) => {
        pendingRef.current = { ...pendingRef.current, ...newParams };
        if (!timerRef.current) {
            timerRef.current = setTimeout(() => {
                flush();
                timerRef.current = null;
            }, 50);
        }
    }, [flush]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleSlider = (key: keyof VisualParams, valueStr: string) => {
        const val = parseFloat(valueStr);
        setLocalParams(prev => ({ ...prev, [key]: val }));
        scheduleUpdate({ [key]: val });
    };

    return (
        <div className="eskf-tuning-panel" style={{ position: 'relative' }}>
            {onReset && (
                <button
                    onClick={onReset}
                    className="reset-btn"
                    style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.8em', padding: '2px 8px', cursor: 'pointer' }}
                >
                    Reset
                </button>
            )}
            <div className="eskf-tuning-title">🎨 Visualizer Controls</div>

            <div className="eskf-tuning-row" title="Adjusts the camera's field of view and proximity within the 3D ambisonic scene.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Zoom</span>
                    <input
                        type="range" min="20" max="160" step="1"
                        value={zoomFov}
                        onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                        className="eskf-slider"
                        data-testid="Zoom"
                        disabled={!isInsideView}
                        style={{ opacity: isInsideView ? 1 : 0.5 }}
                    />
                    <span className="eskf-value">{`${Math.round(zoomFov)}°`}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Scales the raw Ambisonic audio energy before it enters the visual ray-marching pipeline.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Gain</span>
                    <input
                        type="range" min="0" max="10" step="0.1"
                        value={gain}
                        onChange={(e) => onGainChange(parseFloat(e.target.value))}
                        className="eskf-slider"
                        data-testid="Gain"
                    />
                    <span className="eskf-value">{gain.toFixed(1)}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Sets the minimum audio energy required to render a cloud. Increase this to hide background room noise.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Threshold</span>
                    <input
                        type="range" min="0" max="0.5" step="0.005"
                        value={localParams.densityThreshold}
                        onChange={(e) => handleSlider('densityThreshold', e.target.value)}
                        className="eskf-slider"
                        data-testid="Threshold"
                    />
                    <span className="eskf-value">{localParams.densityThreshold.toFixed(3)}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Controls the physical thickness and opacity of the volumetric audio clouds.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Density</span>
                    <input
                        type="range" min="0.1" max="5.0" step="0.1"
                        value={localParams.densityMult}
                        onChange={(e) => handleSlider('densityMult', e.target.value)}
                        className="eskf-slider"
                        data-testid="Density"
                    />
                    <span className="eskf-value">{`${localParams.densityMult.toFixed(1)}x`}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Controls the glowing heat and brightness of the volume independently of its thickness.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Emission</span>
                    <input
                        type="range" min="0.1" max="5.0" step="0.1"
                        value={localParams.emissionMult}
                        onChange={(e) => handleSlider('emissionMult', e.target.value)}
                        className="eskf-slider"
                        data-testid="Emission"
                    />
                    <span className="eskf-value">{`${localParams.emissionMult.toFixed(1)}x`}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Shifts the color transfer function to prevent loud transient sounds from blowing out the visualizer into solid white.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Knee (Color)</span>
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={localParams.heatmapKnee}
                        onChange={(e) => handleSlider('heatmapKnee', e.target.value)}
                        className="eskf-slider"
                        data-testid="Knee (Color)"
                    />
                    <span className="eskf-value">{localParams.heatmapKnee.toFixed(2)}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Adjusts the geometric sharpness of the spatial audio lobes. Higher values create tighter, more focused clouds.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Edge Falloff</span>
                    <input
                        type="range" min="0.1" max="5.0" step="0.1"
                        value={localParams.edgeFalloff}
                        onChange={(e) => handleSlider('edgeFalloff', e.target.value)}
                        className="eskf-slider"
                        data-testid="Edge Falloff"
                    />
                    <span className="eskf-value">{localParams.edgeFalloff.toFixed(1)}</span>
                </label>
            </div>

            <div className="eskf-tuning-row" title="Controls how slowly the visual energy fades over time, creating lingering smoke trails that smooth out erratic flickering.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Dissipation</span>
                    <input
                        type="range" min="0" max="0.99" step="0.01"
                        value={localParams.dissipationRate}
                        onChange={(e) => handleSlider('dissipationRate', e.target.value)}
                        className="eskf-slider"
                        data-testid="Dissipation"
                    />
                    <span className="eskf-value">{localParams.dissipationRate.toFixed(2)}</span>
                </label>
            </div>
        </div>
    );
}
