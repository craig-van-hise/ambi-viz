import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ambisonicVertexShader, ambisonicFragmentShader } from './shaders/ambisonic';

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

    // Animation state
    rafId: number | null = null;

    constructor(container: HTMLElement, resolutionScale: number = 0.6) {
        this.container = container;
        this.resolutionScale = Math.max(0.25, Math.min(1.0, resolutionScale));

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);

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

        // 7. Events
        window.addEventListener('resize', this.onResize.bind(this));

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
        this.viewMode = mode;

        if (mode === 'inside') {
            // Camera at origin (tiny offset for OrbitControls stability)
            this.camera.position.set(0, 0, 0.001);
            this.controls.target.set(0, 0, 0);
            // 3DoF rotation only — no pan or zoom
            this.controls.enablePan = false;
            this.controls.enableZoom = false;
            this.controls.minDistance = 0;
            this.controls.maxDistance = 0.01;
        } else {
            // Outside view
            this.camera.position.set(0, 0, 2.5);
            this.controls.target.set(0, 0, 0);
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;
        }

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
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        sprite.position.copy(position);
        sprite.scale.set(2, 0.5, 1);

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

    animate() {
        this.rafId = requestAnimationFrame(this.animate.bind(this));

        if (this.controls) {
            this.controls.update();
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

        this.renderer.dispose();
        if (this.renderTarget) this.renderTarget.dispose();
        if (this.material.dispose) this.material.dispose();
        if (this.compositeMaterial) this.compositeMaterial.dispose();
        if (this.controls) this.controls.dispose();

        this.container.removeChild(this.renderer.domElement);
    }
}
