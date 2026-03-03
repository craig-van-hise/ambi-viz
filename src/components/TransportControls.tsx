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
    onSettingsClick?: () => void;
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
    onSettingsClick,
}: TransportControlsProps) {
    const hasMultipleTracks = queueSize > 1;
    const isLoading = playbackState === 'loading';
    const isError = playbackState === 'error';
    const isDisabled = isLoading || isError;

    return (
        <div className="transport-bar">
            {isError && <div className="transport-error-msg">⚠️ Ingestion Error</div>}

            <div className="transport-btns-row">
                <button
                    className="transport-btn"
                    onClick={onPrev}
                    title="Previous track"
                    disabled={!hasMultipleTracks || isDisabled}
                >
                    {isLoading ? '...' : '⏮'}
                </button>
                <button
                    className={`transport-btn ${playbackState === 'playing' ? 'transport-active' : ''}`}
                    onClick={playbackState === 'playing' ? onPause : onPlay}
                    title={isLoading ? 'Buffering...' : playbackState === 'playing' ? 'Pause' : 'Play'}
                    disabled={isDisabled}
                >
                    {isLoading ? '⏳' : playbackState === 'playing' ? '⏸' : '▶'}
                </button>
                <button
                    className="transport-btn"
                    onClick={onStop}
                    title="Stop (reset to beginning)"
                    disabled={playbackState === 'stopped' || isDisabled}
                >
                    ⏹
                </button>
                <button
                    className="transport-btn"
                    onClick={onNext}
                    title="Next track"
                    disabled={!hasMultipleTracks || isDisabled}
                >
                    ⏭
                </button>
                <button
                    className={`transport-btn transport-loop ${isLooping ? 'transport-active' : ''}`}
                    onClick={onLoopToggle}
                    title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
                    disabled={isDisabled}
                >
                    🔁
                </button>
                {onSettingsClick && (
                    <button
                        className="transport-btn"
                        onClick={onSettingsClick}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                )}
            </div>
            {isLoading && <span className="buffering-spinner">Buffering...</span>}
        </div>
    );
}

