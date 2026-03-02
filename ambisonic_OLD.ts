export const ambisonicVertexShader = `
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
    vUv = uv;
    // Calculate world position of the vertex
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const ambisonicFragmentShader = `
varying vec3 vWorldPos;
varying vec2 vUv;

// Explicit precision
precision highp float;

// 16x16 Covariance Matrix packed into 64 vec4s
// Row i is stored in uCovariance[4*i]...uCovariance[4*i+3]
uniform vec4 uCovariance[64]; 
uniform int uOrder;
uniform float uGain; 
uniform float uOpacity;

// Constants
#define MAX_STEPS 32
#define STEP_SIZE 0.1
#define MAX_DIST 10.0

// SH Basis Function (Hardcoded for Order 3, ACN/SN3D)
float getSH(int i, vec3 d) {
    float x = -d.z; // Ambi X (Front = -Z in Three.js)
    float y = -d.x; // Ambi Y (Left  = -X in Three.js)
    float z =  d.y; // Ambi Z (Up    = +Y in Three.js)
    
    if (i==0) return 1.0;
    if (i==1) return y;
    if (i==2) return z;
    if (i==3) return x;
    
    if (i==4) return sqrt(3.0)*x*y;
    if (i==5) return sqrt(3.0)*y*z;
    if (i==6) return 0.5*(3.0*z*z - 1.0);
    if (i==7) return sqrt(3.0)*x*z;
    if (i==8) return sqrt(3.0)*0.5*(x*x - y*y);
    
    if (i==9) return sqrt(5.0/8.0)*y*(3.0*x*x - y*y);
    if (i==10) return sqrt(15.0)*x*y*z;
    if (i==11) return sqrt(3.0/8.0)*y*(5.0*z*z - 1.0);
    if (i==12) return 0.5*z*(5.0*z*z - 3.0);
    if (i==13) return sqrt(3.0/8.0)*x*(5.0*z*z - 1.0);
    if (i==14) return sqrt(15.0/4.0)*z*(x*x - y*y);
    if (i==15) return sqrt(5.0/8.0)*x*(x*x - 3.0*y*y);
    
    return 0.0;
}

// === DIRECTION-ONCE OPTIMIZATION ===
// Compute directional energy E = Y^T * C * Y for a given direction.
// This is evaluated ONCE per ray (per pixel), NOT per step.
float computeDirectionalEnergy(vec3 dir) {
    // Evaluate all 16 SH basis functions for this direction
    vec4 Y0 = vec4(getSH(0, dir), getSH(1, dir), getSH(2, dir), getSH(3, dir));
    vec4 Y1 = vec4(getSH(4, dir), getSH(5, dir), getSH(6, dir), getSH(7, dir));
    vec4 Y2 = vec4(getSH(8, dir), getSH(9, dir), getSH(10, dir), getSH(11, dir));
    vec4 Y3 = vec4(getSH(12, dir), getSH(13, dir), getSH(14, dir), getSH(15, dir));

    // Compute R = C * Y (matrix-vector multiply)
    // Row i of C is packed across uCovariance[4*i]..uCovariance[4*i+3]
    float r0 = dot(uCovariance[0], Y0) + dot(uCovariance[1], Y1) + dot(uCovariance[2], Y2) + dot(uCovariance[3], Y3);
    float r1 = dot(uCovariance[4], Y0) + dot(uCovariance[5], Y1) + dot(uCovariance[6], Y2) + dot(uCovariance[7], Y3);
    float r2 = dot(uCovariance[8], Y0) + dot(uCovariance[9], Y1) + dot(uCovariance[10], Y2) + dot(uCovariance[11], Y3);
    float r3 = dot(uCovariance[12], Y0) + dot(uCovariance[13], Y1) + dot(uCovariance[14], Y2) + dot(uCovariance[15], Y3);

    float r4 = dot(uCovariance[16], Y0) + dot(uCovariance[17], Y1) + dot(uCovariance[18], Y2) + dot(uCovariance[19], Y3);
    float r5 = dot(uCovariance[20], Y0) + dot(uCovariance[21], Y1) + dot(uCovariance[22], Y2) + dot(uCovariance[23], Y3);
    float r6 = dot(uCovariance[24], Y0) + dot(uCovariance[25], Y1) + dot(uCovariance[26], Y2) + dot(uCovariance[27], Y3);
    float r7 = dot(uCovariance[28], Y0) + dot(uCovariance[29], Y1) + dot(uCovariance[30], Y2) + dot(uCovariance[31], Y3);

    float r8 = dot(uCovariance[32], Y0) + dot(uCovariance[33], Y1) + dot(uCovariance[34], Y2) + dot(uCovariance[35], Y3);
    float r9 = dot(uCovariance[36], Y0) + dot(uCovariance[37], Y1) + dot(uCovariance[38], Y2) + dot(uCovariance[39], Y3);
    float r10 = dot(uCovariance[40], Y0) + dot(uCovariance[41], Y1) + dot(uCovariance[42], Y2) + dot(uCovariance[43], Y3);
    float r11 = dot(uCovariance[44], Y0) + dot(uCovariance[45], Y1) + dot(uCovariance[46], Y2) + dot(uCovariance[47], Y3);

    float r12 = dot(uCovariance[48], Y0) + dot(uCovariance[49], Y1) + dot(uCovariance[50], Y2) + dot(uCovariance[51], Y3);
    float r13 = dot(uCovariance[52], Y0) + dot(uCovariance[53], Y1) + dot(uCovariance[54], Y2) + dot(uCovariance[55], Y3);
    float r14 = dot(uCovariance[56], Y0) + dot(uCovariance[57], Y1) + dot(uCovariance[58], Y2) + dot(uCovariance[59], Y3);
    float r15 = dot(uCovariance[60], Y0) + dot(uCovariance[61], Y1) + dot(uCovariance[62], Y2) + dot(uCovariance[63], Y3);

    // Compute E = Y dot R
    vec4 R0 = vec4(r0, r1, r2, r3);
    vec4 R1 = vec4(r4, r5, r6, r7);
    vec4 R2 = vec4(r8, r9, r10, r11);
    vec4 R3 = vec4(r12, r13, r14, r15);

    return dot(Y0, R0) + dot(Y1, R1) + dot(Y2, R2) + dot(Y3, R3);
}

