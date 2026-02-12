import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// @ts-ignore
import { ambisonicVertexShader, ambisonicFragmentShader } from './shaders/ambisonic';

export class AmbiScene {
    container: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    material: THREE.ShaderMaterial;
    mesh: THREE.Mesh;
    controls: any; // Use any to bypass strict type checks for now if types missing

    // Animation state
    rafId: number | null = null;

    constructor(container: HTMLElement) {
        this.container = container;

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 2.5;

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // 3. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 4. Shader Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: ambisonicVertexShader,
            fragmentShader: ambisonicFragmentShader,
            uniforms: {
                uCovariance: { value: new Float32Array(256) },
                uOrder: { value: 1 },
                uGain: { value: 1.0 },
                uOpacity: { value: 1.0 }
            },
            transparent: true,
            side: THREE.DoubleSide
        });

        // 5. Geometry
        // High segment count for smooth displacement
        const geometry = new THREE.SphereGeometry(1, 128, 128);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);

        // Helpers for Orientation
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);

        // Grid on XZ plane (Visual Floor) -> Y is Up?
        // Let's put grid on XZ.
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);

        this.addOrientationLabels();

        // 5. Events
        window.addEventListener('resize', this.onResize.bind(this));

        // Start Loop
        this.animate();
    }

    createLabel(text: string, position: THREE.Vector3) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0,0,0,0)'; // Transparent background
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
        sprite.scale.set(2, 0.5, 1); // Aspect ratio match

        this.scene.add(sprite);
    }

    addOrientationLabels() {
        // Based on revised mapping:
        // Visual Front is -Z
        // Visual Back is +Z
        // Visual Left is -X
        // Visual Right is +X

        const dist = 1.5;
        this.createLabel("FRONT", new THREE.Vector3(0, 0, -dist));
        this.createLabel("BACK", new THREE.Vector3(0, 0, dist));
        this.createLabel("LEFT", new THREE.Vector3(-dist, 0, 0));
        this.createLabel("RIGHT", new THREE.Vector3(dist, 0, 0));
        this.createLabel("UP", new THREE.Vector3(0, dist, 0));
    }

    updateCovariance(cov: Float32Array, order: number, gain: number = 1.0) {
        // Pad to 256 if needed
        let safeCov = cov;
        if (cov.length < 256) {
            safeCov = new Float32Array(256);
            safeCov.set(cov);
        }

        this.material.uniforms.uCovariance.value = safeCov;
        this.material.uniforms.uOrder.value = order;
        this.material.uniforms.uGain.value = gain;
    }

    updateCoefficients(coeffs: Float32Array, order: number, gain: number = 1.0) {
        // Deprecated or used for legacy visualizer? 
        // We'll leave it but the shader now uses uCovariance.
        // If shader uses uCovariance, setting uCoeffs does nothing unless we revert shader.
        // But we Updated shader to use uCovariance.
    }

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        this.rafId = requestAnimationFrame(this.animate.bind(this));

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.onResize.bind(this));

        this.renderer.dispose();
        // @ts-ignore
        if (this.material.dispose) this.material.dispose();
        if (this.controls) this.controls.dispose();

        this.container.removeChild(this.renderer.domElement);
    }
}
