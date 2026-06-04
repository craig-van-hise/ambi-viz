import React, { useRef, useContext } from 'react';
import type { PlaybackState } from '../audio/AudioEngine';
import { OnboardingContext } from './onboarding/OnboardingContext';
import { AnimatedPointer } from './onboarding/AnimatedPointer';

interface TransportControlsProps {
  playbackState: PlaybackState;
  progress: number;
  onProgressChange: (p: number) => void;
  onSeek: (p: number) => void;
  activeTrack: { name: string, duration?: string | undefined, durationSec?: number };
  formatTime: (seconds: number) => string;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onShowSettings: () => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  playbackState,
  progress,
  onProgressChange,
  onSeek,
  activeTrack,
  formatTime,
  onPrev,
  onNext,
  onPlay,
  onPause,
  onStop,
  volume,
  onVolumeChange,
  isLooping,
  onToggleLoop,
  onShowSettings,
}) => {
  const isScrubbing = useRef(false);
  const onboarding = useContext(OnboardingContext);

  return (
    <div className="absolute bottom-0 left-0 w-full z-40 px-4 py-4 flex flex-col @2xl:flex-row items-center justify-between gap-y-3 gap-x-6">
      {/* Top Row (Narrow) / Center (Wide): Scrubber */}
      <div className="flex items-center gap-3 w-full @2xl:flex-1 @2xl:order-2 order-1">
        <span className="text-[10px] font-mono text-slate-400">{formatTime((progress / 100) * (activeTrack.durationSec || 0))}</span>
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative group/timeline flex items-center">
          <div className="absolute top-0 left-0 h-full bg-primary-dark rounded-full group-hover/timeline:bg-primary transition-colors" style={{ width: `${progress}%` }}></div>
          <div className="absolute size-3 bg-white rounded-full shadow opacity-0 group-hover/timeline:opacity-100 transition-opacity z-10" style={{ left: `calc(${progress}% - 6px)` }}></div>
          <input
            type="range"
            min="0" max="100"
            value={progress}
            onChange={(e) => {
              const p = Number(e.target.value);
              onProgressChange(p);
              onSeek(p);
            }}
            onMouseDown={() => isScrubbing.current = true}
            onMouseUp={() => isScrubbing.current = false}
            onTouchStart={() => isScrubbing.current = true}
            onTouchEnd={() => isScrubbing.current = false}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
        </div>
        <span className="text-[10px] font-mono text-slate-400">{activeTrack.duration || "00:00"}</span>
      </div>

      <div className="flex items-center justify-center flex-wrap gap-4 w-full @2xl:w-auto @2xl:contents order-2">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-2 px-3 h-11 bg-slate-800/40 border border-white/5 rounded-full text-slate-300 @2xl:order-1 shrink-0 shadow-xl backdrop-blur-sm">
          <button
            onClick={onPrev}
            className="transport-btn"
            title="Previous Track"
          >
            <span className="material-symbols-outlined text-xl">skip_previous</span>
          </button>
          
          <div className="relative">
            {onboarding?.currentStep === 'PLAYBACK' && (
              <div className="absolute bottom-full left-1/2 -translate-x-[40px] mb-8 z-50">
                <AnimatedPointer text="Step 3: Press Play" direction="down" />
              </div>
            )}
            <button
              onClick={() => {
                if (playbackState === 'playing') onPause();
                else onPlay();
                
                if (onboarding?.currentStep === 'PLAYBACK') {
                  onboarding.advanceStep();
                }
              }}
              className={`transport-btn ${playbackState === 'playing' ? 'transport-active' : ''}`}
              title={playbackState === 'playing' ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined text-2xl font-bold">
                {playbackState === 'playing' ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
          <button
            onClick={onStop}
            className={`transport-btn ${playbackState === 'stopped' && progress === 0 ? 'transport-active' : ''}`}
            title="Stop"
          >
            <span className="material-symbols-outlined text-xl">stop</span>
          </button>
          <button
            onClick={onNext}
            className="transport-btn"
            title="Next Track"
          >
            <span className="material-symbols-outlined text-xl">skip_next</span>
          </button>
        </div>

        {/* Right: Volume & Toggles */}
        <div className="flex items-center gap-4 px-5 h-11 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-400 @2xl:order-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2 group/volwrap">
            <span className="material-symbols-outlined text-lg group-hover/volwrap:text-primary transition-colors">volume_up</span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full relative flex items-center group/volume">
              <div className="absolute top-0 left-0 h-full bg-primary-dark rounded-full group-hover/volume:bg-primary transition-colors" style={{ width: `${volume}%` }}></div>
              <div className="absolute size-2.5 bg-white rounded-full shadow opacity-0 group-hover/volume:opacity-100 transition-opacity z-10" style={{ left: `calc(${volume}% - 5px)` }}></div>
              <input
                type="range"
                min="0" max="100"
                value={volume}
                onChange={(e) => { const v = Number(e.target.value); onVolumeChange(v); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
            </div>
          </div>
          <button
            onClick={onToggleLoop}
            className={`transport-btn transport-loop ${isLooping ? 'transport-active' : ''}`}
            title={isLooping ? "Loop: On" : "Loop: Off"}
          >
            <span className="material-symbols-outlined text-lg">repeat</span>
          </button>
          <button
            onClick={onShowSettings}
            className="transport-btn"
            title="Settings"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
