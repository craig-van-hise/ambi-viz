import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ambisonicVertexShader, ambisonicFragmentShader } from './shaders/ambisonic';
import { Throttle } from '../utils/Throttle';

export type ViewMode = 'inside' | 'outside';

export class AmbiScene {
    container: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    material: THREE.ShaderMaterial;
    mesh: THREE.Mesh;
    controls: OrbitControls;

    // Resolution scaling
    renderTarget: THREE.WebGLRenderTarget | null = null;
    compositeMaterial: THREE.ShaderMaterial | null = null;
    compositeScene: THREE.Scene | null = null;
    compositeCamera: THREE.OrthographicCamera | null = null;
    resolutionScale: number;

    // View mode
    viewMode: ViewMode = 'inside';
    onFovChange: ((fov: number) => void) | null = null;

    // Animation state
    rafId: number | null = null;
    private readonly DEFAULT_OUTSIDE_FOV = 50;
    private insideFov = 75;
    private outsidePositionCache = new THREE.Vector3(0, 0, 2.5);

    // Head tracking & UI Sync State
    public headTrackingQuat: THREE.Quaternion | null = null;
    public isUserDraggingSlider: boolean = false;
    public onCameraStateChange?: (state: any) => void;
    private uiSyncThrottle = new Throttle(20); // Sync at 20 FPS

    // Head tracking visual indicators
    private ghostArrow: THREE.ArrowHelper | null = null;      // Raw MediaPipe (cyan, semi-transparent)
    private predictedArrow: THREE.ArrowHelper | null = null;   // ESKF predicted (green, solid)

    private currentRoll: number = 0;

    constructor(container: HTMLElement, resolutionScale: number = 0.6) {
        this.container = container;
        this.resolutionScale = Math.max(0.25, Math.min(1.0, resolutionScale));

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);
        this.camera.rotation.order = 'YXZ'; // Yaw, then Pitch, then Roll

