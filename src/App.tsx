import { useState, useEffect, useRef } from 'react';
import './App.css';
import { FileLoader } from './components/FileLoader';
import { AudioEngine } from './audio/AudioEngine';
// @ts-ignore
import { AmbiScene } from './visualizer/AmbiScene';

function App() {
  const [audioEngine] = useState(() => new AudioEngine());
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AmbiScene | null>(null);
  const [gain, setGain] = useState(2.0); // Start with reasonable gain

  const handleFileLoaded = async (file: File) => {
    try {
      console.log('Loading file:', file.name);
      await audioEngine.loadFile(file);
      setIsPlaying(true);
      if (audioEngine.audioCtx.state === 'suspended') {
        audioEngine.resume();
      }
    } catch (e) {
      console.error('Error loading file:', e);
      alert('Error loading file. Check console.');
    }
  };

  // Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new AmbiScene(containerRef.current);
    sceneRef.current = scene;

    return () => {
      scene.destroy();
    };
  }, []);

  // Update Loop
  useEffect(() => {
    let outputAnimationFrameId: number;

    const loop = () => {
      // Get Smoothed Coefficients (still needed for AudioEngine internals/ballistics)
      audioEngine.update();

      // Get Covariance Matrix for Visualization
      const cov = audioEngine.getCovariance();

      // Update Scene
      if (sceneRef.current) {
        sceneRef.current.updateCovariance(cov, audioEngine.order, gain);
      }

      outputAnimationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(outputAnimationFrameId);
  }, [audioEngine, gain]);

  return (
    <div className="container">
      <h1>AmbiViz Phase 2</h1>
      <div style={{ marginBottom: '20px' }}>
        <FileLoader onFileLoaded={handleFileLoaded} />
      </div>

      <div className="viz-container">
        <h3>Spherical Harmonics Visualization (Order 3)</h3>
        <div
          ref={containerRef}
          style={{
            width: '800px',
            height: '600px',
            margin: '0 auto',
            border: '1px solid #444',
            background: '#000',
            position: 'relative'
          }}
        />
        <div style={{ marginTop: '10px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
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
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p><strong>Instructions:</strong> Drag and drop a 4, 9, or 16 channel file.</p>
        <p><strong>Checkpoint 2 Validation:</strong></p>
        <ul>
          <li><strong>"Spiky Ball"</strong>: The sphere should deform and point towards the sound source.</li>
          <li>Front = Right on Screen (Initially), depending on Camera.</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
