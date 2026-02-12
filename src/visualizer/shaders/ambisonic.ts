export const ambisonicVertexShader = `
varying vec3 vNormal;
varying float vEnergy;
varying vec3 vPosition;
varying vec2 vUv;

uniform float uCovariance[256]; // 16x16 flattened covariance matrix
uniform int uOrder;
uniform float uGain; // To scale the displacement

// Constants
#define PI 3.14159265359

// SN3D Normalization Factors are already included in standard formulas if we use the right ones.
// ACN/SN3D:
// Order 0:
// 0: 1

// Order 1:
// 1: y (sin(theta)*sin(phi))
// 2: z (cos(theta)) 
// 3: x (sin(theta)*cos(phi))

// But wait, Three.js coordinates: Y is UP.
// Ambisonics usually: X=Front, Y=Left, Z=Up.
// Conversion needed? 
// Let's assume standard Three.js: 
// x = right, y = up, z = back (camera looks down -z).
// We might need to map them. 
// Standard Ambisonics (ACN): 
// X is Front, Y is Left, Z is Up.
// Three.js: 
// 0,0,1 is Z (Back)
// 1,0,0 is X (Right)
// 0,1,0 is Y (Up)
//
// If we want "Front" to be -Z in Three.js...
// Let's stick to standard math first and maybe rotate the sphere or camera.
// Function to get SH basis for direction (x,y,z)
// Using ACN channel ordering and SN3D normalization.

float getSH(int acnIndex, vec3 dir) {
    float x = dir.z; // X in Ambisonics = Forward. In ThreeJS -Z is Forward? Let's map X->-Z for now? 
                     // Or just use raw coords and rotate object.
                     // Let's use: Ambisonics X = ThreeJS X, Y=Y, Z=Z. 
                     // So "Front" is X-axis positive.
    
    // Re-mapping to match usual "Front" logic if needed.
    // Let's use direct mapping for now: x=x, y=y, z=z.
    
    float fx = dir.x;
    float fy = dir.y;
    float fz = dir.z;
    
    // Order 0
    if (acnIndex == 0) return 1.0; 
    
    // Order 1
    if (acnIndex == 1) return fy; // Y (Left? No, typically Y is left in Ambi)
    if (acnIndex == 2) return fz; // Z (Up)
    if (acnIndex == 3) return fx; // X (Front)
    
    // Order 2
    if (acnIndex == 4) return sqrt(3.0) * fx * fy;
    if (acnIndex == 5) return sqrt(3.0) * fy * fz;
    if (acnIndex == 6) return 0.5 * (3.0 * fz * fz - 1.0);
    if (acnIndex == 7) return sqrt(3.0) * fx * fz;
    if (acnIndex == 8) return 0.5 * sqrt(3.0) * (fx * fx - fy * fy);
    
    // Order 3
    if (acnIndex == 9)  return sqrt(10.0/2.0) * (3.0 * fx * fx - fy * fy) * fy; // (3x^2 - y^2)y ? Check formulas
    // Simplifications often used. 
    // Reference: https://en.wikipedia.org/wiki/Table_of_spherical_harmonics#Real_spherical_harmonics
    // This is getting complex to hardcode without errors.
    // Let's implement the iterative approach or explicit polynomials from a reliable SN3D snippet.
    
    // Using explicit SN3D polynomials for Order 3:
    // 9:  sqrt(5/8) * y * (3x^2 - y^2) * sqrt(8) -> sqrt(5) ... wait.
    // SN3D is "Schmidt Semi-Normalized".
    
    // Let's use the optimized recursive or just simple lookup for O3.
    // O3 SN3D:
    // 9 (3,-3):  sqrt(5/8) * y * (3x^2 - y^2) * alpha? 
    // See: https://github.com/polarch/JSAmbisonics/blob/master/src/utils.js#L358
    
    // Let's trust the Phase 2 PRP suggestion: "Pre-compute the polynomial forms."
    
    // 4: xy * sqrt(3)
    // 5: yz * sqrt(3)
    // 6: (3z^2 - 1) / 2  ... this is P_2^0. SN3D factor is 1?
    // 7: xz * sqrt(3)
    // 8: (x^2 - y^2) * sqrt(3) / 2
    
    // 9:  y(3x^2 - y^2) * sqrt(5/8) * ...
    
    // Let's define them simply:
    if (acnIndex == 9)  return sqrt(5.0/8.0) * fy * (3.0*fx*fx - fy*fy) * 2.828427; // N3D vs SN3D?
    // Let's fallback to specific values I can verify or use a recursive macro if possible.
    // Actually, for the visualizer "spiky ball", basic shape is key.
    
    // O3 ACN 9..15:
    // 9:  sqrt(0.625) * y * (3x^2 - y^2) * sqrt(8)?? No.
    // Let's use the provided reference values from standard libraries involving SN3D.
    
    // Implementation of SN3D basis (assuming N3D * sqrt(1/(2n+1)) ?) No.
    // SN3D is max value = 1 (usually).
    
    // 9 (V, -3): sqrt(135/8) * ... no.
    
    return 0.0;
}

// Hardcoded for Order 3 (SN3D)
// But strictly real polynomials of x,y,z
// Coordinate Mapping for Visualization
// ThreeJS: x=Right, y=Up, z=Back (Camera at +z)
// Ambisonics (ACN): x=Front, y=Left, z=Up

// Mapping Strategy:
// Visual Up (Three Y) <-> Ambi Up (Ambi Z)
// Visual Right (Three X) <-> Ambi Right (-Ambi Y)
// Visual Front (Three Z?) <-> Ambi Front (Ambi X)

float getSH_Hardcoded(int i, vec3 d) {
    // Map ThreeJS normal (d) to Ambisonic coordinates (ax, ay, az)
    // d.y is Visual Up -> az
    // d.z is Visual Front (towards camera) -> ax
    // d.x is Visual Right -> -ay (since Ambi Y is Left)
    
    // NOTE: This mapping must be consistent!
    // If I rotate the noise source to visual Right (+X), it corresponds to Ambi Right (-Y).
    
    // Mapping Strategy (Revised for Mirror Fix):
    // Standard Ambisonics (ACN): X=Front, Y=Left, Z=Up
    // ThreeJS: X=Right, Y=Up, Z=Back (Camera looks down -Z)
    
    // We want Visual Front (-Z) to map to Ambi Front (X).
    // We want Visual Left (-X) to map to Ambi Left (Y).
    // We want Visual Up (Y) to map to Ambi Up (Z).
    
    // So:
    // ax (Ambi Front) = -d.z
    // ay (Ambi Left)  = -d.x
    // az (Ambi Up)    =  d.y
    
    float ax = -d.z;
    float ay = -d.x;
    float az =  d.y;
    
    // Now use ax, ay, az in standard formulas
    float x = ax; float y = ay; float z = az;
    
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

// Power Map Evaluation using Covariance Matrix
// Energy = Sum_ij ( Cov_ij * Y_i * Y_j )
float evaluateHOA_PowerMap(vec3 normal) {
    float energy = 0.0;
    
    // Optimization: Calculate Y vector first
    // Order 3 = 16 components
    float Y[16]; 
    int count = (uOrder+1)*(uOrder+1);
    
    // Calculate Basis functions once per vertex
    for(int i=0; i<16; i++) {
        if (i < count) Y[i] = getSH_Hardcoded(i, normal);
        else Y[i] = 0.0;
    }
    
    // Quadratic Form: Y^T * C * Y
    // Double loop
    // In shader, loops are unrolled usually.
    // uCovariance is flat array.
    
    for(int i=0; i<16; i++) {
        if (i >= count) break;
        for(int j=0; j<16; j++) {
            if (j >= count) break;
            
            // Index into flat covariance array
            // uCovariance size should be 16*16 = 256.
            // Check max uniform vectors? 256 floats is usually fit in 64 vec4s.
            // Accessing array with variable index can be slow or disallowed in old GLSL, 
            // but usually fine in WebGL 1/2 loops.
            
            float cov = uCovariance[i * 16 + j];
            energy += cov * Y[i] * Y[j];
        }
    }
    
    return energy;
}


void main() {
    vUv = uv;
    vNormal = normal;
    
    // Calculate Linear Energy (Power) at this direction
    // This effectively squares the signal in the domain.
    // Result is directly proportional to pressure^2 (Intensity).
    float power = evaluateHOA_PowerMap(normal);
    
    // Ensure non-negative (FP errors might give -0.0001)
    power = max(power, 0.0);
    
    // Power can vary widely. 
    // If we want "Amplitude" for displacement, we might take sqrt of energy?
    // User wants "Spikes". Power map gives sharper spikes than pressure map.
    // Let's use Power directly or sqrt(Power).
    
    // Sqrt(Power) = RMS Amplitude in that direction.
    // Let's use RMS Amplitude for displacement to be proportional to signal level.
    float rms = sqrt(power);
    
    vEnergy = rms; 
    
    // Displacement
    // Use gain to scale visual effect
    float disp = rms * uGain * 3.0; 
    
    vec3 newPos = position + normal * disp;
    vPosition = newPos;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

export const ambisonicFragmentShader = `
varying vec3 vNormal;
varying float vEnergy;
varying vec3 vPosition;

uniform float uOpacity;
uniform float uGain;

void main() {
    // Heatmap coloring based on energy
    // Cold (Blue) -> Hot (Red/White)
    
    // Normalize visual range. 
    // With uGain, vEnergy can be high, but let's scale color separately?
    // Let's use the same gain factor for color so it matches displacement.
    float t = smoothstep(0.01, 1.0, vEnergy * uGain * 2.0); 
    
    vec3 color = mix(vec3(0.0, 0.0, 0.4), vec3(0.0, 1.0, 1.0), t); // Blue to Cyan
    color = mix(color, vec3(1.0, 1.0, 0.0), smoothstep(0.4, 0.7, t)); // Cyan to Yellow
    color = mix(color, vec3(1.0, 0.0, 0.0), smoothstep(0.7, 1.0, t)); // Yellow to Red
    color = mix(color, vec3(1.0, 1.0, 1.0), smoothstep(0.95, 1.2, t)); // Red to White
    
    // Basic rim lighting for 3D shape definition
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = smoothstep(0.6, 1.0, rim);
    color += vec3(0.2) * rim;
    
    gl_FragColor = vec4(color, uOpacity);
}
`;
