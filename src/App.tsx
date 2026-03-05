import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './App.css';
import { HrtfSelector } from './components/HrtfSelector';
import { AudioEngine } from './audio/AudioEngine';
import type { PlaybackState, QueueTrack } from './audio/AudioEngine';
import { AmbiScene } from './visualizer/AmbiScene';
import type { ViewMode, VisualizationMode } from './visualizer/AmbiScene';
import { isSupportedAudioFile } from './utils/fileUtils';
import { Throttle } from './utils/Throttle';
import { HeadTrackingService } from './HeadTrackingService';
import { loadState, debouncedSave } from './utils/persistence';
import type { PersistedState } from './utils/persistence';
import { DEFAULT_VISUAL_PARAMS } from './components/VisualizerControls';
import type { VisualParams } from './components/VisualizerControls';
import type { CameraUIState } from './components/CameraControlPanel';
import { InfoModal } from './components/InfoModal';

function readDirectoryRecursive(entry: FileSystemDirectoryEntry): Promise<File[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader();
    const allFiles: File[] = [];
    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(allFiles);
          return;
        }
        for (const e of entries) {
          if (e.isFile) {
            const file = await new Promise<File>((res) =>
              (e as FileSystemFileEntry).file(res)
            );
            if (isSupportedAudioFile(file)) {
              allFiles.push(file);
            }
          } else if (e.isDirectory) {
            const subFiles = await readDirectoryRecursive(e as FileSystemDirectoryEntry);
            allFiles.push(...subFiles);
          }
        }
        readBatch();
      });
    };
    readBatch();
  });
}

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
          className="fixed z-[9999] w-80 p-4 bg-[#121212]/95 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-none backdrop-blur-md transform -translate-x-full -translate-y-1/2 flex flex-col gap-2"
          style={{ left: coords.x, top: coords.y }}
        >
          {title && <div className="text-[12px] font-bold text-slate-200 uppercase tracking-wider">{title}</div>}
          <div className="text-sm text-slate-400 leading-relaxed normal-case">{content}</div>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-[#121212]/95 border-r border-t border-white/10 rotate-45"></div>
        </div>,
        document.body
      )}
    </div>
  );
};

const DEFAULT_INSIDE_ZOOM = 150;
const DEFAULT_OUTSIDE_ZOOM = 100;

