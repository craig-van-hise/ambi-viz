import type { QueueTrack, PlaybackState } from '../audio/AudioEngine';

interface TrackQueueProps {
    tracks: QueueTrack[];
    currentIndex: number;
    playbackState: PlaybackState;
    onTrackSelect: (index: number) => void;
}

export function TrackQueue({ tracks, currentIndex, playbackState, onTrackSelect }: TrackQueueProps) {
    return (
        <div className="track-queue">
            <div className="track-queue-title">Queue {tracks.length > 0 ? `(${tracks.length})` : ''}</div>
            <div className="track-queue-list">
                {tracks.length === 0 ? (
                    <div className="track-queue-item" style={{ justifyContent: 'center', opacity: 0.5, cursor: 'default' }}>
                        No tracks loaded
                    </div>
                ) : (
                    tracks.map((track, i) => {
                        const isActive = i === currentIndex;
                        const isLoading = isActive && playbackState === 'loading';

                        return (
                            <button
                                key={i}
                                className={`track-queue-item ${isActive ? 'track-active' : ''} ${isLoading ? 'loading' : ''}`}
                                onDoubleClick={() => onTrackSelect(i)}
                                title={track.name}
                            >
                                <span className="track-num">
                                    {isLoading ? '⏳' : i + 1}
                                </span>
                                <span className="track-name">{track.name}</span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
