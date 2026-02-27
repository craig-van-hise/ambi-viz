import type { QueueTrack } from '../audio/AudioEngine';

interface TrackQueueProps {
    tracks: QueueTrack[];
    currentIndex: number;
    onTrackSelect: (index: number) => void;
}

export function TrackQueue({ tracks, currentIndex, onTrackSelect }: TrackQueueProps) {
    if (tracks.length === 0) return null;

    return (
        <div className="track-queue">
            <div className="track-queue-title">Queue ({tracks.length})</div>
            <div className="track-queue-list">
                {tracks.map((track, i) => (
                    <button
                        key={i}
                        className={`track-queue-item ${i === currentIndex ? 'track-active' : ''}`}
                        onDoubleClick={() => onTrackSelect(i)}
                        title={track.name}
                    >
                        <span className="track-num">{i + 1}</span>
                        <span className="track-name">{track.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
