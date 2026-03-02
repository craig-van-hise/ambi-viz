import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { FileLoader } from './components/FileLoader';
import { HrtfSelector } from './components/HrtfSelector';
import { ESKFTuningPanel } from './components/ESKFTuningPanel';
import { VisualizerControls, DEFAULT_VISUAL_PARAMS } from './components/VisualizerControls';
import type { VisualParams } from './components/VisualizerControls';
import { TransportControls } from './components/TransportControls';
import { TrackQueue } from './components/TrackQueue';
import { AudioEngine } from './audio/AudioEngine';
import type { PlaybackState, QueueTrack } from './audio/AudioEngine';
import { AmbiScene } from './visualizer/AmbiScene';
import type { ViewMode } from './visualizer/AmbiScene';
import { Throttle } from './utils/Throttle';
import { HeadTrackingService } from './HeadTrackingService';
import { loadState, debouncedSave } from './utils/persistence';
import type { PersistedState } from './utils/persistence';
import { CameraControlPanel } from './components/CameraControlPanel';
import type { CameraUIState } from './components/CameraControlPanel';

function App() {
  // Load persisted state on mount
  const [persisted] = useState(() => loadState());

  const [audioEngine] = useState(() => new AudioEngine());
  const [headTracking] = useState(() => new HeadTrackingService());
  const [isTrackingCam, setIsTrackingCam] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AmbiScene | null>(null);
  const [insideGain, setInsideGain] = useState(persisted.insideGain);
  const [outsideGain, setOutsideGain] = useState(persisted.outsideGain);
  const [viewMode, setViewMode] = useState<ViewMode>('inside');
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Transport state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [isLooping, setIsLooping] = useState(true);
  const [zoomFov, setZoomFov] = useState(115); // Default FOV

  const [cameraUIState, setCameraUIState] = useState<CameraUIState>({
    yaw: 0,
    pitch: 0,
    roll: 0,
    x: 0,
    y: 3.3,
    z: 3.6,
  });

  // Queue state
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // ESKF & Visual params (persisted)
  const [eskfParams, setEskfParams] = useState(persisted.eskf);
  const [visualParams, setVisualParams] = useState<VisualParams>(persisted.visualParams);
  const [hrtfUrl, setHrtfUrl] = useState(persisted.hrtfUrl);

  // Throttle covariance updates to ~24fps (render stays at 60fps)
  const throttleRef = useRef(new Throttle(24));

  // Persist state on any change
  const persistRef = useRef<PersistedState>(persisted);

  const persistState = useCallback((partial: Partial<PersistedState>) => {
    persistRef.current = { ...persistRef.current, ...partial };
    debouncedSave(persistRef.current);
  }, []);

  // Handlers for Reset Buttons
  const handleCameraReset = useCallback(() => {
    if (viewMode === 'inside') {
      setCameraUIState(prev => ({ ...prev, yaw: 0, pitch: 0, roll: 0 }));
      if (sceneRef.current) {
        sceneRef.current.updateFromUI('yaw', 0);
        sceneRef.current.updateFromUI('pitch', 0);
        sceneRef.current.updateFromUI('roll', 0);
      }
      setInsideGain(2.2);
      persistState({ insideGain: 2.2 });
      setZoomFov(115);
      if (sceneRef.current) sceneRef.current.setFov(115);
    } else {
      setCameraUIState(prev => ({ ...prev, x: 0, y: 3.3, z: 3.6 }));
      if (sceneRef.current) {
        sceneRef.current.updateFromUI('x', 0);
        sceneRef.current.updateFromUI('y', 3.3);
        sceneRef.current.updateFromUI('z', 3.6);
      }
      setOutsideGain(7.2);
      persistState({ outsideGain: 7.2 });
    }
  }, [viewMode, persistState]);

  const handleESKFReset = useCallback(() => {
    const defaults = { tau: 0.125, R_scalar: 0.000938, Q_scalar: 0.25 };
    setEskfParams(defaults);
    persistState({ eskf: defaults });
    headTracking.updateESKFParams(defaults);
  }, [headTracking, persistState]);

  useEffect(() => {
    headTracking.init();
  }, [headTracking]);

  // Sync engine state to React
  useEffect(() => {
    audioEngine.onStateChange = (state) => {
      setPlaybackState(state);
    };

    return () => {
      audioEngine.onStateChange = undefined;
    };
  }, [audioEngine]);

  // Apply persisted HRTF on first load
  useEffect(() => {
    if (audioEngine.obrDecoder && hrtfUrl !== '/hrtf/MIT_KEMAR_Normal.sofa') {
      audioEngine.obrDecoder.loadSofa(hrtfUrl).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEngine.obrDecoder]);

  // ── File Queue Handler ──
  const handleFilesQueued = useCallback(async (files: File[]) => {
    const indices = await audioEngine.queueFiles(files);
    setQueue([...audioEngine.queue]);

    // Auto-load first track if nothing is loaded yet (but do NOT play)
    if (audioEngine.currentIndex === -1 && indices.length > 0) {
      await audioEngine.loadTrack(indices[0]);
      setCurrentIndex(indices[0]);
      if (audioEngine.obrDecoder) {
        headTracking.attachDecoder(audioEngine.obrDecoder);
      }
    }
  }, [audioEngine, headTracking]);

  const handleTrackSelect = useCallback(async (index: number) => {
    // 1. Guard against rapid-click spam
    if (audioEngine.playbackState === 'loading') return;

    // 2. Prevent redundant loads if clicking the already playing track
    if (index === audioEngine.currentIndex && audioEngine.playbackState === 'playing') return;

    try {
      // 3. Forcefully stop the current track (destroys the source node)
      audioEngine.stop();

      // 4. Await the decoding and loading of the new track
      await audioEngine.loadTrack(index);

      // 5. Explicitly start playback
      if (audioEngine.playbackState !== 'error') {
        audioEngine.play();
      }
      setCurrentIndex(index);
    } catch (error) {
      console.error("Failed to play selected track:", error);
    }
  }, [audioEngine]);

  const handleHrtfSelect = useCallback(async (url: string) => {
    setHrtfUrl(url);
    persistState({ hrtfUrl: url });
    if (audioEngine.obrDecoder) {
      try {
        await audioEngine.obrDecoder.loadSofa(url);
      } catch (e) {
        console.error('Error changing HRTF:', e);
      }
    }
  }, [audioEngine, persistState]);

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
    persistState({ visualParams: DEFAULT_VISUAL_PARAMS });
  }, [persistState]);

  const handleGainChange = useCallback((newGain: number) => {
    if (viewMode === 'inside') {
      setInsideGain(newGain);
      persistState({ insideGain: newGain });
    } else {
      setOutsideGain(newGain);
      persistState({ outsideGain: newGain });
    }
  }, [viewMode, persistState]);

  const handleZoomChange = useCallback((newFov: number) => {
    setZoomFov(newFov);
    if (sceneRef.current) {
      sceneRef.current.setFov(newFov);
    }
  }, []);

  const handleCameraUIChange = useCallback((axis: keyof CameraUIState, value: number) => {
    setCameraUIState(prev => ({ ...prev, [axis]: value }));
    if (sceneRef.current) {
      sceneRef.current.updateFromUI(axis, value);
    }
  }, []);



  // ── Transport Handlers ──
  const handlePlay = useCallback(() => {
    audioEngine.play();
  }, [audioEngine]);

  const handlePause = useCallback(() => {
    audioEngine.pause();
  }, [audioEngine]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
  }, [audioEngine]);

  const handlePrev = useCallback(async () => {
    await audioEngine.prev();
    setCurrentIndex(audioEngine.currentIndex);
  }, [audioEngine]);

  const handleNext = useCallback(async () => {
    await audioEngine.next();
    setCurrentIndex(audioEngine.currentIndex);
  }, [audioEngine]);

  const handleLoopToggle = useCallback(() => {
    const newLoop = !isLooping;
    audioEngine.setLoop(newLoop);
    setIsLooping(newLoop);
  }, [audioEngine, isLooping]);

  // ── Spacebar Play/Pause ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (audioEngine.playbackState === 'playing') {
          handlePause();
        } else {
          handlePlay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioEngine, handlePlay, handlePause]);

  // Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new AmbiScene(containerRef.current, 0.6);
    sceneRef.current = scene;

    // Apply initial visual params
    scene.setDensityThreshold(visualParams.densityThreshold);
    scene.setDensityMult(visualParams.densityMult);
    scene.setEmissionMult(visualParams.emissionMult);
    scene.setHeatmapKnee(visualParams.heatmapKnee);
    scene.setEdgeFalloff(visualParams.edgeFalloff);
    scene.setDissipationRate(visualParams.dissipationRate);

    // Phase 3: Link AmbiScene state changes back to React UI
    scene.onCameraStateChange = (state) => {
      setCameraUIState(prev => {
        // Precision-based dirty check to prevent unnecessary re-renders
        if (
          Math.abs(prev.yaw - state.yaw) < 0.01 &&
          Math.abs(prev.pitch - state.pitch) < 0.01 &&
          Math.abs(prev.roll - state.roll) < 0.01 &&
          Math.abs(prev.x - state.x) < 0.001 &&
          Math.abs(prev.y - state.y) < 0.001 &&
          Math.abs(prev.z - state.z) < 0.001
        ) {
          return prev;
        }
        return state;
      });
    };

    // Sync FOV state from visualizer to React
    scene.onFovChange = (fov) => {
      setZoomFov(fov);
    };

    return () => {
      scene.destroy();
    };
  }, []); // Note: we only want this to run on mount, so visualParams is intentionally excluded

  // Sync visual params to scene when they change
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

  // Sync manual dragging flag to AmbiScene to prevent state fighting
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.isUserDraggingSlider = isDraggingSlider;
    }
  }, [isDraggingSlider]);

  // Toggle tracking indicators when tracking state changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTrackingIndicatorsVisible(isTrackingCam);
    }
  }, [isTrackingCam]);

  // Update Loop — render at 60fps, data at ~24fps
  useEffect(() => {
    let outputAnimationFrameId: number;

    const loop = () => {
      const now = performance.now();

      if (throttleRef.current.shouldUpdate(now)) {
        audioEngine.update();

        const cov = audioEngine.getCovariance();
        if (sceneRef.current) {
          const currentGain = viewMode === 'inside' ? insideGain : outsideGain;
          sceneRef.current.updateCovariance(cov, audioEngine.order, currentGain);
          // Only send manual rotation to engine if NOT tracking
          if (!isTrackingCam) {
            headTracking.setUIRotation(sceneRef.current.getNaturalQuaternion());
          }
        }
      }

      if (isTrackingCam && sceneRef.current) {
        const rawQ = headTracking.getRawQuaternion();
        const predQ = headTracking.getPredictedQuaternion();
        if (rawQ && predQ) {
          sceneRef.current.updateTrackingIndicators(rawQ, predQ);
          // Phase 3: Feed the predicted quaternion to AmbiScene's hub
          sceneRef.current.headTrackingQuat = predQ;
        }
      } else if (sceneRef.current) {
        // Reset tracking data if disabled
        sceneRef.current.headTrackingQuat = null;
      }

      outputAnimationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(outputAnimationFrameId);
  }, [audioEngine, insideGain, outsideGain, viewMode, isTrackingCam, headTracking]);

  const hasQueue = queue.length > 0;

  return (
    <div className="container">
      <h1>AmbiViz</h1>
      <div style={{ marginBottom: '20px' }}>
        <FileLoader onFilesQueued={handleFilesQueued} />
        <HrtfSelector onSelect={handleHrtfSelect} />
      </div>

      {hasQueue && (
        <>
          <TrackQueue
            tracks={queue}
            currentIndex={currentIndex}
            playbackState={playbackState}
            onTrackSelect={handleTrackSelect}
          />
          <TransportControls
            playbackState={playbackState}
            isLooping={isLooping}
            queueSize={queue.length}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onLoopToggle={handleLoopToggle}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </>
      )}

      <div className="viz-container">
        <h3>Spherical Harmonics Visualization (Order 3)</h3>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            aspectRatio: '2.35 / 1',
            border: '1px solid #333',
            background: '#000',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        />
        <div style={{ marginTop: '10px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{`Status: ${playbackState === 'playing' ? 'Playing' : playbackState === 'paused' ? 'Paused' : 'Stopped'} | Order: ${audioEngine.order}`}</span>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'inside' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('inside');
                if (sceneRef.current) sceneRef.current.setViewMode('inside');
              }}
            >
              👁 Inside
            </button>
            <button
              className={`view-mode-btn outside ${viewMode === 'outside' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('outside');
                if (sceneRef.current) sceneRef.current.setViewMode('outside');
              }}
            >
              🔭 Outside
            </button>
          </div>
          <CameraControlPanel
            viewMode={viewMode}
            state={cameraUIState}
            onChange={handleCameraUIChange}
            onDragStart={() => setIsDraggingSlider(true)}
            onDragEnd={() => setIsDraggingSlider(false)}
            isTracking={isTrackingCam}
            onReset={handleCameraReset}
          />
          <button
            onClick={() => {
              if (isTrackingCam) {
                headTracking.stopCamera();
                setIsTrackingCam(false);
              } else {
                headTracking.startCamera().then(() => setIsTrackingCam(true));
              }
            }}
            style={{
              padding: '6px 16px',
              background: isTrackingCam ? '#4CAF50' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: 'bold',
            }}
          >
            <span key={isTrackingCam ? 'on' : 'off'}>{isTrackingCam ? '📹 Tracking ON' : '📹 Start Tracking'}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        <VisualizerControls
          params={visualParams}
          onChange={handleVisualParamsChange}
          onReset={handleVisualReset}
          gain={viewMode === 'inside' ? insideGain : outsideGain}
          onGainChange={handleGainChange}
          zoomFov={zoomFov}
          onZoomChange={handleZoomChange}
          isInsideView={viewMode === 'inside'}
        />
        {isTrackingCam && (
          <ESKFTuningPanel
            onParamsChange={handleESKFParams}
            initialParams={eskfParams}
            onReset={handleESKFReset}
          />
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p><strong>Instructions:</strong> Drag and drop audio files or folders. Press <kbd>Space</kbd> to play/pause.</p>
        <p><strong>Controls:</strong> {viewMode === 'inside'
          ? 'Click and drag to look around (3DoF head rotation).'
          : 'Click and drag to orbit. Scroll to zoom. Right-click to pan.'
        }</p>
      </div>
    </div>
  );
}

export default App;
