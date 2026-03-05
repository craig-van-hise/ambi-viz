import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ambisonicVertexShader, ambisonicFragmentShader } from './shaders/ambisonic';
import { sphereDeformationVertexShader, sphereDeformationFragmentShader } from './shaders/sphereDeformation';
import { Throttle } from '../utils/Throttle';

export type ViewMode = 'inside' | 'outside';
export type VisualizationMode = 'volumetric' | 'sphere';

export class AmbiScene {
    container: HTMLElement;
    scene: THREE.Scene;
    helperScene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    volumetricMaterial: THREE.ShaderMaterial;
    volumetricMesh: THREE.Mesh;
    sphereMaterial: THREE.ShaderMaterial;
    sphereMesh: THREE.Mesh;
    controls: OrbitControls;

    // Resolution scaling
    renderTargetA: THREE.WebGLRenderTarget | null = null;
    renderTargetB: THREE.WebGLRenderTarget | null = null;
    pingPong: boolean = true;
    compositeMaterial: THREE.ShaderMaterial | null = null;
    compositeScene: THREE.Scene | null = null;
    compositeCamera: THREE.OrthographicCamera | null = null;
    resolutionScale: number;

    // View & Visualization mode
    visualizationMode: VisualizationMode = 'volumetric';
    private _hasReceivedData: boolean = false;
    viewMode: ViewMode = 'inside';
    onFovChange: ((fov: number) => void) | null = null;

    // Animation state
    rafId: number | null = null;
    private readonly DEFAULT_OUTSIDE_FOV = 60;
    private insideFov = 150;
    private outsideFov = this.DEFAULT_OUTSIDE_FOV;
    private outsidePositionCache = new THREE.Vector3(0, 3.3, 3.6);

    // Head tracking & UI Sync State
    public headTrackingQuat: THREE.Quaternion | null = null;
    public isUserDraggingSlider: boolean = false;
    public onCameraStateChange?: (state: any) => void;
    private uiSyncThrottle = new Throttle(20); // Sync at 20 FPS

    // Head tracking visual indicators
    private ghostArrow: THREE.ArrowHelper | null = null;      // Raw MediaPipe (cyan, semi-transparent)
    private predictedArrow: THREE.ArrowHelper | null = null;   // ESKF predicted (green, solid)

    private currentRoll: number = 0;
    private resizeObserver: ResizeObserver | null = null;
    private boundOnWheel = this.onWheel.bind(this);

    constructor(container: HTMLElement, resolutionScale: number = 0.6) {
        this.container = container;
        this.resolutionScale = Math.max(0.25, Math.min(1.0, resolutionScale));

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.helperScene = new THREE.Scene();

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(this.insideFov, width / height, 0.01, 1000);
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

        // 5. Volumetric Shader Material
        this.volumetricMaterial = new THREE.ShaderMaterial({
            vertexShader: ambisonicVertexShader,
            fragmentShader: ambisonicFragmentShader,
            uniforms: {
                uCovariance: { value: Array(64).fill(0).map(() => new THREE.Vector4()) },
                uOrder: { value: 1 },
                uGain: { value: 1.0 },
                uOpacity: { value: 1.0 },
                uDensityThreshold: { value: 0.05 },
                uDensityMult: { value: 1.0 },
                uEmissionMult: { value: 1.0 },
                uHeatmapKnee: { value: 0.5 },
                uEdgeFalloff: { value: 1.0 },
                tPreviousFrame: { value: null },
                uDissipationRate: { value: 0.9 },
                uResolution: { value: new THREE.Vector2() },
                u_isInsideView: { value: true },
                u_cameraWorldMatrix: { value: new THREE.Matrix4() },
            },
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
        });

        // Default to inside-out view
        this.setViewMode('inside');

        // 6. Geometry — BoxGeometry encompassing camera
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        this.volumetricMesh = new THREE.Mesh(geometry, this.volumetricMaterial);
        this.volumetricMesh.visible = false; // Hidden until first real data arrives
        this.scene.add(this.volumetricMesh);

        // 6.5. Sphere Deformation Shader Material
        this.sphereMaterial = new THREE.ShaderMaterial({
            vertexShader: sphereDeformationVertexShader,
            fragmentShader: sphereDeformationFragmentShader,
            uniforms: {
                uCovariance: { value: new Float32Array(256) },
                uOrder: { value: 1 },
                uGain: { value: 1.0 },
                uOpacity: { value: 1.0 },
                u_isInsideView: { value: true },
                u_resolution: { value: new THREE.Vector2(width, height) }
            },
            transparent: true,
            side: THREE.DoubleSide
        });
        const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
        this.sphereMesh = new THREE.Mesh(sphereGeometry, this.sphereMaterial);
        this.sphereMesh.visible = false;
        this.scene.add(this.sphereMesh);

        // Helpers (added to helperScene for 1:1 resolution rendering)
        const axesHelper = new THREE.AxesHelper(2);
        this.helperScene.add(axesHelper);

        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x888888);
        this.helperScene.add(gridHelper);