        // 2. Renderer — pixel ratio capped at 1.0 for M1 performance
        const canvas = document.createElement('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(1.0);
        container.appendChild(this.renderer.domElement);

        // 3. Resolution scaling: render volumetric to a smaller target
        this.setupRenderTarget(width, height);

        // 4. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Default to inside-out view
        this.setViewMode('inside');

        // 5. Shader Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: ambisonicVertexShader,
            fragmentShader: ambisonicFragmentShader,
            uniforms: {
                uCovariance: { value: Array(64).fill(0).map(() => new THREE.Vector4()) },
                uOrder: { value: 1 },
                uGain: { value: 1.0 },
                uOpacity: { value: 1.0 },
            },
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
        });

        // 6. Geometry — BoxGeometry encompassing camera
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);

        // Helpers
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);

        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);

        this.addOrientationLabels();

        // 7. Head tracking indicators (hidden by default)
        this.initTrackingIndicators();

        // 8. Events
        window.addEventListener('resize', this.onResize.bind(this));
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Start Loop
        this.animate();
    }

    private setupRenderTarget(width: number, height: number) {
        const rtWidth = Math.max(1, Math.floor(width * this.resolutionScale));
        const rtHeight = Math.max(1, Math.floor(height * this.resolutionScale));

        if (this.renderTarget) this.renderTarget.dispose();

        this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        });

        // Composite pass: full-screen quad that displays the low-res render target
        if (!this.compositeScene) {
            this.compositeScene = new THREE.Scene();
            this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            this.compositeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: this.renderTarget.texture },
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    varying vec2 vUv;
                    void main() {
                        gl_FragColor = texture2D(tDiffuse, vUv);
                    }
                `,
                depthTest: false,
                depthWrite: false,
            });

            const quad = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                this.compositeMaterial
            );
            this.compositeScene.add(quad);
        } else if (this.compositeMaterial) {
            this.compositeMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
        }
    }

    setViewMode(mode: ViewMode) {
        // Cache current position if leaving outside mode
        if (this.viewMode === 'outside') {
            this.outsidePositionCache.copy(this.camera.position);
        }

        this.viewMode = mode;

        if (mode === 'inside') {
            // Restore inside FOV
            this.camera.fov = this.insideFov;
            // Camera exactly at origin
            this.camera.position.set(0, 0, 0);
            // Push target forward to prevent distance=0 singularity
            this.controls.target.set(0, 0, -1);
            // 3DoF rotation only — no pan or zoom
            this.controls.enablePan = false;
            this.controls.enableZoom = false;
            this.controls.minDistance = 0;
            this.controls.maxDistance = 10; // Allow target projection
            this.currentRoll = 0;
            this.camera.up.set(0, 1, 0);
        } else {
            // Force standard perspective for outside view
            this.camera.fov = this.DEFAULT_OUTSIDE_FOV;
            // Restore from cache
            this.camera.position.copy(this.outsidePositionCache);
            this.controls.target.set(0, 0, 0);
            this.controls.enablePan = false; // Permanently disabled
            this.controls.enableZoom = true;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;
        }

        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    createLabel(text: string, position: THREE.Vector3) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, 256, 64);

        context.fillStyle = 'white';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            transparent: true,
        });
        const sprite = new THREE.Sprite(material);

        sprite.position.copy(position);
        sprite.scale.set(2, 0.5, 1);
        sprite.renderOrder = 100;

        this.scene.add(sprite);
    }

    addOrientationLabels() {
        const dist = 1.5;
        this.createLabel("FRONT", new THREE.Vector3(0, 0, -dist));
        this.createLabel("BACK", new THREE.Vector3(0, 0, dist));
        this.createLabel("LEFT", new THREE.Vector3(-dist, 0, 0));
        this.createLabel("RIGHT", new THREE.Vector3(dist, 0, 0));
        this.createLabel("UP", new THREE.Vector3(0, dist, 0));
    }

    /** Create ghost (raw) and predicted arrow helpers, hidden by default */
    private initTrackingIndicators() {
        const origin = new THREE.Vector3(0, 0, 0);
        const defaultDir = new THREE.Vector3(0, 0, -1);
        const arrowLength = 1.8;
        const headLength = 0.3;
        const headWidth = 0.15;

        // Ghost arrow — semi-transparent cyan (raw MediaPipe data)
        this.ghostArrow = new THREE.ArrowHelper(
            defaultDir, origin, arrowLength, 0x00e5ff, headLength, headWidth
        );
        this.ghostArrow.line.material = new THREE.LineBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.35,
        });
        (this.ghostArrow.cone.material as THREE.MeshBasicMaterial).transparent = true;
        (this.ghostArrow.cone.material as THREE.MeshBasicMaterial).opacity = 0.35;
        this.ghostArrow.visible = false;
        this.scene.add(this.ghostArrow);

        // Predicted arrow — solid green (ESKF output)
        this.predictedArrow = new THREE.ArrowHelper(
            defaultDir, origin, arrowLength, 0x00e676, headLength, headWidth
        );
        this.predictedArrow.visible = false;
        this.scene.add(this.predictedArrow);
    }

    /**
     * Update the tracking indicator arrows with fresh quaternions from the SAB.
     * Called each frame from the main thread when tracking is active.
     */
    updateTrackingIndicators(rawQuat: THREE.Quaternion, predQuat: THREE.Quaternion) {
        const forward = new THREE.Vector3(0, 0, -1);

        if (this.ghostArrow) {
            const rawDir = forward.clone().applyQuaternion(rawQuat);
            this.ghostArrow.setDirection(rawDir);
        }

        if (this.predictedArrow) {
            const predDir = forward.clone().applyQuaternion(predQuat);
            this.predictedArrow.setDirection(predDir);
        }
    }

    /** Show or hide the tracking indicator arrows */
    setTrackingIndicatorsVisible(visible: boolean) {
        if (this.ghostArrow) this.ghostArrow.visible = visible;
        if (this.predictedArrow) this.predictedArrow.visible = visible;
    }

    updateCovariance(cov: Float32Array, order: number, gain: number = 1.0) {
        if (this.material.isShaderMaterial) {
            // Pack flat covariance into 64 Vector4s for the shader
            const vec4Array = this.material.uniforms.uCovariance.value as THREE.Vector4[];
            for (let i = 0; i < 64; i++) {
                const baseIdx = i * 4;
                // Only fill values within the actual covariance matrix bounds
                // The covariance is nCh×nCh, packed row-major
                // Each row of the 16×16 matrix is split across 4 vec4s
                if (baseIdx + 3 < cov.length) {
                    vec4Array[i].set(cov[baseIdx], cov[baseIdx + 1], cov[baseIdx + 2], cov[baseIdx + 3]);
                } else {
                    vec4Array[i].set(0, 0, 0, 0);
                }
            }
            this.material.uniforms.uOrder.value = order;
            this.material.uniforms.uGain.value = gain;
        }
    }

    updateCoefficients(): void {
        // Deprecated — shader uses uCovariance via computeDirectionalEnergy()
    }

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update render target to match new size
        this.setupRenderTarget(width, height);
    }

    onWheel(e: WheelEvent) {
        if (this.viewMode !== 'inside' || (!e.metaKey && !e.ctrlKey)) return;

        e.preventDefault();

        // 1. Calculate target FOV change
        const zoomSpeed = 0.05;
        let targetFov = this.camera.fov + e.deltaY * zoomSpeed;

        // 2. Bounding: Min 20 deg, Max 160 deg Horizontal FOV
        const minFovV = 20;
        const maxFovH = 160; // Degrees
        const maxFovV = 2 * Math.atan(Math.tan(maxFovH * Math.PI / 360) / this.camera.aspect) * (180 / Math.PI);

        // 3. Clamp and apply
        this.setFov(Math.max(minFovV, Math.min(maxFovV, targetFov)));
    }

    updateFromUI(axis: string, value: number) {
        // 1. Strict Number Coercion (Value is already a number from React, but we ensure it's safe)
        if (isNaN(value)) return;

        if (axis === 'yaw' || axis === 'pitch' || axis === 'roll') {
            const rad = value * (Math.PI / 180);

            // 2. Singularity Prevention: Clamp pitch to avoid OrbitControls matrix collapse
            // Max pitch slightly less than 90 degrees (~1.56 radians)
            const MAX_PITCH = (Math.PI / 2) - 0.01;

            if (axis === 'yaw') this.camera.rotation.y = rad;
            if (axis === 'pitch') {
                // Phase 2: Pitch Inversion (Invert UI input before storing in camera)
                const correctedRad = rad * -1;
                this.camera.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, correctedRad));
            }
            if (axis === 'roll') {
                this.currentRoll = rad;
                // We don't set camera.rotation.z directly as OrbitControls uses camera.up
            }

            if (this.viewMode === 'inside') {
                // Apply dynamic camera.up for visual Roll
                this.camera.up.set(-Math.sin(this.currentRoll), Math.cos(this.currentRoll), 0).normalize();

                // Keep camera locked at origin before update
                this.camera.position.set(0, 0, 0);

                // Project a forward vector based on the new rotation
                const forward = new THREE.Vector3(0, 0, -1);
                forward.applyEuler(this.camera.rotation);

                // Move the OrbitControls target to this new forward position (exactly 1 unit away)
                this.controls.target.copy(forward);

                // Force OrbitControls to recalculate
                this.controls.update();

                // Final lookAt to ensure camera.up is respected
                this.camera.lookAt(this.controls.target);

                // Aggressively reset position to origin to prevent OrbitControls drift
                this.camera.position.set(0, 0, 0);
            }
        } else {
            if (axis === 'x') this.camera.position.x = value;
            if (axis === 'y') this.camera.position.y = value;
            if (axis === 'z') this.camera.position.z = value;
            // Target is already (0,0,0) from setViewMode
            this.controls.update();
        }
    }

    setFov(fov: number) {
        this.insideFov = fov;
        if (this.viewMode === 'inside') {
            this.camera.fov = fov;
            this.camera.updateProjectionMatrix();
        }
        if (this.onFovChange) {
            this.onFovChange(fov);
        }
    }

    animate() {
        this.rafId = requestAnimationFrame(this.animate.bind(this));

        const now = performance.now();

        // 1. Head Tracking Drive (Phase 1)
        // Apply webcam rotation to camera if in inside mode and not manually dragging
        if (this.viewMode === 'inside' && this.headTrackingQuat && !this.isUserDraggingSlider) {
            // Phase 2: Pitch Inversion (Tracker -> Camera)
            const euler = new THREE.Euler().setFromQuaternion(this.headTrackingQuat, 'YXZ');
            euler.x *= -1; // Invert Pitch
            this.currentRoll = euler.z; // Store Roll for camera.up
            this.camera.quaternion.setFromEuler(euler);

            // Project the forward vector for OrbitControls to follow
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.camera.quaternion);
            this.controls.target.copy(forward);

            // Aggressively lock position to origin
            this.camera.position.set(0, 0, 0);

            // Apply dynamic camera.up for visual Roll
            this.camera.up.set(-Math.sin(this.currentRoll), Math.cos(this.currentRoll), 0).normalize();
        }

        if (this.controls) {
            this.controls.update();

            // Final lookAt to ensure camera.up is respected in inside mode
            if (this.viewMode === 'inside') {
                this.camera.lookAt(this.controls.target);
            }
        }

        // Hard lock for inside view to prevent drift
        if (this.viewMode === 'inside') {
            this.camera.position.set(0, 0, 0);
        }

        // 2. Render Loop UI Synchronization (Phase 2)
        // Extract Eulers and send back to React UI for slider feedback
        if (this.onCameraStateChange && !this.isUserDraggingSlider && this.uiSyncThrottle.shouldUpdate(now)) {
            this.onCameraStateChange({
                yaw: this.camera.rotation.y * (180 / Math.PI),
                pitch: (this.camera.rotation.x * (180 / Math.PI)) * -1, // Invert back for UI
                roll: this.currentRoll * (180 / Math.PI),
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            });
        }

        if (this.renderTarget && this.compositeScene && this.compositeCamera) {
            // Pass 1: Render volumetric scene to low-res target
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);

            // Pass 2: Composite to full-res canvas
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.compositeScene, this.compositeCamera);
        } else {
            // Fallback: direct render
            this.renderer.render(this.scene, this.camera);
        }
    }

    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.onResize.bind(this));
        this.renderer.domElement.removeEventListener('wheel', this.onWheel.bind(this));

        this.renderer.dispose();
        if (this.renderTarget) this.renderTarget.dispose();
        if (this.material.dispose) this.material.dispose();
        if (this.compositeMaterial) this.compositeMaterial.dispose();
        if (this.controls) this.controls.dispose();

        this.container.removeChild(this.renderer.domElement);
    }
}
