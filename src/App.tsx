import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { AudioEngine } from './audio/AudioEngine';
import type { PlaybackState, QueueTrack } from './audio/AudioEngine';
import { AmbiScene } from './visualizer/AmbiScene';
import type { ViewMode, VisualizationMode } from './visualizer/AmbiScene';
import { isSupportedAudioFile } from './utils/fileUtils';
import { Throttle } from './utils/Throttle';
import { HeadTrackingService } from './HeadTrackingService';
import { loadState, debouncedSave } from './utils/persistence';
import type { PersistedState } from './utils/persistence';

// Component Imports
import { Header } from './components/Header';
import { TrackQueue } from './components/TrackQueue';
import { MainViewer } from './components/MainViewer';
import { TransportControls } from './components/TransportControls';
import { ControlSidebar } from './components/ControlSidebar';
import { Footer } from './components/Footer';
import { InfoModal } from './components/InfoModal';
import { SettingsModal } from './components/SettingsModal';

export interface VisualParams {
  densityThreshold: number;
  densityMult: number;
  emissionMult: number;
  heatmapKnee: number;
  edgeFalloff: number;
  dissipationRate: number;
}

export const DEFAULT_VISUAL_PARAMS: VisualParams = {
  densityThreshold: 0,
  densityMult: 1.0,
  emissionMult: 1.0,
  heatmapKnee: 0.5,
  edgeFalloff: 1.0,
  dissipationRate: 0,
};

export interface DeformationParams {
  amplitude: number;
  baseRadius: number;
  sharpness: number;
  colorIntensity: number;
  smoothing: number;
  resolution: number;
  wireframe: boolean;
}

export const DEFAULT_DEFORMATION_PARAMS: DeformationParams = {
  amplitude: 0.5,
  baseRadius: 0.5,
  sharpness: 1.0,
  colorIntensity: 0.5,
  smoothing: 0.50,
  resolution: 128,
  wireframe: false,
};

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