        this.addOrientationLabels();

        // 7. Head tracking indicators (hidden by default)
        this.initTrackingIndicators();

        // 8. Events
        this.resizeObserver = new ResizeObserver(() => {
            this.onResize();
        });
        this.resizeObserver.observe(this.container);
        this.container.addEventListener('wheel', this.boundOnWheel, { passive: false, capture: true });

        // Start Loop
        this.animate();
    }

    private setupRenderTarget(width: number, height: number) {
        const rtWidth = Math.max(1, Math.floor(width * this.resolutionScale));
        const rtHeight = Math.max(1, Math.floor(height * this.resolutionScale));

        if (this.renderTargetA) this.renderTargetA.dispose();
        if (this.renderTargetB) this.renderTargetB.dispose();

        const options = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        };

        this.renderTargetA = new THREE.WebGLRenderTarget(rtWidth, rtHeight, options);
        this.renderTargetB = new THREE.WebGLRenderTarget(rtWidth, rtHeight, options);

        // Clear both FBOs to transparent black to prevent garbage on first frame
        this.renderer.setRenderTarget(this.renderTargetA);
        this.renderer.clear();
        this.renderer.setRenderTarget(this.renderTargetB);
        this.renderer.clear();
        this.renderer.setRenderTarget(null);

        if (this.volumetricMaterial && this.volumetricMaterial.uniforms.uResolution) {
            this.volumetricMaterial.uniforms.uResolution.value.set(rtWidth, rtHeight);
        }

        // Composite pass: full-screen quad that displays the low-res render target
        if (!this.compositeScene) {
            this.compositeScene = new THREE.Scene();
            this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            this.compositeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: this.renderTargetA.texture },
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
            this.compositeMaterial.uniforms.tDiffuse.value = this.renderTargetA.texture;
        }
    }

    setVisualizationMode(mode: VisualizationMode) {
        this.visualizationMode = mode;
        if (mode === 'volumetric') {
            this.volumetricMesh.visible = this._hasReceivedData;
            this.sphereMesh.visible = false;
        } else {
            this.volumetricMesh.visible = false;
            this.sphereMesh.visible = this._hasReceivedData;
        }
    }

    setViewMode(mode: ViewMode) {
        // Cache current position if leaving outside mode
        if (this.viewMode === 'outside') {
            this.outsidePositionCache.copy(this.camera.position);
        }

        this.viewMode = mode;
        this.volumetricMaterial.uniforms.u_isInsideView.value = (mode === 'inside');
        if (this.sphereMaterial) {
            this.sphereMaterial.uniforms.u_isInsideView.value = (mode === 'inside');
        }

        if (mode === 'inside') {
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
            // Restore from cache
            this.camera.position.copy(this.outsidePositionCache);
            this.controls.target.set(0, 0, 0);
            this.controls.enablePan = false; // Permanently disabled
            this.controls.enableZoom = false; // Disable distance zoom to use FOV zoom exclusively
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;
        }

        const targetFov = mode === 'inside' ? this.insideFov : this.outsideFov;
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    createLabel(text: string, position: THREE.Vector3) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        context.fillStyle = 'rgba(0,0,0,0)';
        // High-DPI labels
        canvas.width = 512;
        canvas.height = 128;

        context.fillStyle = 'white';
        context.font = 'bold 80px Inter, Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 256, 64);

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

        this.helperScene.add(sprite);
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
        this.helperScene.add(this.ghostArrow);

        // Predicted arrow — solid green (ESKF output)
        this.predictedArrow = new THREE.ArrowHelper(
            defaultDir, origin, arrowLength, 0x00e676, headLength, headWidth
        );
        this.predictedArrow.visible = false;
        this.helperScene.add(this.predictedArrow);
    }

    private visTempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    private visTempQuat = new THREE.Quaternion();
    private visForward = new THREE.Vector3(0, 0, -1);
    private visTempDir = new THREE.Vector3();

    /**
     * Update the tracking indicator arrows with fresh quaternions from the SAB.
     * Called each frame from the main thread when tracking is active.
     */
    updateTrackingIndicators(rawQuat: THREE.Quaternion, predQuat: THREE.Quaternion) {
        if (this.ghostArrow) {
            this.visTempEuler.setFromQuaternion(rawQuat, 'YXZ');
            this.visTempEuler.x *= -1;
            this.visTempQuat.setFromEuler(this.visTempEuler);

            this.visTempDir.copy(this.visForward).applyQuaternion(this.visTempQuat);
            this.ghostArrow.setDirection(this.visTempDir);
        }

        if (this.predictedArrow) {
            this.visTempEuler.setFromQuaternion(predQuat, 'YXZ');
            this.visTempEuler.x *= -1;
            this.visTempQuat.setFromEuler(this.visTempEuler);

            this.visTempDir.copy(this.visForward).applyQuaternion(this.visTempQuat);
            this.predictedArrow.setDirection(this.visTempDir);
        }
    }

    /** Show or hide the tracking indicator arrows */
    setTrackingIndicatorsVisible(visible: boolean) {
        if (this.ghostArrow) this.ghostArrow.visible = visible;
        if (this.predictedArrow) this.predictedArrow.visible = visible;
    }

    // Volumetric Parameter Setters / Getters
    setDensityThreshold(val: number) { this.volumetricMaterial.uniforms.uDensityThreshold.value = Number(val) || 0; }
    getDensityThreshold(): number { return this.volumetricMaterial.uniforms.uDensityThreshold.value; }

    setDensityMult(val: number) { this.volumetricMaterial.uniforms.uDensityMult.value = Number(val) || 0; }
    getDensityMult(): number { return this.volumetricMaterial.uniforms.uDensityMult.value; }

    setEmissionMult(val: number) { this.volumetricMaterial.uniforms.uEmissionMult.value = Number(val) || 0; }
    getEmissionMult(): number { return this.volumetricMaterial.uniforms.uEmissionMult.value; }

    setHeatmapKnee(val: number) { this.volumetricMaterial.uniforms.uHeatmapKnee.value = Number(val) || 0; }
    getHeatmapKnee(): number { return this.volumetricMaterial.uniforms.uHeatmapKnee.value; }

    setEdgeFalloff(val: number) { this.volumetricMaterial.uniforms.uEdgeFalloff.value = Number(val) || 0; }
    getEdgeFalloff(): number { return this.volumetricMaterial.uniforms.uEdgeFalloff.value; }

    setDissipationRate(val: number) { this.volumetricMaterial.uniforms.uDissipationRate.value = Number(val) || 0; }
    getDissipationRate(): number { return this.volumetricMaterial.uniforms.uDissipationRate.value; }

    updateCovariance(cov: Float32Array, order: number, gain: number = 1.0) {
        // Show the active mesh on first real data
        if (!this._hasReceivedData) {
            this._hasReceivedData = true;
            if (this.visualizationMode === 'volumetric') {
                this.volumetricMesh.visible = true;
            } else {
                this.sphereMesh.visible = true;
            }
        }

        if (this.visualizationMode === 'volumetric') {
            if (this.volumetricMaterial.isShaderMaterial) {
                // Pack flat covariance into 64 Vector4s for the shader
                const vec4Array = this.volumetricMaterial.uniforms.uCovariance.value as THREE.Vector4[];
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
                this.volumetricMaterial.uniforms.uOrder.value = order;
                this.volumetricMaterial.uniforms.uGain.value = gain;
            }
        } else {
            // Sphere Deformation fallback
            let safeCov = cov;
            if (cov.length < 256) {
                safeCov = new Float32Array(256);
                safeCov.set(cov);
            }
            this.sphereMaterial.uniforms.uCovariance.value = safeCov;
            this.sphereMaterial.uniforms.uOrder.value = order;
            this.sphereMaterial.uniforms.uGain.value = gain;
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

        if (this.sphereMaterial && this.sphereMaterial.uniforms.u_resolution) {
            this.sphereMaterial.uniforms.u_resolution.value.set(width, height);
        }

        // Update render target to match new size
        this.setupRenderTarget(width, height);
    }

    onWheel(e: WheelEvent) {

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

    setFov(fov: number, source: 'ui' | 'internal' = 'internal') {
        const targetState = this.viewMode === 'inside' ? this.insideFov : this.outsideFov;
        if (Math.abs(targetState - fov) < 0.001 && Math.abs(this.camera.fov - fov) < 0.001) return;

        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();

        if (source === 'internal' && this.onFovChange) {
            this.onFovChange(fov);
        }
    }

    /** Returns the camera quaternion with pitch UN-INVERTED (natural convention for SAB) */
    getNaturalQuaternion(): THREE.Quaternion {
        const q = this.camera.quaternion.clone();
        const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        euler.x *= -1; // Un-invert pitch
        return q.setFromEuler(euler);
    }

    animate() {
        this.rafId = requestAnimationFrame(this.animate.bind(this));

        const now = performance.now();

        // 1. Head Tracking Drive (Phase 1 & 3)
        if (this.headTrackingQuat && !this.isUserDraggingSlider) {
            if (this.viewMode === 'outside') {
                // In Outside view, camera is unaffected by head tracking.
                // The head movement is visualized by the arrows only.
            } else if (this.viewMode === 'inside') {
                // In Inside view, camera is LOCKED if tracking is active.
                // The head movement is visualized by the arrows (Phase 3).
                this.camera.rotation.set(0, 0, 0);
                this.camera.position.set(0, 0, 0);
                this.camera.up.set(0, 1, 0);
                this.controls.target.set(0, 0, -1);
            }
        }

        if (this.controls) {
            this.controls.update();

            // Final lookAt to ensure camera.up is respected in inside mode
            if (this.viewMode === 'inside' && !this.headTrackingQuat) {
                this.camera.lookAt(this.controls.target);
            }
        }

        // Hard lock for inside view to prevent drift (even if not tracking, we keep it at origin)
        if (this.viewMode === 'inside') {
            if (this.camera.position.lengthSq() > 0.000001) {
                // Manual movement from OrbitControls detected
                const dir = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).normalize();
                this.controls.target.copy(dir);
                this.camera.position.set(0, 0, 0);
                this.camera.lookAt(this.controls.target);
            } else {
                this.camera.position.set(0, 0, 0);
            }
        }

        this.volumetricMaterial.uniforms.u_cameraWorldMatrix.value.copy(this.camera.matrixWorld);

        // 2. Render Loop UI Synchronization (Phase 1 Sync)
        // Extract Eulers and send back to React UI for slider feedback
        if (this.onCameraStateChange && !this.isUserDraggingSlider && this.uiSyncThrottle.shouldUpdate(now)) {
            let displayYaw: number;
            let displayPitch: number;
            let displayRoll: number;

            if (this.viewMode === 'inside' && this.headTrackingQuat) {
                // When tracking and inside, sliders reflect the tracker directly
                const euler = new THREE.Euler().setFromQuaternion(this.headTrackingQuat, 'YXZ');
                displayYaw = euler.y;
                displayPitch = euler.x;
                displayRoll = euler.z;
            } else {
                // Otherwise sliders reflect the camera's actual rotation
                // Note: camera.rotation.x is inverted in this app's convention
                displayYaw = this.camera.rotation.y;
                displayPitch = this.camera.rotation.x * -1;
                displayRoll = this.currentRoll;
            }

            this.onCameraStateChange({
                yaw: displayYaw * (180 / Math.PI),
                pitch: displayPitch * (180 / Math.PI),
                roll: displayRoll * (180 / Math.PI),
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            });
        }

        if (this.visualizationMode === 'volumetric' && this.renderTargetA && this.renderTargetB && this.compositeScene && this.compositeCamera) {
            const currentTarget = this.pingPong ? this.renderTargetA : this.renderTargetB;
            const previousTarget = this.pingPong ? this.renderTargetB : this.renderTargetA;

            // Pass previous frame to shader for temporal dissipation
            this.volumetricMaterial.uniforms.tPreviousFrame.value = previousTarget.texture;

            // Pass 1: Render volumetric scene to current render target
            this.renderer.setRenderTarget(currentTarget);
            this.renderer.render(this.scene, this.camera);

            // Pass 2: Composite current target to full-res canvas
            if (this.compositeMaterial) {
                this.compositeMaterial.uniforms.tDiffuse.value = currentTarget.texture;
            }
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.compositeScene, this.compositeCamera);

            // Pass 3: Overlay high-res helpers (grid, text, arrows) at 1:1 resolution
            this.renderer.autoClear = false;
            this.renderer.render(this.helperScene, this.camera);
            this.renderer.autoClear = true;

            // Swap FBOs for next frame
            this.pingPong = !this.pingPong;
        } else {
            // Fallback or Sphere mode bypasses the composite pass to run at native resolution
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.scene, this.camera);

            // Still overlay helpers
            this.renderer.autoClear = false;
            this.renderer.render(this.helperScene, this.camera);
            this.renderer.autoClear = true;
        }
    }

    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.container.removeEventListener('wheel', this.boundOnWheel, { capture: true } as any);

        this.renderer.dispose();
        if (this.renderTargetA) this.renderTargetA.dispose();
        if (this.renderTargetB) this.renderTargetB.dispose();
        if (this.volumetricMaterial.dispose) this.volumetricMaterial.dispose();
        if (this.sphereMaterial.dispose) this.sphereMaterial.dispose();
        if (this.compositeMaterial) this.compositeMaterial.dispose();
        if (this.controls) this.controls.dispose();

        this.container.removeChild(this.renderer.domElement);
    }
}
