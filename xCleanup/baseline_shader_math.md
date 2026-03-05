# Baseline Shader Math (February 27, 2026)

This document records the original hardcoded math for the ray-marching loop in `src/visualizer/shaders/ambisonic.ts` prior to the commit `d5e49a73692b65199085c04eabc37adfb5eac386`.

## 1. Density Accumulation
The density is calculated based on directional energy and radial falloff.

- **Constants:**
  - `STEP_SIZE`: `0.1`
  - `MAX_STEPS`: `32`
  - `MAX_DIST`: `10.0`
- **Initial Density:** `float dirDensity = sqrt(energy) * uGain;`
- **Radial Falloff:** `float falloff = smoothstep(5.0, 0.0, r);`
- **Step Density:** `float dens = dirDensity * falloff;`
- **Absorption:** `float absorption = dens * STEP_SIZE;`
- **Accumulation:**
  ```glsl
  float alphaStep = absorption;
  accumulatedColor += color * alphaStep * (1.0 - totalDensity);
  totalDensity += alphaStep;
  ```

## 2. Color Mapping (Heatmap)
A multi-stage gradient based on the step density `dens`.

- **Value:** `float val = smoothstep(0.0, 1.0, dens);`
- **Gradient Steps:**
  - `mix(vec3(0.0, 0.0, 0.5), vec3(0.0, 1.0, 1.0), val)` (Dark Blue → Cyan)
  - `mix(color, vec3(1.0, 1.0, 0.0), smoothstep(0.3, 0.6, val))` (→ Yellow)
  - `mix(color, vec3(1.0, 0.0, 0.0), smoothstep(0.6, 1.0, val))` (→ Red)

## 3. Emission
The final color is scaled for emission before output.

- **Calculation:** `gl_FragColor = vec4(accumulatedColor * 2.0, totalDensity * uOpacity);`
- **Baseline Emission Multiplier:** `2.0`