const DEFAULT_INSIDE_ZOOM = 150;
const DEFAULT_OUTSIDE_ZOOM = 60;

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
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('sphere');
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [isLooping, setIsLooping] = useState(false);
  const [insideZoomFov, setInsideZoomFov] = useState(DEFAULT_INSIDE_ZOOM);
  const [outsideZoomFov, setOutsideZoomFov] = useState(DEFAULT_OUTSIDE_ZOOM);

  const [cameraUIState, setCameraUIState] = useState({
    yaw: 0, pitch: 0, roll: 0, x: 0, y: 3.55, z: 3.7,
  });

  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [eskfParams, setEskfParams] = useState(persisted.eskf);
  const [visualParams, setVisualParams] = useState<VisualParams>(persisted.visualParams);
  const [deformationParams, setDeformationParams] = useState<DeformationParams>(persisted.deformationParams);
  const [hrtfUrl, setHrtfUrl] = useState(persisted.hrtfUrl);

  const throttleRef = useRef(new Throttle(24));
  const persistRef = useRef<PersistedState>(persisted);

  const [showQueue, setShowQueue] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [showTransport, setShowTransport] = useState(true);
  const [volume, setVolume] = useState(75);
  const [progress, setProgress] = useState(0);
  const isScrubbing = useRef(false);
  const hasInitializedRemoteQueue = useRef(false);
  const hasAttachedDecoder = useRef(false);

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
      setCameraUIState(prev => ({ ...prev, x: 0, y: 3.55, z: 3.7 }));
      if (sceneRef.current) {
        sceneRef.current.updateFromUI('x', 0);
        sceneRef.current.updateFromUI('y', 3.55);
        sceneRef.current.updateFromUI('z', 3.7);
      }
      setOutsideGain(3.0);
      persistState({ outsideGain: 3.0 });
      handleZoomChange(DEFAULT_OUTSIDE_ZOOM);
    }
  }, [viewMode, persistState, handleZoomChange]);

  const handleESKFReset = useCallback(() => {
    const defaults = { tau: 0.125, R_scalar: 0.000938, Q_scalar: 0.25 };
    setEskfParams(defaults);
    persistState({ eskf: defaults });
    headTracking.updateESKFParams(defaults);
  }, [headTracking, persistState]);

  useEffect(() => { headTracking.init(); }, [headTracking]);

  useEffect(() => {
    const initializeRemoteQueue = async () => {
      if (hasInitializedRemoteQueue.current) return;
      hasInitializedRemoteQueue.current = true;

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}ambisonic_audio_queue/Queue order.txt`);
        if (!response.ok) return;
        const text = await response.text();
        const lines = text.split('\n');

        const trackTitles: string[] = [];
        for (const line of lines) {
          const match = line.match(/^\d+\.\s+(.+)$/);
          if (match) {
            trackTitles.push(match[1].trim());
          }
        }

        if (trackTitles.length === 0) return;

        const filenameMap: Record<string, string> = {
          "3rd Order Clock": "3rd Order Ambi Clock Test.opus",
          "TEST-09-DYN-B-SPIRAL_Order3": "TEST-09-DYN-B-SPIRAL_Order3.opus",
          "Final Fantasy Prelude": "Final Fantasy Prelude.opus",
          "A Furiosa (Maxixe)_dry": "A Furiosa (Maxixe)_dry.opus",
          "Bach Invention no5 in Eb_AmbiX_3O": "Bach Invention no5 in Eb_AmbiX_3O.opus",
          "Beethoven - String Quartet No 13 in B-flat major - IV Alla danza tedesca": "Beethoven - String Quartet No 13 in B-flat major - IV Alla danza tedesca.opus",
          "Let Me Tell You About My Boat": "Let Me Tell You About My Boat.opus",
          "SMB 2 Theme": "SMB 2 Theme.opus"
        };

        const remoteTracks = trackTitles.map(title => ({
          name: title,
          url: `${import.meta.env.BASE_URL}ambisonic_audio_queue/${filenameMap[title] || `${title}.opus`}`,
          type: 'OPUS'
        }));

        const indices = await audioEngine.queueFiles(remoteTracks);
        setQueue([...audioEngine.queue]);

        if (audioEngine.currentIndex === -1 && indices.length > 0) {
          await audioEngine.loadTrack(indices[0]);
        }
      } catch (error) {
        console.error("Failed to initialize remote queue:", error);
      }
    };

    initializeRemoteQueue();
  }, [audioEngine, headTracking]);

  useEffect(() => {
    audioEngine.onStateChange = (state) => setPlaybackState(state);
    audioEngine.onTrackChange = (index) => setCurrentIndex(index);
    return () => {
      audioEngine.onStateChange = undefined;
      audioEngine.onTrackChange = undefined;
    };
  }, [audioEngine]);

  useEffect(() => {
    if (audioEngine.obrDecoder && !hasAttachedDecoder.current && playbackState !== 'stopped') {
      headTracking.attachDecoder(audioEngine.obrDecoder);
      hasAttachedDecoder.current = true;
    }
  }, [audioEngine, audioEngine.obrDecoder, headTracking, playbackState]);

  useEffect(() => {
    if (audioEngine.obrDecoder && hrtfUrl !== `${import.meta.env.BASE_URL}hrtf/MIT_KEMAR_Normal.sofa`) {
      audioEngine.obrDecoder.loadSofa(hrtfUrl).catch(console.error);
    }
  }, [audioEngine.obrDecoder, hrtfUrl]);

  const handleFilesQueued = useCallback(async (files: File[]) => {
    const indices = await audioEngine.queueFiles(files);
    setQueue([...audioEngine.queue]);
    if (audioEngine.currentIndex === -1 && indices.length > 0) {
      await audioEngine.loadTrack(indices[0]);
    }
  }, [audioEngine]);

  const handleHrtfSelect = useCallback(async (value: string | File) => {
    if (typeof value === 'string') {
      setHrtfUrl(value);
      persistState({ hrtfUrl: value });
      if (audioEngine.obrDecoder) {
        try { await audioEngine.obrDecoder.loadSofa(value); } catch (e) { console.error(e); }
      }
    } else {
      try {
        const buffer = await value.arrayBuffer();
        if (audioEngine.obrDecoder) {
          await audioEngine.obrDecoder.loadSofa(buffer);
          setHrtfUrl(`Custom: ${value.name}`);
        }
      } catch (e) {
        console.error("App: Failed to load custom SOFA:", e);
        alert("Failed to load custom SOFA file.");
      }
    }
  }, [audioEngine, persistState]);

  const handleTrackSelect = useCallback(async (index: number) => {
    if (audioEngine.playbackState === 'loading' && audioEngine.currentIndex === index) return;
    try {
      await audioEngine.loadTrack(index);
    } catch (error) {
      console.error("App: Failed to select track:", error);
    }
  }, [audioEngine]);

  const handleTrackPlay = useCallback(async (index: number) => {
    try {
      await audioEngine.playTrack(index);
    } catch (error) {
      console.error("App: Failed to play track:", error);
    }
  }, [audioEngine]);

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
      alert('No supported audio files found (.wav, .ambix, .ogg, .iamf, .opus, .bw64)');
    }
  }, [handleFilesQueued]);

  const handleESKFParams = useCallback((params: { tau?: number; R_scalar?: number; Q_scalar?: number }) => {
    headTracking.updateESKFParams(params);
    setEskfParams(prev => {
      const updated = { ...prev, ...params };
      persistState({ eskf: updated });
      return updated as PersistedState['eskf'];
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
    if (visualizationMode === 'volumetric') {
      setVisualParams(DEFAULT_VISUAL_PARAMS);
      persistState({ visualParams: DEFAULT_VISUAL_PARAMS, insideGain: 3.0, outsideGain: 3.0 });
    } else {
      setDeformationParams(DEFAULT_DEFORMATION_PARAMS);
      persistState({ deformationParams: DEFAULT_DEFORMATION_PARAMS, insideGain: 3.0, outsideGain: 3.0 });
    }
    handleZoomChange(viewMode === 'inside' ? DEFAULT_INSIDE_ZOOM : DEFAULT_OUTSIDE_ZOOM);
    setInsideGain(3.0);
    setOutsideGain(3.0);
  }, [visualizationMode, viewMode, handleZoomChange, persistState]);

  const handleGainChange = useCallback((newGain: number) => {
    if (viewMode === 'inside') { setInsideGain(newGain); persistState({ insideGain: newGain }); }
    else { setOutsideGain(newGain); persistState({ outsideGain: newGain }); }
  }, [viewMode, persistState]);

  const handleDeformationParamsChange = useCallback((params: Partial<DeformationParams>) => {
    setDeformationParams(prev => {
      const updated = { ...prev, ...params };
      persistState({ deformationParams: updated });
      return updated;
    });
  }, [persistState]);

  const handleCameraUIChange = useCallback((axis: string, value: number) => {
    setCameraUIState(prev => ({ ...prev, [axis]: value }));
    if (sceneRef.current) sceneRef.current.updateFromUI(axis as any, value);
  }, []);

  const handlePlay = useCallback(() => audioEngine.play(), [audioEngine]);
  const handlePause = useCallback(() => audioEngine.pause(), [audioEngine]);
  const handleStop = useCallback(() => { audioEngine.stop(); setProgress(0); }, [audioEngine]);
  const handlePrev = useCallback(async () => { await audioEngine.prev(); }, [audioEngine]);
  const handleNext = useCallback(async () => { await audioEngine.next(); }, [audioEngine]);
  const handleLoopToggle = useCallback(() => { const newLoop = !isLooping; audioEngine.setLoop(newLoop); setIsLooping(newLoop); }, [audioEngine, isLooping]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          if (audioEngine.playbackState === 'playing') handlePause();
          else handlePlay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioEngine, handlePlay, handlePause]);

  useEffect(() => { audioEngine.setVolume(volume); }, [audioEngine, volume]);

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

    return () => scene.destroy();
  }, []);

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
  }, []);

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

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setDeformationParams(deformationParams);
    }
  }, [deformationParams]);

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
  }, [isTrackingCam, headTracking]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setVisualizationMode(visualizationMode); }, [visualizationMode]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setViewMode(viewMode);
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
      <Header 
        showQueue={showQueue}
        onToggleQueue={() => setShowQueue(!showQueue)}
        showTransport={showTransport}
        onToggleTransport={() => setShowTransport(!showTransport)}
        showControls={showControls}
        onToggleControls={() => setShowControls(!showControls)}
        onShowInfo={() => setShowInfoModal(true)}
      />

      <main className="flex-1 relative flex overflow-hidden">
        {showQueue && (
          <TrackQueue 
            width={leftWidth}
            onResizeStart={() => setIsDraggingLeft(true)}
            queue={queue}
            currentIndex={currentIndex}
            isDragOver={isDragOver}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onTrackSelect={handleTrackSelect}
            onTrackPlay={handleTrackPlay}
            onRemoveTrack={handleRemoveTrack}
            onClearQueue={handleClearQueue}
            onFilesQueued={handleFilesQueued}
            isLoading={audioEngine.playbackState === 'loading'}
          />
        )}

        <MainViewer 
          containerRef={containerRef}
          isDragOver={isDragOver}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {showTransport && (
            <TransportControls 
              playbackState={playbackState}
              progress={progress}
              onProgressChange={setProgress}
              onSeek={(p) => audioEngine.seek((p / 100) * audioEngine.getDuration())}
              activeTrack={activeTrack}
              formatTime={formatTime}
              onPrev={handlePrev}
              onNext={handleNext}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              volume={volume}
              onVolumeChange={(v) => { setVolume(v); audioEngine.setVolume(v); }}
              isLooping={isLooping}
              onToggleLoop={handleLoopToggle}
              onShowSettings={() => setShowSettingsModal(true)}
            />
          )}
        </MainViewer>

        {showControls && (
          <ControlSidebar 
            width={rightWidth}
            onResizeStart={() => setIsDraggingRight(true)}
            visualizationMode={visualizationMode}
            setVisualizationMode={setVisualizationMode}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isTrackingCam={isTrackingCam}
            setIsTrackingCam={setIsTrackingCam}
            zoomFov={viewMode === 'inside' ? insideZoomFov : outsideZoomFov}
            onZoomChange={handleZoomChange}
            gain={viewMode === 'inside' ? insideGain : outsideGain}
            onGainChange={handleGainChange}
            cameraUIState={cameraUIState}
            onCameraUIChange={handleCameraUIChange}
            onCameraReset={handleCameraReset}
            visualParams={visualParams}
            onVisualParamsChange={handleVisualParamsChange}
            deformationParams={deformationParams}
            onDeformationParamsChange={handleDeformationParamsChange}
            onVisualReset={handleVisualReset}
            eskfParams={eskfParams}
            onESKFParamsChange={handleESKFParams}
            onESKFReset={handleESKFReset}
            onSliderDrag={setIsDraggingSlider}
          />
        )}
      </main>

      <Footer 
        playbackState={playbackState}
        currentIndex={currentIndex}
      />

      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        hrtfUrl={hrtfUrl}
        onHrtfSelect={handleHrtfSelect}
      />

      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  );
}
