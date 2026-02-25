import { useState, useCallback, useRef, useEffect } from 'react';

interface ESKFTuningPanelProps {
    onParamsChange: (params: { tau?: number; R_scalar?: number; Q_scalar?: number }) => void;
    initialParams?: { tau: number; R_scalar: number; Q_scalar: number };
}

/**
 * Logarithmic scale mapping: converts linear slider t ∈ [0, 1] to value ∈ [min, max]
 * using: value = min * (max / min) ^ t
 */
function logScale(t: number, min: number, max: number): number {
    return min * Math.pow(max / min, t);
}

/**
 * Inverse log scale: converts value ∈ [min, max] to t ∈ [0, 1]
 */
function invLogScale(value: number, min: number, max: number): number {
    return Math.log(value / min) / Math.log(max / min);
}

/**
 * Format a number in scientific-ish notation for display
 */
function formatSci(value: number): string {
    if (value >= 0.01) return value.toFixed(4);
    return value.toExponential(2);
}

const R_MIN = 0.0001;
const R_MAX = 0.1;
const Q_MIN = 0.000001;
const Q_MAX = 0.5;

// Defaults matching ESKF constructor: sigmaMeas=0.05 → R=0.0025, sigmaGyro=0.5 → Q=0.25
const DEFAULT_TAU_MS = 45;
const DEFAULT_R = 0.0025;
const DEFAULT_Q = 0.25;

export function ESKFTuningPanel({ onParamsChange, initialParams }: ESKFTuningPanelProps) {
    const [tauMs, setTauMs] = useState(initialParams ? initialParams.tau * 1000 : DEFAULT_TAU_MS);
    const [rScalar, setRScalar] = useState(initialParams?.R_scalar ?? DEFAULT_R);
    const [qScalar, setQScalar] = useState(initialParams?.Q_scalar ?? DEFAULT_Q);

    // Debounce worker messages — send at most every 50ms
    const pendingRef = useRef<{ tau?: number; R_scalar?: number; Q_scalar?: number } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flush = useCallback(() => {
        if (pendingRef.current) {
            onParamsChange(pendingRef.current);
            pendingRef.current = null;
        }
    }, [onParamsChange]);

    const scheduleUpdate = useCallback((params: { tau?: number; R_scalar?: number; Q_scalar?: number }) => {
        pendingRef.current = { ...pendingRef.current, ...params };
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

    const handleTau = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const ms = parseInt(e.target.value, 10);
        setTauMs(ms);
        scheduleUpdate({ tau: ms / 1000 });
    }, [scheduleUpdate]);

    const handleR = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const t = parseFloat(e.target.value);
        const value = logScale(t, R_MIN, R_MAX);
        setRScalar(value);
        scheduleUpdate({ R_scalar: value });
    }, [scheduleUpdate]);

    const handleQ = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const t = parseFloat(e.target.value);
        const value = logScale(t, Q_MIN, Q_MAX);
        setQScalar(value);
        scheduleUpdate({ Q_scalar: value });
    }, [scheduleUpdate]);

    return (
        <div className="eskf-tuning-panel">
            <div className="eskf-tuning-title">⚙ ESKF Tuning</div>
            <div className="eskf-tuning-row" title="Offsets system delay. Increase until audio panning feels instantaneous. If the sound field 'rubber-bands' or overshoots when you abruptly stop your head, decrease this value.">
                <label className="eskf-label">
                    <span className="eskf-label-text">τ (Prediction)</span>
                    <input
                        type="range"
                        min={0}
                        max={150}
                        step={5}
                        value={tauMs}
                        onChange={handleTau}
                        className="eskf-slider"
                    />
                    <span className="eskf-value">{tauMs} ms</span>
                </label>
            </div>
            <div className="eskf-tuning-row" title="Trust in the webcam. Lower = faster response but captures more micro-jitter. Higher = smoother but can feel sluggish. Listen for rapid stutters in the audio field; increase until the stutter disappears.">
                <label className="eskf-label">
                    <span className="eskf-label-text">R (Meas. Noise)</span>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={invLogScale(rScalar, R_MIN, R_MAX)}
                        onChange={handleR}
                        className="eskf-slider"
                    />
                    <span className="eskf-value">{formatSci(rScalar)}</span>
                </label>
            </div>
            <div className="eskf-tuning-row" title="Trust in head momentum. Lower = assumes smooth, predictable movement. Higher = better tracking for sudden, erratic head whips. Increase if the audio feels like it drags behind your fast turns.">
                <label className="eskf-label">
                    <span className="eskf-label-text">Q (Proc. Noise)</span>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={invLogScale(qScalar, Q_MIN, Q_MAX)}
                        onChange={handleQ}
                        className="eskf-slider"
                    />
                    <span className="eskf-value">{formatSci(qScalar)}</span>
                </label>
            </div>
        </div>
    );
}