export default function App() {
  const [persisted] = useState(() => loadState());
  const [audioEngine] = useState(() => new AudioEngine());
  const [headTracking] = useState(() => new HeadTrackingService());
  const [isTrackingCam, setIsTrackingCam] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AmbiScene | null>(null);
  const [insideGain, setInsideGain] = useState(persisted.insideGain);
  const [outsideGain, setOutsideGain] = useState(persisted.outsideGain);
  const [viewMode, setViewMode] = useState<ViewMode>('outside');
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('volumetric');
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [isLooping, setIsLooping] = useState(false);
  const [insideZoomFov, setInsideZoomFov] = useState(DEFAULT_INSIDE_ZOOM);
  const [outsideZoomFov, setOutsideZoomFov] = useState(DEFAULT_OUTSIDE_ZOOM);

  const [cameraUIState, setCameraUIState] = useState<CameraUIState>({
    yaw: 0, pitch: 0, roll: 0, x: 0, y: 3, z: 0.8,
  });

  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [eskfParams, setEskfParams] = useState(persisted.eskf);
  const [visualParams, setVisualParams] = useState<VisualParams>(persisted.visualParams);
  const [hrtfUrl, setHrtfUrl] = useState(persisted.hrtfUrl);

  const throttleRef = useRef(new Throttle(24));
  const persistRef = useRef<PersistedState>(persisted);

  const [showQueue, setShowQueue] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isCameraCollapsed, setIsCameraCollapsed] = useState(true);
  const [isVisualizerCollapsed, setIsVisualizerCollapsed] = useState(true);
  const [isESKFCollapsed, setIsESKFCollapsed] = useState(true);
  const [isViewTrackingCollapsed, setIsViewTrackingCollapsed] = useState(false);
  const [showTransport, setShowTransport] = useState(true);
  const [volume, setVolume] = useState(75);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScrubbing = useRef(false);

  const activeTrack = queue[currentIndex] || queue[0] || { id: -1, name: "No Track", durationSec: 0, duration: "00:00", type: "-" };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const persistState = useCallback((partial: Partial<PersistedState>) => {
    persistRef.current = { ...persistRef.current, ...partial };
    debouncedSave(persistRef.current);
  }, []);

  const handleCameraReset = useCallback(() => {
    if (viewMode === 'inside') {
      setCameraUIState(prev => ({ ...prev, yaw: 0, pitch: 0, roll: 0 }));
      if (sceneRef.current) {
        sceneRef.current.updateFromUI('yaw', 0);
        sceneRef.current.updateFromUI('pitch', 0);
        sceneRef.current.updateFromUI('roll', 0);
      }
      setInsideGain(3.0);
      persistState({ insideGain: 3.0 });
      handleZoomChange(DEFAULT_INSIDE_ZOOM);
    } else {
      setCameraUIState(prev => ({ ...prev, x: 0, y: 3, z: 0.8 }));
      if (sceneRef.current) {
        sceneRef.current.updateFromUI('x', 0);
        sceneRef.current.updateFromUI('y', 3);
        sceneRef.current.updateFromUI('z', 0.8);
      }
      setOutsideGain(3.0);
      persistState({ outsideGain: 3.0 });
      handleZoomChange(DEFAULT_OUTSIDE_ZOOM);
    }
  }, [viewMode, persistState]);

  const handleESKFReset = useCallback(() => {
    const defaults = { tau: 0.125, R_scalar: 0.000938, Q_scalar: 0.25 };
    setEskfParams(defaults);
    persistState({ eskf: defaults });
    headTracking.updateESKFParams(defaults);
  }, [headTracking, persistState]);

  useEffect(() => { headTracking.init(); }, [headTracking]);

  useEffect(() => {
    audioEngine.onStateChange = (state) => setPlaybackState(state);
    audioEngine.onTrackChange = (index) => setCurrentIndex(index);
    return () => {
      audioEngine.onStateChange = undefined;
      audioEngine.onTrackChange = undefined;
    };
  }, [audioEngine]);

  useEffect(() => {
    if (audioEngine.obrDecoder && hrtfUrl !== '/hrtf/MIT_KEMAR_Normal.sofa') {
      audioEngine.obrDecoder.loadSofa(hrtfUrl).catch(console.error);
    }
  }, [audioEngine.obrDecoder]);

  const handleFilesQueued = useCallback(async (files: File[]) => {
    const indices = await audioEngine.queueFiles(files);
    setQueue([...audioEngine.queue]);
    if (audioEngine.currentIndex === -1 && indices.length > 0) {
      await audioEngine.loadTrack(indices[0]);
      setCurrentIndex(indices[0]);
      if (audioEngine.obrDecoder) headTracking.attachDecoder(audioEngine.obrDecoder);
    }
  }, [audioEngine, headTracking]);

  const handleHrtfSelect = useCallback(async (url: string) => {
    setHrtfUrl(url);
    persistState({ hrtfUrl: url });
    if (audioEngine.obrDecoder) {
      try { await audioEngine.obrDecoder.loadSofa(url); } catch (e) { console.error(e); }
    }
  }, [audioEngine, persistState]);

  const handleTrackSelect = useCallback(async (index: number) => {
    if (audioEngine.playbackState === 'loading') return;
    try {
      if (audioEngine.currentIndex !== index) {
        audioEngine.stop();
        await audioEngine.loadTrack(index);
      }
      // currentIndex is now updated via onTrackChange subscription
    } catch (error) { console.error(error); }
  }, [audioEngine]);

  const handleTrackPlay = useCallback(async (index: number) => {
    if (audioEngine.playbackState === 'loading') return;
    try {
      if (audioEngine.currentIndex !== index) {
        await handleTrackSelect(index);
      }
      if (audioEngine.playbackState !== 'error') audioEngine.play();
    } catch (error) { console.error(error); }
  }, [audioEngine, handleTrackSelect]);

  const handleRemoveTrack = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.removeTrack(index);
    setQueue([...audioEngine.queue]);
  }, [audioEngine]);

  const handleClearQueue = useCallback(() => {
    audioEngine.clearQueue();
    setQueue([]);
  }, [audioEngine]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const items = e.dataTransfer.items;
    const collected: File[] = [];
    if (items && items.length > 0) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }
      if (entries.length > 0) {
        for (const entry of entries) {
          if (entry.isDirectory) {
            const files = await readDirectoryRecursive(entry as FileSystemDirectoryEntry);
            collected.push(...files);
          } else if (entry.isFile) {
            const file = await new Promise<File>((res) => (entry as FileSystemFileEntry).file(res));
            if (isSupportedAudioFile(file)) collected.push(file);
          }
        }
      }
    }
    if (collected.length === 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (isSupportedAudioFile(file)) collected.push(file);
      }
    }
    if (collected.length > 0) {
      collected.sort((a, b) => a.name.localeCompare(b.name));
      handleFilesQueued(collected);
    } else {
      alert('No supported audio files found (.wav, .ambix, .ogg, .iamf, .opus)');
    }
  }, [handleFilesQueued]);

  const handleESKFParams = useCallback((params: { tau?: number; R_scalar?: number; Q_scalar?: number }) => {
    headTracking.updateESKFParams(params);
    setEskfParams(prev => {
      const updated = { ...prev, ...params };
      persistState({ eskf: updated });
      return updated;
    });
  }, [headTracking, persistState]);

  const handleVisualParamsChange = useCallback((params: Partial<VisualParams>) => {
    setVisualParams(prev => {
      const updated = { ...prev, ...params };
      persistState({ visualParams: updated });
      return updated;
    });
  }, [persistState]);

  const handleVisualReset = useCallback(() => {
    setVisualParams(DEFAULT_VISUAL_PARAMS);
    handleZoomChange(viewMode === 'inside' ? DEFAULT_INSIDE_ZOOM : DEFAULT_OUTSIDE_ZOOM);
    setInsideGain(3.0);
    setOutsideGain(3.0);
    persistState({ visualParams: DEFAULT_VISUAL_PARAMS, insideGain: 3.0, outsideGain: 3.0 });
  }, [persistState]);

  const handleGainChange = useCallback((newGain: number) => {
    if (viewMode === 'inside') { setInsideGain(newGain); persistState({ insideGain: newGain }); }
    else { setOutsideGain(newGain); persistState({ outsideGain: newGain }); }
  }, [viewMode, persistState]);

  const handleZoomChange = useCallback((newFov: number) => {
    if (viewMode === 'inside') {
      if (Math.abs(insideZoomFov - newFov) < 0.01) return;
      setInsideZoomFov(newFov);
    } else {
      if (Math.abs(outsideZoomFov - newFov) < 0.01) return;
      setOutsideZoomFov(newFov);
    }
    if (sceneRef.current) sceneRef.current.setFov(newFov, 'ui');
  }, [viewMode, insideZoomFov, outsideZoomFov]);



  const handleCameraUIChange = useCallback((axis: keyof CameraUIState, value: number) => {
    setCameraUIState(prev => ({ ...prev, [axis]: value }));
    if (sceneRef.current) sceneRef.current.updateFromUI(axis, value);
  }, []);

  const handlePlay = useCallback(() => audioEngine.play(), [audioEngine]);
  const handlePause = useCallback(() => audioEngine.pause(), [audioEngine]);
  const handleStop = useCallback(() => { audioEngine.stop(); setProgress(0); }, [audioEngine]);
  const handlePrev = useCallback(async () => { await audioEngine.prev(); }, [audioEngine]);
  const handleNext = useCallback(async () => { await audioEngine.next(); }, [audioEngine]);
  const handleLoopToggle = useCallback(() => { const newLoop = !isLooping; audioEngine.setLoop(newLoop); setIsLooping(newLoop); }, [audioEngine, isLooping]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Allow Spacebar to toggle playback unless the user is typing in an input/textarea
      if (e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault(); // Prevent scrolling page or triggering focused buttons
          if (audioEngine.playbackState === 'playing') handlePause();
          else handlePlay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioEngine, handlePlay, handlePause]);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new AmbiScene(containerRef.current, 0.6);
    sceneRef.current = scene;
    scene.setDensityThreshold(visualParams.densityThreshold);
    scene.setDensityMult(visualParams.densityMult);
    scene.setEmissionMult(visualParams.emissionMult);
    scene.setHeatmapKnee(visualParams.heatmapKnee);
    scene.setEdgeFalloff(visualParams.edgeFalloff);
    scene.setDissipationRate(visualParams.dissipationRate);

    // Callbacks will be synchronized in separate effects to avoid stale closures
    return () => scene.destroy();
  }, []); // Run on mount

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.onCameraStateChange = (state) => {
        setCameraUIState(prev => {
          if (Math.abs(prev.yaw - state.yaw) < 0.01 && Math.abs(prev.pitch - state.pitch) < 0.01 && Math.abs(prev.roll - state.roll) < 0.01 &&
            Math.abs(prev.x - state.x) < 0.001 && Math.abs(prev.y - state.y) < 0.001 && Math.abs(prev.z - state.z) < 0.001) {
            return prev;
          }
          return state;
        });
      };
    }
  }, []); // setCameraUIState is stable

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.onFovChange = (fov) => handleZoomChange(fov);
    }
  }, [handleZoomChange]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setDensityThreshold(visualParams.densityThreshold);
      sceneRef.current.setDensityMult(visualParams.densityMult);
      sceneRef.current.setEmissionMult(visualParams.emissionMult);
      sceneRef.current.setHeatmapKnee(visualParams.heatmapKnee);
      sceneRef.current.setEdgeFalloff(visualParams.edgeFalloff);
      sceneRef.current.setDissipationRate(visualParams.dissipationRate);
    }
  }, [visualParams]);

  useEffect(() => { if (sceneRef.current) sceneRef.current.isUserDraggingSlider = isDraggingSlider; }, [isDraggingSlider]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setTrackingIndicatorsVisible(isTrackingCam); }, [isTrackingCam]);
  useEffect(() => {
    if (isTrackingCam) {
      headTracking.startCamera().catch(error => {
        console.error("Failed to start camera for tracking:", error);
        setIsTrackingCam(false);
      });
    } else {
      headTracking.stopCamera();
    }
  }, [isTrackingCam]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setVisualizationMode(visualizationMode); }, [visualizationMode]);

  // Sync View Mode and FOV to AmbiScene
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setViewMode(viewMode);

    // Immediately apply the correct FOV for this mode directly from React state
    const activeZoom = viewMode === 'inside' ? insideZoomFov : outsideZoomFov;
    sceneRef.current.setFov(activeZoom, 'ui');
  }, [viewMode, insideZoomFov, outsideZoomFov]);

  useEffect(() => {
    let outputAnimationFrameId: number;
    let trackProgId: number;

    const loop = () => {
      const now = performance.now();
      if (throttleRef.current.shouldUpdate(now)) {
        if (audioEngine.playbackState === 'playing') {
          audioEngine.update();
          const cov = audioEngine.getCovariance();
          if (sceneRef.current) {
            const currentGain = viewMode === 'inside' ? insideGain : outsideGain;
            sceneRef.current.updateCovariance(cov, audioEngine.order, currentGain);
          }
        }
        if (sceneRef.current && !isTrackingCam) {
          headTracking.setUIRotation(sceneRef.current.getNaturalQuaternion());
        }
      }
      if (isTrackingCam && sceneRef.current) {
        const rawQ = headTracking.getRawQuaternion();
        const predQ = headTracking.getPredictedQuaternion();
        if (rawQ && predQ) {
          sceneRef.current.updateTrackingIndicators(rawQ, predQ);
          sceneRef.current.headTrackingQuat = predQ;
        }
      } else if (sceneRef.current) {
        sceneRef.current.headTrackingQuat = null;
      }
      outputAnimationFrameId = requestAnimationFrame(loop);
    };
    loop();

    const updateProgress = () => {
      if (audioEngine.playbackState === 'playing' && !isScrubbing.current) {
        const d = audioEngine.getDuration();
        if (d > 0) {
          const p = (audioEngine.getCurrentTime() / d) * 100;
          if (!isNaN(p)) setProgress(p);
        }
      }
      trackProgId = requestAnimationFrame(updateProgress);
    };
    updateProgress();

    return () => { cancelAnimationFrame(outputAnimationFrameId); cancelAnimationFrame(trackProgId); };
  }, [audioEngine, insideGain, outsideGain, viewMode, isTrackingCam, headTracking]);

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
    <div className={`bg-background-dark font-ui text-slate-100 overflow-hidden h-full flex flex-col antialiased ${isDraggingLeft || isDraggingRight ? 'select-none cursor-col-resize' : ''}`}>
      {/* Top Navigation Bar */}
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
              onClick={() => setShowInfoModal(true)}
              title="About AmbiViz"
              className="flex items-center justify-center w-8 h-8 rounded-md transition-all border text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50"
            >
              <span className="material-symbols-outlined text-xl">info</span>
            </button>
            <button
              onClick={() => setShowQueue(!showQueue)}
              title="Toggle Queue"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${showQueue
                ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                }`}
            >
              <span className="material-symbols-outlined text-xl">side_navigation</span>
            </button>
            <button
              onClick={() => setShowTransport(!showTransport)}
              title="Toggle Transport"
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all border ${showTransport
                ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                }`}
            >
              <span className="material-symbols-outlined text-xl -rotate-90">side_navigation</span>
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
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

      <main className="flex-1 relative flex overflow-hidden">
        {/* Left Sidebar: Queue */}
        {showQueue && (
          <aside
            style={{ width: leftWidth }}
            className="h-full glass border-r border-primary/10 flex flex-col z-40 shrink-0 relative"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div
              className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-slate-500/30 z-50 transition-colors"
              onMouseDown={() => setIsDraggingLeft(true)}
            />
            <div className="p-4 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">queue_music</span>
                <h3 className="font-normal text-[11px] uppercase tracking-widest text-slate-400">Queue</h3>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* Loaded Tracks */}
              {queue.map((track, idx) => (
                <div
                  key={idx}
                  onClick={() => handleTrackSelect(idx)}
                  onDoubleClick={() => handleTrackPlay(idx)}
                  className={`group relative flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${currentIndex === idx
                    ? 'bg-primary/20 border border-primary/30'
                    : 'hover:bg-primary/5 border border-transparent'
                    }`}
                >
                  <div className={`flex items-center justify-center size-10 rounded shrink-0 ${currentIndex === idx ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'
                    }`}>
                    <span className="material-symbols-outlined">{currentIndex === idx ? 'equalizer' : 'music_note'}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm truncate normal-case ${currentIndex === idx ? 'font-semibold text-slate-100' : 'font-medium text-slate-300'}`}>
                      {track.name || (track.file && track.file.name)}
                    </p>
                    <p className={`text-[10px] font-mono ${currentIndex === idx ? 'text-primary/60' : 'text-slate-400'}`}>
                      {audioEngine.playbackState === 'loading' && currentIndex === idx ? (
                        <>Loading<span className="loading-dots"></span></>
                      ) : (
                        <>{track.type || '-'} • {track.duration || '00:00'}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleRemoveTrack(idx, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 p-1 flex items-center justify-center shrink-0"
                    title="Remove Track"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              ))}

              {/* Empty State / Drop Zone */}
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
                    {['.wav', '.amb', '.ogg', '.iamf', '.opus'].map(ext => (
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
                if (e.target.files) handleFilesQueued(Array.from(e.target.files));
              }} />
            </div>
          </aside>
        )}

        {/* Central Visualization Area */}
        <section className={`flex-1 relative canvas-bg overflow-hidden min-w-0 @container ${isDragOver ? 'border-2 border-primary' : ''}`}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        >
          {/* 3D Canvas Container */}
          <div ref={containerRef} className="absolute inset-0 z-0" />

          {/* Transport Bar */}
          {showTransport && (
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
                      setProgress(p);
                      audioEngine.seek((p / 100) * audioEngine.getDuration());
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
                    onClick={handlePrev}
                    className="transport-btn"
                    title="Previous Track"
                  >
                    <span className="material-symbols-outlined text-xl">skip_previous</span>
                  </button>
                  <button
                    onClick={() => { if (playbackState === 'playing') handlePause(); else handlePlay(); }}
                    className={`transport-btn ${playbackState === 'playing' ? 'transport-active' : ''}`}
                    title={playbackState === 'playing' ? 'Pause' : 'Play'}
                  >
                    <span className="material-symbols-outlined text-2xl font-bold">
                      {playbackState === 'playing' ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <button
                    onClick={handleStop}
                    className={`transport-btn ${playbackState === 'stopped' && progress === 0 ? 'transport-active' : ''}`}
                    title="Stop"
                  >
                    <span className="material-symbols-outlined text-xl">stop</span>
                  </button>
                  <button
                    onClick={handleNext}
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
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleLoopToggle}
                    className={`transport-btn transport-loop ${isLooping ? 'transport-active' : ''}`}
                    title={isLooping ? "Loop: On" : "Loop: Off"}
                  >
                    <span className="material-symbols-outlined text-lg">repeat</span>
                  </button>
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="transport-btn"
                    title="Settings"
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
                    <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isViewTrackingCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                    <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">View & Tracking</h3>
                  </div>
                </div>

                {!isViewTrackingCollapsed && (
                  <div className="space-y-4 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300 normal-case">Visualization</span>
                      <div className="flex p-1 bg-slate-800/80 rounded-lg border border-white/5 shadow-inner">
                        <button
                          onClick={() => setVisualizationMode('volumetric')}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${visualizationMode === 'volumetric' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >Volumetric</button>
                        <button
                          onClick={() => setVisualizationMode('sphere')}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${visualizationMode === 'sphere' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >Sphere</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300 normal-case">View Mode</span>
                      <div className="flex p-1 bg-slate-800/80 rounded-lg border border-white/5 shadow-inner">
                        <button
                          onClick={() => setViewMode('inside')}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${viewMode === 'inside' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >Inside</button>
                        <button
                          onClick={() => setViewMode('outside')}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${viewMode === 'outside' ? 'bg-primary-dark text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >Outside</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300 normal-case">Head Tracking</span>
                      <button
                        onClick={() => setIsTrackingCam(!isTrackingCam)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isTrackingCam
                          ? 'bg-green-600 text-white hover:bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.3)]'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/5'
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm">videocam</span>
                        <span>{isTrackingCam ? 'Tracking Active' : 'Start Tracking'}</span>
                      </button>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Zoom (FOV)" content="Adjusts the field of view. Lower values zoom in, higher values provide a wider perspective.">
                          <span className="hover:text-slate-300 transition-colors">Zoom</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{(viewMode === 'inside' ? insideZoomFov : outsideZoomFov).toFixed(1)}</span>
                      </div>
                      <input
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        type="range"
                        min="10"
                        max="150"
                        step="1"
                        value={viewMode === 'inside' ? insideZoomFov : outsideZoomFov}
                        onChange={(e) => handleZoomChange(Number(e.target.value))}
                        onMouseDown={() => setIsDraggingSlider(true)}
                        onMouseUp={() => setIsDraggingSlider(false)}
                        onTouchStart={() => setIsDraggingSlider(true)}
                        onTouchEnd={() => setIsDraggingSlider(false)}
                      />
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
                    <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isCameraCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                    <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">
                      {viewMode === 'inside' ? 'Camera Orientation' : 'Camera Position'}
                    </h3>
                  </div>
                  <button
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleCameraReset(); }}
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
                          <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                            <span>Yaw</span>
                            <span className="text-primary font-medium">{cameraUIState.yaw.toFixed(1)}°</span>
                          </div>
                          <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="-180" max="180" step="0.1" value={cameraUIState.yaw} onChange={(e) => handleCameraUIChange('yaw', Number(e.target.value))} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                            <span>Pitch</span>
                            <span className="text-primary font-medium">{cameraUIState.pitch.toFixed(1)}°</span>
                          </div>
                          <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="-89.4" max="89.4" step="0.1" value={cameraUIState.pitch} onChange={(e) => handleCameraUIChange('pitch', Number(e.target.value))} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                            <span>Roll</span>
                            <span className="text-primary font-medium">{cameraUIState.roll.toFixed(1)}°</span>
                          </div>
                          <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="-180" max="180" step="0.1" value={cameraUIState.roll} onChange={(e) => handleCameraUIChange('roll', Number(e.target.value))} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                            <span>X</span>
                            <span className="text-primary font-medium">{cameraUIState.x.toFixed(2)}</span>
                          </div>
                          <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="-50" max="50" step="0.1" value={cameraUIState.x} onChange={(e) => handleCameraUIChange('x', Number(e.target.value))} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                            <span>Y</span>
                            <span className="text-primary font-medium">{cameraUIState.y.toFixed(2)}</span>
                          </div>
                          <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="-50" max="50" step="0.1" value={cameraUIState.y} onChange={(e) => handleCameraUIChange('y', Number(e.target.value))} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                            <span>Z</span>
                            <span className="text-primary font-medium">{cameraUIState.z.toFixed(2)}</span>
                          </div>
                          <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="-50" max="50" step="0.1" value={cameraUIState.z} onChange={(e) => handleCameraUIChange('z', Number(e.target.value))} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
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
                    <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isVisualizerCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                    <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">Visualizer Controls</h3>
                  </div>
                  <button
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleVisualReset(); }}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Reset
                  </button>
                </div>

                {!isVisualizerCollapsed && (
                  <div className="space-y-4 pb-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Gain" content="Scales the raw Ambisonic audio energy before it enters the visual ray-marching pipeline.">
                          <span className="hover:text-slate-300 transition-colors">Gain</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{(viewMode === 'inside' ? insideGain : outsideGain).toFixed(2)}</span>
                      </div>
                      <input
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        type="range"
                        min="0"
                        max="20"
                        step="0.01"
                        value={viewMode === 'inside' ? insideGain : outsideGain}
                        onChange={(e) => handleGainChange(Number(e.target.value))}
                        onMouseDown={() => setIsDraggingSlider(true)}
                        onMouseUp={() => setIsDraggingSlider(false)}
                        onTouchStart={() => setIsDraggingSlider(true)}
                        onTouchEnd={() => setIsDraggingSlider(false)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Threshold" content="Sets the minimum audio energy required to render a cloud. Increase this to hide background room noise.">
                          <span className="hover:text-slate-300 transition-colors">Threshold</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{visualParams.densityThreshold.toFixed(3)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="0.5" step="0.001" value={visualParams.densityThreshold} onChange={(e) => handleVisualParamsChange({ densityThreshold: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Density" content="Controls the physical thickness and opacity of the volumetric audio clouds.">
                          <span className="hover:text-slate-300 transition-colors">Density</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{visualParams.densityMult.toFixed(1)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="500" step="1" value={visualParams.densityMult} onChange={(e) => handleVisualParamsChange({ densityMult: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Emission" content="Controls the glowing heat and brightness of the volume independently of its thickness.">
                          <span className="hover:text-slate-300 transition-colors">Emission</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{visualParams.emissionMult.toFixed(2)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="50" step="0.1" value={visualParams.emissionMult} onChange={(e) => handleVisualParamsChange({ emissionMult: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Knee (Color)" content="Shifts the color transfer function to prevent loud transient sounds from blowing out the visualizer into solid white.">
                          <span className="hover:text-slate-300 transition-colors">Knee</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{visualParams.heatmapKnee.toFixed(2)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0.01" max="1" step="0.01" value={visualParams.heatmapKnee} onChange={(e) => handleVisualParamsChange({ heatmapKnee: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Edge Falloff" content="Adjusts the geometric sharpness of the spatial audio lobes. Higher values create tighter, more focused clouds.">
                          <span className="hover:text-slate-300 transition-colors">Edge Falloff</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{visualParams.edgeFalloff.toFixed(2)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="2" step="0.01" value={visualParams.edgeFalloff} onChange={(e) => handleVisualParamsChange({ edgeFalloff: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Dissipation" content="Controls how slowly the visual energy fades over time, creating lingering smoke trails that smooth out erratic flickering.">
                          <span className="hover:text-slate-300 transition-colors">Dissipation</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{visualParams.dissipationRate.toFixed(2)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="1" step="0.01" value={visualParams.dissipationRate} onChange={(e) => handleVisualParamsChange({ dissipationRate: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
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
                    <span className={`material-symbols-outlined text-sm text-slate-400 transition-transform ${isESKFCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                    <Tooltip title="Webcam ESKF Tuning" content="Adjusts the Error-State Kalman Filter (ESKF) parameters that fuse webcam tracking data for responsive, low-latency head orientation. Use these settings to balance smoothness against responsiveness.">
                      <h3 className="text-[10px] font-normal uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">ESKF Tuning</h3>
                    </Tooltip>
                  </div>
                  <button
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-primary transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleESKFReset(); }}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Reset
                  </button>
                </div>

                {!isESKFCollapsed && (
                  <div className={`space-y-4 pb-1 transition-opacity duration-300 ${!isTrackingCam ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
                    {!isTrackingCam && (
                      <div className="py-2 px-3 bg-slate-900/60 border border-white/5 rounded-md text-[10px] text-slate-400 text-center italic">
                        Head tracking must be active to tune ESKF
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="τ (Prediction)" content="Offsets system delay. Increase until audio panning feels instantaneous. If the sound field 'rubber-bands' or overshoots when you abruptly stop your head, decrease this value.">
                          <span className="hover:text-slate-300 transition-colors">τ (Time Constant)</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{eskfParams.tau.toFixed(3)}s</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="1.0" step="0.001" value={eskfParams.tau} onChange={(e) => handleESKFParams({ tau: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="R (Measurement Noise)" content="Trust in the webcam. Lower = faster response but captures more micro-jitter. Higher = smoother but can feel sluggish. Listen for rapid stutters in the audio field; increase until the stutter disappears.">
                          <span className="hover:text-slate-300 transition-colors">R (Meas Noise)</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{eskfParams.R_scalar.toExponential(2)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="0.01" step="0.000001" value={eskfParams.R_scalar} onChange={(e) => handleESKFParams({ R_scalar: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-normal normal-case text-slate-400">
                        <Tooltip title="Q (Process Noise)" content="Trust in head momentum. Lower = assumes smooth, predictable movement. Higher = better tracking for sudden, erratic head whips. Increase if the audio feels like it drags behind your fast turns.">
                          <span className="hover:text-slate-300 transition-colors">Q (Proc Noise)</span>
                        </Tooltip>
                        <span className="text-primary font-medium">{eskfParams.Q_scalar.toExponential(2)}</span>
                      </div>
                      <input className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" type="range" min="0" max="1.0" step="0.0001" value={eskfParams.Q_scalar} onChange={(e) => handleESKFParams({ Q_scalar: Number(e.target.value) })} onMouseDown={() => setIsDraggingSlider(true)} onMouseUp={() => setIsDraggingSlider(false)} onTouchStart={() => setIsDraggingSlider(true)} onTouchEnd={() => setIsDraggingSlider(false)} />
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
          {(() => {
            let color = 'bg-slate-500';
            let label = 'Nothing loaded';
            let pulse = false;
            if (playbackState === 'loading') { color = 'bg-yellow-500'; label = 'Buffering'; pulse = true; }
            else if (playbackState === 'playing' || (playbackState === 'stopped' && currentIndex !== -1)) { color = 'bg-green-500'; label = 'Ready'; pulse = playbackState === 'playing'; }
            else if (playbackState === 'error') { color = 'bg-red-500'; label = 'Error'; }

            return (
              <span className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}></span>
                Audio Engine: {label}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center justify-center flex-1">
        </div>
        <div className="flex items-center gap-6 flex-1 justify-end">
          <span className="text-primary normal-case">v0.9-beta</span>
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
              <HrtfSelector onSelect={handleHrtfSelect} />
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

      {/* Info & Attribution Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  );
}
