import React, { useRef } from 'react';
import type { QueueTrack } from '../audio/AudioEngine';

interface TrackQueueProps {
  width: number;
  onResizeStart: () => void;
  queue: QueueTrack[];
  currentIndex: number;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onTrackSelect: (index: number) => void;
  onTrackPlay: (index: number) => void;
  onRemoveTrack: (index: number, e: React.MouseEvent) => void;
  onClearQueue: () => void;
  onFilesQueued: (files: File[]) => void;
  isLoading: boolean;
}

export const TrackQueue: React.FC<TrackQueueProps> = ({
  width,
  onResizeStart,
  queue,
  currentIndex,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onTrackSelect,
  onTrackPlay,
  onRemoveTrack,
  onClearQueue,
  onFilesQueued,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside
      style={{ width }}
      className="h-full glass border-r border-primary/10 flex flex-col z-40 shrink-0 relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-slate-500/30 z-50 transition-colors"
        onMouseDown={onResizeStart}
      />
      <div className="p-4 border-b border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">queue_music</span>
          <h3 className="font-normal text-[11px] uppercase tracking-widest text-slate-400">Queue</h3>
        </div>
        {queue.length > 0 && (
          <button
            onClick={onClearQueue}
            className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {queue.map((track, idx) => (
          <div
            key={idx}
            onClick={() => onTrackSelect(idx)}
            onDoubleClick={() => onTrackPlay(idx)}
            className={`track-queue-item group relative flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${currentIndex === idx
              ? 'bg-primary/20 border-primary shadow-[0_0_15px_var(--color-primary)] text-white'
              : 'hover:bg-primary/5 border border-transparent'
              }`}
          >
            <div className={`flex items-center justify-center size-10 rounded shrink-0 ${currentIndex === idx ? 'bg-primary/20 text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-800 text-slate-400'
              }`}>
              <span className="material-symbols-outlined">{currentIndex === idx ? 'equalizer' : 'music_note'}</span>
            </div>
            <div className="flex-1 overflow-hidden track-name">
              <p className={`text-sm truncate normal-case ${currentIndex === idx ? 'font-bold text-white drop-shadow-md' : 'font-medium text-slate-300'}`}>
                {track.name || (track.file && track.file.name)}
              </p>
              <p className={`text-[10px] font-mono ${currentIndex === idx ? 'text-primary/60' : 'text-slate-400'}`}>
                {isLoading && currentIndex === idx ? (
                  <span className="flex items-center text-primary font-bold animate-pulse">
                    Loading
                    <span className="flex ml-0.5">
                      <span className="animate-[bounce_1.4s_infinite_0s] mx-[0.5px]">.</span>
                      <span className="animate-[bounce_1.4s_infinite_0.2s] mx-[0.5px]">.</span>
                      <span className="animate-[bounce_1.4s_infinite_0.4s] mx-[0.5px]">.</span>
                    </span>
                  </span>
                ) : (
                  <>{track.type || '-'} • {track.duration || '00:00'}</>
                )}
              </p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveTrack(idx, e); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 p-1 flex items-center justify-center shrink-0"
              title="Remove Track"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}

        {queue.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 flex flex-col items-center justify-center text-center p-8 m-2 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${isDragOver
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_20px_rgba(29,78,216,0.2)]'
              : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-500 hover:bg-slate-800/40'
              }`}
          >
            <div className={`size-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragOver ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'
              }`}>
              <span className="material-symbols-outlined text-3xl">upload_file</span>
            </div>
            <h4 className={`text-sm font-semibold mb-1 transition-colors ${isDragOver ? 'text-primary' : 'text-slate-300'}`}>
              {isDragOver ? 'Drop to Add' : 'Add Audio Files'}
            </h4>
            <p className="text-[10px] text-slate-500 normal-case mb-4">
              Drag and drop or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 opacity-60">
              {['.wav', '.amb', '.ogg', '.iamf', '.opus', '.bw64'].map(ext => (
                <span key={ext} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono text-slate-400 normal-case">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}

        {queue.length > 0 && !isDragOver && (
          <div className="mt-8 px-4 flex flex-col items-center justify-center text-center opacity-40">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-400">upload_file</span>
            <p className="text-xs normal-case text-slate-300">Drag more files to add to queue</p>
          </div>
        )}

        {queue.length > 0 && isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm m-2 border-2 border-primary border-dashed rounded-xl pointer-events-none animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-5xl text-primary animate-bounce">download</span>
              <p className="text-sm font-bold text-primary uppercase tracking-widest mt-2">Drop to Queue</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-primary/10 bg-background-dark/40">
        <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" multiple onChange={(e) => {
          if (e.target.files) onFilesQueued(Array.from(e.target.files));
        }} />
      </div>
    </aside>
  );
};
