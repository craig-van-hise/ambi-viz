import React from 'react';
import type { PlaybackState } from '../audio/AudioEngine';

interface FooterProps {
  playbackState: PlaybackState;
  currentIndex: number;
}

export const Footer: React.FC<FooterProps> = ({ playbackState, currentIndex }) => {
  let color = 'bg-slate-500';
  let label = 'Nothing loaded';
  let pulse = false;
  if (playbackState === 'loading') { color = 'bg-yellow-500'; label = 'Buffering'; pulse = true; }
  else if (playbackState === 'playing' || (playbackState === 'stopped' && currentIndex !== -1)) { color = 'bg-green-500'; label = 'Ready'; pulse = playbackState === 'playing'; }
  else if (playbackState === 'error') { color = 'bg-red-500'; label = 'Error'; }

  return (
    <footer className="h-8 bg-background-dark/90 border-t border-primary/10 flex items-center justify-between px-4 text-[10px] font-mono uppercase text-slate-500 z-50 shrink-0">
      <div className="flex items-center gap-6 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}></span>
          Audio Engine: {label}
        </span>
      </div>
      <div className="flex items-center justify-center flex-1">
      </div>
      <div className="flex items-center gap-6 flex-1 justify-end">
        <span className="text-primary normal-case">v0.9-beta</span>
      </div>
    </footer>
  );
};
