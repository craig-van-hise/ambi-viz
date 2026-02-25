import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { FileLoader } from './components/FileLoader';
import { HrtfSelector } from './components/HrtfSelector';
import { AudioEngine } from './audio/AudioEngine';
import { AmbiScene } from './visualizer/AmbiScene';
import type { ViewMode } from './visualizer/AmbiScene';
import { Throttle } from './utils/Throttle';
import { HeadTrackingService } from './HeadTrackingService';

function App() {
  const [audioEngine] = useState(() => new AudioEngine());
  const [headTracking] = useState(() => new HeadTrackingService());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrackingCam, setIsTrackingCam] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AmbiScene | null>(null);
  const [gain, setGain] = useState(2.0);
  const [viewMode, setViewMode] = useState<ViewMode>('inside');

  // Throttle covariance updates to ~24fps (render stays at 60fps)
  const throttleRef = useRef(new Throttle(24));

  useEffect(() => {
    headTracking.init();
  }, [headTracking]);

  const handleFileLoaded = async (file: File) => {
    try {
      console.log('Loading file:', file.name);
      await audioEngine.loadFile(file);
      setIsPlaying(true);
      if (audioEngine.obrDecoder) {
        headTracking.attachDecoder(audioEngine.obrDecoder);
      }
      throttleRef.current.reset();
      if (audioEngine.audioCtx.state === 'suspended') {
        audioEngine.resume();
      }
    } catch (e) {
      console.error('Error loading file:', e);
      alert('Error loading file. Check console.');
    }
  };

  const handleHrtfSelect = async (url: string) => {
    if (audioEngine.obrDecoder) {
      try {
        await audioEngine.obrDecoder.loadSofa(url);
      } catch (e) {
        console.error('Error changing HRTF:', e);
      }
    }
  };

  const toggleViewMode = useCallback(() => {
    const newMode: ViewMode = viewMode === 'inside' ? 'outside' : 'inside';
    setViewMode(newMode);
    if (sceneRef.current) {
      sceneRef.current.setViewMode(newMode);
    }
  }, [viewMode]);

  // Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new AmbiScene(containerRef.current, 0.6);
    sceneRef.current = scene;

    return () => {
      scene.destroy();
    };
  }, []);

  // Update Loop — render at 60fps, data at ~24fps
  useEffect(() => {
    let outputAnimationFrameId: number;

    const loop = () => {
      const now = performance.now();

      // Only update audio data at throttled rate
      if (throttleRef.current.shouldUpdate(now)) {
        audioEngine.update();

        const cov = audioEngine.getCovariance();
        if (sceneRef.current) {
          sceneRef.current.updateCovariance(cov, audioEngine.order, gain);
        }
      }

      // Scene renders at full 60fps (orbit controls stay smooth)
      // The AmbiScene.animate() handles its own rAF loop — we just update data here

      outputAnimationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(outputAnimationFrameId);
  }, [audioEngine, gain]);

  return (
    <div className="container">
      <h1>AmbiViz</h1>
      <div style={{ marginBottom: '20px' }}>
        <FileLoader onFileLoaded={handleFileLoaded} />
        <HrtfSelector onSelect={handleHrtfSelect} />
      </div>

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
          <span>Status: {isPlaying ? 'Playing' : 'Idle'} | Order: {audioEngine.order}</span>
          <label>
            Gain:
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={gain}
              onChange={(e) => setGain(parseFloat(e.target.value))}
              style={{ marginLeft: '10px', verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: '5px' }}>{gain.toFixed(1)}</span>
          </label>
          <button
            onClick={toggleViewMode}
            style={{
              padding: '6px 16px',
              background: viewMode === 'inside' ? '#2196F3' : '#FF9800',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: 'bold',
            }}
          >
            {viewMode === 'inside' ? '👁 Inside View' : '🔭 Outside View'}
          </button>
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
            {isTrackingCam ? '📹 Tracking ON' : '📹 Start Tracking'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p><strong>Instructions:</strong> Drag and drop a 4, 9, or 16 channel Ambisonic file.</p>
        <p><strong>Controls:</strong> {viewMode === 'inside'
          ? 'Click and drag to look around (3DoF head rotation).'
          : 'Click and drag to orbit. Scroll to zoom. Right-click to pan.'
        }</p>
      </div>
    </div>
  );
}

export default App;
