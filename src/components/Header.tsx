import React from 'react';

interface HeaderProps {
  showQueue: boolean;
  onToggleQueue: () => void;
  showTransport: boolean;
  onToggleTransport: () => void;
  showControls: boolean;
  onToggleControls: () => void;
  onShowInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  showQueue,
  onToggleQueue,
  showTransport,
  onToggleTransport,
  showControls,
  onToggleControls,
  onShowInfo,
}) => {
  return (
    <header className="flex items-center justify-between border-b border-primary/10 px-6 py-1 bg-background-dark/80 backdrop-blur-md z-50 shrink-0">
      <div className="flex items-center gap-2">
        <div className="text-primary flex items-center mt-0.5">
          <span className="material-symbols-outlined text-4xl font-light">blur_on</span>
        </div>
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-slate-100 text-2xl font-bold leading-tight tracking-tight normal-case">AmbiViz</h2>
          <p className="text-primary/70 text-[10px] font-medium uppercase tracking-widest">Ambisonic Sound Field Visualization</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onShowInfo}
            title="About AmbiViz"
            className="flex items-center justify-center w-8 h-8 rounded-md transition-all border text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50"
          >
            <span className="material-symbols-outlined text-xl">info</span>
          </button>
          <button
            onClick={onToggleQueue}
            title="Toggle Queue"
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${showQueue
              ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
          >
            <span className="material-symbols-outlined text-xl">side_navigation</span>
          </button>
          <button
            onClick={onToggleTransport}
            title="Toggle Transport"
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${showTransport
              ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
          >
            <span className="material-symbols-outlined text-xl -rotate-90">side_navigation</span>
          </button>
          <button
            onClick={onToggleControls}
            title="Toggle Controls"
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${showControls
              ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
          >
            <span className="material-symbols-outlined text-xl scale-x-[-1]">side_navigation</span>
          </button>
        </div>
      </div>
    </header>
  );
};
