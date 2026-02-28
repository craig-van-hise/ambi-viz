import React from 'react';

export interface CameraUIState {
    yaw: number;
    pitch: number;
    roll: number;
    x: number;
    y: number;
    z: number;
}

interface CameraControlPanelProps {
    viewMode: 'inside' | 'outside';
    state: CameraUIState;
    onChange: (axis: keyof CameraUIState, value: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    isTracking?: boolean;
}

export const CameraControlPanel: React.FC<CameraControlPanelProps> = ({
    viewMode,
    state,
    onChange,
    onDragStart,
    onDragEnd,
    isTracking = false,
}) => {
    const isInside = viewMode === 'inside';

    return (
        <div className="camera-control-panel">
            <h4>
                Camera {isInside ? 'Orientation' : 'Position'}
            </h4>

            {isInside ? (
                <>
                    <ControlSlider
                        label="Yaw"
                        value={state.yaw}
                        min={-180}
                        max={180}
                        unit="°"
                        onChange={(v) => onChange('yaw', v)}
                        onMouseDown={onDragStart}
                        onMouseUp={onDragEnd}
                        disabled={isTracking}
                    />
                    <ControlSlider
                        label="Pitch"
                        value={state.pitch}
                        min={-90}
                        max={90}
                        unit="°"
                        onChange={(v) => onChange('pitch', v)}
                        onMouseDown={onDragStart}
                        onMouseUp={onDragEnd}
                        disabled={isTracking}
                    />
                    <ControlSlider
                        label="Roll"
                        value={state.roll}
                        min={-180}
                        max={180}
                        unit="°"
                        onChange={(v) => onChange('roll', v)}
                        onMouseDown={onDragStart}
                        onMouseUp={onDragEnd}
                        disabled={isTracking}
                    />
                </>
            ) : (
                <>
                    <ControlSlider
                        label="X"
                        value={state.x}
                        min={-10}
                        max={10}
                        step={0.1}
                        onChange={(v) => onChange('x', v)}
                        onMouseDown={onDragStart}
                        onMouseUp={onDragEnd}
                        disabled={isTracking}
                    />
                    <ControlSlider
                        label="Y"
                        value={state.y}
                        min={-10}
                        max={10}
                        step={0.1}
                        onChange={(v) => onChange('y', v)}
                        onMouseDown={onDragStart}
                        onMouseUp={onDragEnd}
                        disabled={isTracking}
                    />
                    <ControlSlider
                        label="Z"
                        value={state.z}
                        min={1}
                        max={20}
                        step={0.1}
                        onChange={(v) => onChange('z', v)}
                        onMouseDown={onDragStart}
                        onMouseUp={onDragEnd}
                        disabled={isTracking}
                    />
                </>
            )}
        </div>
    );
};

interface ControlSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (val: number) => void;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    disabled?: boolean;
}

const ControlSlider: React.FC<ControlSliderProps> = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    onChange,
    onMouseDown,
    onMouseUp,
    disabled = false,
}) => (
    <div className="camera-control-row">
        <span className="camera-control-label">{label}</span>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            // For touch devices
            onTouchStart={onMouseDown}
            onTouchEnd={onMouseUp}
            className="camera-control-slider"
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        />
        <span className="camera-control-value">
            {Math.round(value * 10) / 10}{unit}
        </span>
    </div>
);
