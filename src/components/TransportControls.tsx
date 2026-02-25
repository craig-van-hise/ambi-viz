import type { PlaybackState } from '../audio/AudioEngine';

interface TransportControlsProps {
    playbackState: PlaybackState;
    isLooping: boolean;
    queueSize: number;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onLoopToggle: () => void;
    onPrev: () => void;
    onNext: () => void;
}

export function TransportControls({
    playbackState,
    isLooping,
    queueSize,
    onPlay,
    onPause,
    onStop,
    onLoopToggle,
    onPrev,
    onNext,
}: TransportControlsProps) {
    const hasMultipleTracks = queueSize > 1;

    return (
        <div className="transport-bar">
            <button
                className="transport-btn"
                onClick={onPrev}
                title="Previous track"
                disabled={!hasMultipleTracks}
            >
                ⏮
            </button>
            <button
                className={`transport-btn ${playbackState === 'playing' ? 'transport-active' : ''}`}
                onClick={onPlay}
                title="Play"
                disabled={playbackState === 'playing'}
            >
                ▶
            </button>
            <button
                className={`transport-btn ${playbackState === 'paused' ? 'transport-active' : ''}`}
                onClick={onPause}
                title="Pause"
                disabled={playbackState === 'paused' || playbackState === 'stopped'}
            >
                ⏸
            </button>
            <button
                className="transport-btn"
                onClick={onStop}
                title="Stop (reset to beginning)"
                disabled={playbackState === 'stopped'}
            >
                ⏹
            </button>
            <button
                className="transport-btn"
                onClick={onNext}
                title="Next track"
                disabled={!hasMultipleTracks}
            >
                ⏭
            </button>
            <button
                className={`transport-btn transport-loop ${isLooping ? 'transport-active' : ''}`}
                onClick={onLoopToggle}
                title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
            >
                🔁
            </button>
        </div>
    );
}

