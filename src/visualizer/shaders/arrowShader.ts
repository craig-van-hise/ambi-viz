export const arrowVertexShader = `
uniform bool u_isInsideView;
uniform vec2 u_resolution;
uniform float u_fov;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Convert to view space (position relative to camera)
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    
    if (u_isInsideView) {
        // --- NON-LINEAR SPHERICAL PROJECTION (Inside View) ---
        
        // 1. Get the direction from the camera to the vertex in view space
        vec3 dir = normalize(viewPosition.xyz);
        
        // 2. Map direction to Spherical Angles (Yaw and Pitch)
        // In Three.js view space: -Z is forward, +X is right, +Y is up
        float yaw = atan(dir.x, -dir.z); 
        float pitch = asin(dir.y);
        
        // 3. Aspect Ratio and FOV Correction
        float aspect = u_resolution.x / u_resolution.y;
        float fovScale = (u_fov * 3.14159265 / 180.0) * 0.5;
        
        // 4. Map angles to Normalized Device Coordinates (NDC: -1.0 to 1.0)
        vec2 ndc = vec2(yaw / (fovScale * aspect), pitch / fovScale);
        
        // 5. DIRECT CLIP-SPACE OUTPUT (Bypassing perspective divide)
        gl_Position = vec4(ndc, 0.5, 1.0);
        
    } else {
        // --- STANDARD PERSPECTIVE PROJECTION (Outside View) ---
        gl_Position = projectionMatrix * viewPosition;
    }
}
`;

export const arrowFragmentShader = `
uniform vec3 u_color;
uniform float u_opacity;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    // Basic diffuse lighting so the arrow has depth
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0)); // Fixed light relative to view
    float light = max(dot(vNormal, lightDir), 0.2); // Add some ambient light
    
    gl_FragColor = vec4(u_color * light, u_opacity);
}
`;