void main() {
    // Raymarching Setup
    vec3 rayOrigin = cameraPosition;
    vec3 rayDir = normalize(vWorldPos - cameraPosition);

    // === DIRECTION-ONCE: Compute energy for this ray's relevant direction ===
    // Find the point on this ray closest to the origin (the sound field center).
    // This gives the correct angular direction for SH evaluation regardless of
    // camera distance, fixing gain attenuation in outside view.
    float tClosest = max(0.0, -dot(rayOrigin, rayDir));
    vec3 pClosest = rayOrigin + rayDir * tClosest;
    float closestDist = length(pClosest);
    
    // If closest approach is outside the volume, this ray misses entirely
    if (closestDist > 5.5) discard;
    
    // Use the direction from origin to the closest point for SH evaluation.
    // When camera is at origin, pClosest = rayDir * t, so normalize(pClosest) = rayDir (exact).
    // When camera is far, this correctly samples the sound field direction the ray passes through.
    vec3 shDir = closestDist > 0.001 ? normalize(pClosest) : rayDir;
    
    float energy = computeDirectionalEnergy(shDir);
    energy = max(energy, 0.0);
    float dirDensity = sqrt(energy) * uGain;

    // Early exit: no energy in this direction — skip entire ray
    if (dirDensity < 0.001) discard;

    // Raymarch: only sweep radial falloff (trivially cheap per step)
    float totalDensity = 0.0;
    vec3 accumulatedColor = vec3(0.0);
    float t = 0.1;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = rayOrigin + rayDir * t;
        float r = length(p);

        // Skip if outside bounding volume
        if (r > 6.0) {
            t += STEP_SIZE;
            continue;
        }

        // Radial falloff — the ONLY per-step computation
        float falloff = smoothstep(5.0, 0.0, r);
        float dens = dirDensity * falloff;

        if (dens > 0.005) {
            float absorption = dens * STEP_SIZE;

            // Heatmap Color
            float val = smoothstep(0.0, 1.0, dens);
            vec3 color = mix(vec3(0.0, 0.0, 0.5), vec3(0.0, 1.0, 1.0), val);
            color = mix(color, vec3(1.0, 1.0, 0.0), smoothstep(0.3, 0.6, val));
            color = mix(color, vec3(1.0, 0.0, 0.0), smoothstep(0.6, 1.0, val));

            float alphaStep = absorption;
            accumulatedColor += color * alphaStep * (1.0 - totalDensity);
            totalDensity += alphaStep;
        }

        if (totalDensity >= 0.99) break;
        t += STEP_SIZE;
        if (t > MAX_DIST) break;
    }

    // Final Opacity Check
    if (totalDensity <= 0.001) discard;

    gl_FragColor = vec4(accumulatedColor * 2.0, totalDensity * uOpacity);
}
`;
