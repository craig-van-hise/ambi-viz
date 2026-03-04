import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Tooltip = ({ children, content, title }: { children: React.ReactNode, content: string, title?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left - 16,
        y: rect.top + rect.height / 2
      });
    }
    setIsVisible(true);
  };

  return (
    <div 
      className="inline-flex items-center" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={() => setIsVisible(false)}
      ref={triggerRef}
    >
      {children}
      {isVisible && createPortal(
        <div 
          className="fixed z-[9999] w-64 p-3 bg-[#121212]/95 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-none backdrop-blur-md transform -translate-x-full -translate-y-1/2 flex flex-col gap-1.5"
          style={{ left: coords.x, top: coords.y }}
        >
          {title && <div className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">{title}</div>}
          <div className="text-[11px] text-slate-400 leading-relaxed normal-case">{content}</div>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-[#121212]/95 border-r border-t border-white/10 rotate-45"></div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default function App() {
  const [showQueue, setShowQueue] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'inside' | 'outside'>('inside');
  const [isCameraCollapsed, setIsCameraCollapsed] = useState(false);
  const [isVisualizerCollapsed, setIsVisualizerCollapsed] = useState(false);
  const [isESKFCollapsed, setIsESKFCollapsed] = useState(false);
  const [isViewTrackingCollapsed, setIsViewTrackingCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showTransport, setShowTransport] = useState(true);
  const [visualizationType, setVisualizationType] = useState<'volumetric' | 'sphere'>('volumetric');
  const [activeTrackId, setActiveTrackId] = useState(1);
  const [progress, setProgress] = useState(31);
  const [volume, setVolume] = useState(75);
  const [isLooping, setIsLooping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tracks = [
    { id: 1, name: "Spatial_Session_04.ambix", type: "ORDER 3", duration: "04:22", seconds: 262 },
    { id: 2, name: "Exterior_Ambience_B.wav", type: "ORDER 1", duration: "12:05", seconds: 725 },
    { id: 3, name: "Studio_Test_Signals.wav", type: "ORDER 3", duration: "01:00", seconds: 60 }
  ];

  const activeTrack = tracks.find(t => t.id === activeTrackId) || tracks[0];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const newWidth = Math.max(200, Math.min(e.clientX, 600));
        setLeftWidth(newWidth);
      } else if (isDraggingRight) {
        const newWidth = Math.max(200, Math.min(window.innerWidth - e.clientX, 600));
        setRightWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

  return (
    <div className={`bg-background-dark font-ui uppercase text-slate-100 overflow-hidden h-screen flex flex-col ${isDraggingLeft || isDraggingRight ? 'select-none cursor-col-resize' : ''}`}>
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-primary/10 px-6 py-3 bg-background-dark/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <span className="material-symbols-outlined text-3xl">blur_on</span>
          </div>
          <div>
            <h2 className="font-display text-slate-100 text-2xl font-bold leading-tight tracking-tight normal-case">AmbiViz</h2>
            <p className="text-primary/70 text-xs font-medium uppercase tracking-widest">Spherical Harmonics Visualization (Order 3)</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowQueue(!showQueue)}
              title="Toggle Queue"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${
                showQueue 
                  ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50' 
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">side_navigation</span>
            </button>
            <button 
              onClick={() => setShowTransport(!showTransport)}
              title="Toggle Transport"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${
                showTransport 
                  ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50' 
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl -rotate-90">side_navigation</span>
            </button>
            <button 
              onClick={() => setShowControls(!showControls)}
              title="Toggle Controls"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${
                showControls 
                  ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50' 
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl scale-x-[-1]">side_navigation</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        {/* Left Sidebar: Queue */}
        {showQueue && (
          <aside style={{ width: leftWidth }} className="h-full glass border-r border-primary/10 flex flex-col z-40 shrink-0 relative">
            <div 
              className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-slate-500/30 z-50 transition-colors"
              onMouseDown={() => setIsDraggingLeft(true)}
            />
            <div className="p-4 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">queue_music</span>
                <h3 className="font-normal text-[11px] uppercase tracking-widest text-slate-500">Queue</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* Loaded Tracks */}
              {tracks.map((track) => (
                <div 
                  key={track.id}
                  onClick={() => setActiveTrackId(track.id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                    activeTrackId === track.id 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'hover:bg-primary/5 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center justify-center size-10 rounded shrink-0 ${
                    activeTrackId === track.id ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined">{activeTrackId === track.id ? 'equalizer' : 'music_note'}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm truncate normal-case ${activeTrackId === track.id ? 'font-semibold text-slate-100' : 'font-medium text-slate-300'}`}>
                      {track.name}
                    </p>
                    <p className={`text-[10px] font-mono ${activeTrackId === track.id ? 'text-primary/60' : 'text-slate-500'}`}>
                      {track.type} • {track.duration}
                    </p>
                  </div>
                  {activeTrackId === track.id && (
                    <span className="material-symbols-outlined text-primary text-sm shrink-0">bar_chart</span>
                  )}
                </div>
              ))}

              {/* Empty State */}
              <div className="mt-8 px-4 flex flex-col items-center justify-center text-center opacity-40">
                <span className="material-symbols-outlined text-4xl mb-2">upload_file</span>
                <p className="text-xs normal-case">Drag more files to add to queue</p>
              </div>
            </div>
            <div className="p-4 border-t border-primary/10 bg-background-dark/40">
              <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-primary-dark text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(29,78,216,0.3)] hover:bg-primary-dark/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">upload</span>
                Add Track
              </button>
            </div>
          </aside>
        )}

        {/* Central Visualization Area */}
        <section className="flex-1 relative canvas-bg overflow-hidden min-w-0 @container">
          {/* 3D Canvas Background */}
          <div className="absolute inset-0 z-0 opacity-40">
            <div 
              className="w-full h-full bg-cover bg-center" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDUEi7cIiORIcRZu03gmon-Qj2UwQyoCyMJJnQu9baw_jElvZgAhMXA07vEpQUHP3mZM45AuJ4n--KlESwiO0sgsvurPR2Eh7x4R4yTb5aAm-HYFBEPoqqApD_ip4OlGFWcvBkzi_NR8aTOTEDXfvQq-A9jb-5Qg_CUh_k6tAnNlgewlc46lMEh3FRVuxJknWXv9Dkfds0hXnzqoY9FdQOJbZTSpWUJbbSMVs7cbv3lMEiYTVEjH1FTYFJFad8r4bOibd5Z-oy0468')" }}
            ></div>
          </div>

          {/* Transport Bar */}
          {showTransport && (
            <div className="absolute bottom-0 left-0 w-full z-40 px-4 py-4 flex flex-col @2xl:flex-row items-center justify-between gap-y-3 gap-x-6">
              {/* Top Row (Narrow) / Center (Wide): Scrubber */}
              <div className="flex items-center gap-3 w-full @2xl:flex-1 @2xl:order-2 order-1">
                <span className="text-[10px] font-mono text-slate-500">{formatTime((progress / 100) * activeTrack.seconds)}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative group/timeline flex items-center">
                  <div className="absolute top-0 left-0 h-full bg-primary-dark rounded-full group-hover/timeline:bg-primary transition-colors" style={{ width: `${progress}%` }}></div>
                  <div className="absolute size-3 bg-white rounded-full shadow opacity-0 group-hover/timeline:opacity-100 transition-opacity z-10" style={{ left: `calc(${progress}% - 6px)` }}></div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-500">{activeTrack.duration}</span>
              </div>

              <div className="flex items-center justify-center flex-wrap gap-4 w-full @2xl:w-auto @2xl:contents order-2">
                {/* Left: Playback Controls */}
                <div className="flex items-center gap-3 px-5 h-11 bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-300 @2xl:order-1 shrink-0 shadow-lg">
                  <button className="hover:text-primary transition-colors flex items-center justify-center"><span className="material-symbols-outlined text-xl">skip_previous</span></button>
                  <button 
                    onClick={() => { setIsPlaying(!isPlaying); if (progress === 0 && !isPlaying) setProgress(1); }}
                    className={`flex items-center justify-center size-9 rounded-full transition-all active:scale-95 ${
                      isPlaying 
                        ? 'bg-primary-dark text-white shadow-[0_0_15px_rgba(29,78,216,0.4)]' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl font-bold">{isPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button 
                    onClick={() => { setIsPlaying(false); setProgress(0); }}
                    className={`transition-colors flex items-center justify-center ${(!isPlaying && progress === 0) ? 'text-primary' : 'hover:text-primary'}`}
                  >
                    <span className="material-symbols-outlined text-xl">stop</span>
                  </button>
                  <button className="hover:text-primary transition-colors flex items-center justify-center"><span className="material-symbols-outlined text-xl">skip_next</span></button>
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
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsLooping(!isLooping)}
                    className={`transition-colors flex items-center justify-center ${isLooping ? 'text-primary' : 'hover:text-primary'}`}
                  >
                    <span className="material-symbols-outlined text-lg">repeat</span>
                  </button>
                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="hover:text-primary transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-lg">settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar: Controls */}
        {showControls && (
          <aside style={{ width: rightWidth }} className="h-full glass border-l border-primary/10 flex flex-col z-40 shrink-0 relative">
            <div 
              className="absolute top-0 -left-1 w-2 h-full cursor-col-resize hover:bg-slate-500/30 z-50 transition-colors"
              onMouseDown={() => setIsDraggingRight(true)}
            />
            <div className="flex-1 overflow-y-auto pb-20">
              {/* View & Tracking Section */}
            <div className="px-6 py-3 border-b border-primary/10 bg-primary/5">
              <div 
                className={`flex items-center justify-between cursor-pointer select-none group ${!isViewTrackingCollapsed ? 'mb-4' : ''}`}
                onClick={() => setIsViewTrackingCollapsed(!isViewTrackingCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm text-slate-500 transition-transform ${isViewTrackingCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                  <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-600 group-hover:text-slate-400 transition-colors">View & Tracking</h3>
                </div>
              </div>
              
              {!isViewTrackingCollapsed && (
                <div className="space-y-4 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300 normal-case">Visualization</span>
                    <div className="flex p-1 bg-slate-800/80 rounded-lg border border-white/5 shadow-inner">
                      <button 
                        onClick={() => setVisualizationType('volumetric')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${visualizationType === 'volumetric' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >Volumetric</button>
                      <button 
                        onClick={() => setVisualizationType('sphere')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${visualizationType === 'sphere' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >Sphere</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300 normal-case">View Mode</span>
                    <div className="flex p-1 bg-slate-800/80 rounded-lg border border-white/5 shadow-inner">
                      <button 
                        onClick={() => setViewMode('inside')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${viewMode === 'inside' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >Inside</button>
                      <button 
                        onClick={() => setViewMode('outside')}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${viewMode === 'outside' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                      >Outside</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300 normal-case">Head Tracking</span>
                    <button 
                      onClick={() => setIsTracking(!isTracking)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        isTracking 
                          ? 'bg-green-600 text-white hover:bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.3)]' 
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">videocam</span>
                      <span>{isTracking ? 'Tracking Active' : 'Start Tracking'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Orientation / Position */}
            <div className="px-6 py-3 border-b border-primary/10">
              <div 
                className={`flex items-center justify-between cursor-pointer select-none group ${!isCameraCollapsed ? 'mb-4' : ''}`}
                onClick={() => setIsCameraCollapsed(!isCameraCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm text-slate-500 transition-transform ${isCameraCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                  <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-600 group-hover:text-slate-400 transition-colors">
                    {viewMode === 'inside' ? 'Camera Orientation' : 'Camera Position'}
                  </h3>
                </div>
                <button 
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Reset
                </button>
              </div>
              
              {!isCameraCollapsed && (
                <div className="space-y-4 pb-1">
                  {viewMode === 'inside' ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                          <span>Yaw</span>
                          <span className="text-primary font-medium">12.5°</span>
                        </div>
                        <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={60} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                          <span>Pitch</span>
                          <span className="text-primary font-medium">-4.0°</span>
                        </div>
                        <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={45} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                          <span>Roll</span>
                          <span className="text-primary font-medium">0.0°</span>
                        </div>
                        <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={50} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                          <span>X</span>
                          <span className="text-primary font-medium">0.50</span>
                        </div>
                        <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="100" defaultValue={50} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                          <span>Y</span>
                          <span className="text-primary font-medium">0.25</span>
                        </div>
                        <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="100" defaultValue={25} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                          <span>Z</span>
                          <span className="text-primary font-medium">0.75</span>
                        </div>
                        <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="100" defaultValue={75} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Visualizer Controls */}
            <div className="px-6 py-3 border-b border-primary/10">
              <div 
                className={`flex items-center justify-between cursor-pointer select-none group ${!isVisualizerCollapsed ? 'mb-4' : ''}`}
                onClick={() => setIsVisualizerCollapsed(!isVisualizerCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm text-slate-500 transition-transform ${isVisualizerCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                  <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-600 group-hover:text-slate-400 transition-colors">Visualizer Controls</h3>
                </div>
                <button 
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Reset
                </button>
              </div>
              
              {!isVisualizerCollapsed && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 pb-1">
                  <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Zoom" content="Adjusts the camera's field of view and proximity within the 3D ambisonic scene.">
                      <span className="hover:text-slate-300 transition-colors">Zoom</span>
                    </Tooltip>
                    <span className="text-primary font-medium">1.2</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={20} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Gain" content="Scales the raw Ambisonic audio energy before it enters the visual ray-marching pipeline.">
                      <span className="hover:text-slate-300 transition-colors">Gain</span>
                    </Tooltip>
                    <span className="text-primary font-medium">0.8</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={40} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Threshold" content="Sets the minimum audio energy required to render a cloud. Increase this to hide background room noise.">
                      <span className="hover:text-slate-300 transition-colors">Threshold</span>
                    </Tooltip>
                    <span className="text-primary font-medium">0.1</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={10} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Density" content="Controls the physical thickness and opacity of the volumetric audio clouds.">
                      <span className="hover:text-slate-300 transition-colors">Density</span>
                    </Tooltip>
                    <span className="text-primary font-medium">50</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={50} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Emission" content="Controls the glowing heat and brightness of the volume independently of its thickness.">
                      <span className="hover:text-slate-300 transition-colors">Emission</span>
                    </Tooltip>
                    <span className="text-primary font-medium">1.5</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={75} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Knee (Color)" content="Shifts the color transfer function to prevent loud transient sounds from blowing out the visualizer into solid white.">
                      <span className="hover:text-slate-300 transition-colors">Knee</span>
                    </Tooltip>
                    <span className="text-primary font-medium">0.5</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={50} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Edge Falloff" content="Adjusts the geometric sharpness of the spatial audio lobes. Higher values create tighter, more focused clouds.">
                      <span className="hover:text-slate-300 transition-colors">Edge Falloff</span>
                    </Tooltip>
                    <span className="text-primary font-medium">0.8</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={80} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Dissipation" content="Controls how slowly the visual energy fades over time, creating lingering smoke trails that smooth out erratic flickering.">
                      <span className="hover:text-slate-300 transition-colors">Dissipation</span>
                    </Tooltip>
                    <span className="text-primary font-medium">0.2</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue={20} />
                </div>
              </div>
              )}
            </div>

            {/* ESKF Tuning Section */}
            <div className="px-6 py-3">
              <div 
                className={`flex items-center justify-between cursor-pointer select-none group ${!isESKFCollapsed ? 'mb-4' : ''}`}
                onClick={() => setIsESKFCollapsed(!isESKFCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm text-slate-500 transition-transform ${isESKFCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                  <Tooltip title="Webcam ESKF Tuning" content="Adjusts the Error-State Kalman Filter (ESKF) parameters that fuse webcam tracking data for responsive, low-latency head orientation. Use these settings to balance smoothness against responsiveness.">
                    <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-600 hover:text-slate-300 transition-colors">ESKF Tuning</h3>
                  </Tooltip>
                </div>
                <button 
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Reset
                </button>
              </div>
              
              {!isESKFCollapsed && (
                <div className="space-y-4 pb-1">
                  <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="τ (Prediction)" content="Offsets system delay. Increase until audio panning feels instantaneous. If the sound field 'rubber-bands' or overshoots when you abruptly stop your head, decrease this value.">
                      <span className="hover:text-slate-300 transition-colors">τ (Time Constant)</span>
                    </Tooltip>
                    <span className="text-primary font-medium">0.02s</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue="20"/>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="R (Measurement Noise)" content="Trust in the webcam. Lower = faster response but captures more micro-jitter. Higher = smoother but can feel sluggish. Listen for rapid stutters in the audio field; increase until the stutter disappears.">
                      <span className="hover:text-slate-300 transition-colors">R (Meas Noise)</span>
                    </Tooltip>
                    <span className="text-primary font-medium">1e-4</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue="40"/>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-normal normal-case text-slate-500">
                    <Tooltip title="Q (Process Noise)" content="Trust in head momentum. Lower = assumes smooth, predictable movement. Higher = better tracking for sudden, erratic head whips. Increase if the audio feels like it drags behind your fast turns.">
                      <span className="hover:text-slate-300 transition-colors">Q (Proc Noise)</span>
                    </Tooltip>
                    <span className="text-primary font-medium">1e-6</span>
                  </div>
                  <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" defaultValue="10"/>
                </div>
              </div>
              )}
            </div>
            </div>
          </aside>
        )}
      </main>

      {/* Footer Stats */}
      <footer className="h-8 bg-background-dark/90 border-t border-primary/10 flex items-center justify-between px-4 text-[10px] font-mono uppercase text-slate-500 z-50 shrink-0">
        <div className="flex items-center gap-6 flex-1">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span> Audio Engine: Ready</span>
        </div>
        <div className="flex items-center justify-center flex-1">
        </div>
        <div className="flex items-center gap-6 flex-1 justify-end">
          <span className="text-primary">v1.2.4-stable</span>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">Select HRTF</label>
                <select className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 normal-case">
                  <option>MIT KEMAR</option>
                  <option>IRCAM Listen</option>
                  <option>SADIE II</option>
                </select>
                <p className="text-xs text-slate-500 mt-2 normal-case">Head-Related Transfer Function used for binaural rendering.</p>
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
