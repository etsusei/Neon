<template>
  <div class="new-bg-alternative" ref="container" :style="{ opacity: visible ? 1 : 0 }"></div>
</template>

<script>
import * as THREE from 'three';
import { markRaw } from 'vue';
import { mapState } from 'vuex';
import { extractPaletteFromImage, getAverageLuminance } from '../utils/extractPaletteFromImage';

const DEFAULT_COLORS = [
  '#f15a22',
  '#0a0e27',
  '#f15a22',
  '#0a0e27',
  '#f15a22',
  '#0a0e27'
];

function colorFromHex(hex, fallback) {
  try {
    return new THREE.Color(hex || fallback);
  } catch (error) {
    return new THREE.Color(fallback);
  }
}

export default {
  name: 'NewBgAlternative',
  props: {
    // Controls fade visibility while play/pause switches backgrounds.
    visible: {
      type: Boolean,
      default: false
    },
    // Album cover URL used for palette extraction.
    coverImage: {
      type: String,
      default: ''
    },
    // Tester-only overrides. Normal app usage gets colors from coverImage.
    colors: {
      type: Array,
      default: () => null
    },
    speed: {
      type: Number,
      default: 0.35
    },
    grainIntensity: {
      type: Number,
      default: 0.0
    },
    intensity: {
      type: Number,
      default: 1.0
    },
    gradientSize: {
      type: Number,
      default: 1.0
    },
    mixSmooth: {
      type: Number,
      default: 0.20
    }
  },
  data() {
    return {
      downscale: 4,
      fpsInterval: 1000 / 30,
      lastRenderTime: 0,
      scene: null,
      camera: null,
      renderer: null,
      material: null,
      mesh: null,
      clock: null,
      animationId: null,
      isPaused: false,

      // Target colors are lerped into uniforms for smooth track changes.
      targetColors: {
        color1: new THREE.Color(DEFAULT_COLORS[0]),
        color2: new THREE.Color(DEFAULT_COLORS[1]),
        color3: new THREE.Color(DEFAULT_COLORS[2]),
        color4: new THREE.Color(DEFAULT_COLORS[3]),
        color5: new THREE.Color(DEFAULT_COLORS[4]),
        color6: new THREE.Color(DEFAULT_COLORS[5])
      },

      colorTransitionSpeed: 0.05,

      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColor1: { value: new THREE.Color(DEFAULT_COLORS[0]) },
        uColor2: { value: new THREE.Color(DEFAULT_COLORS[1]) },
        uColor3: { value: new THREE.Color(DEFAULT_COLORS[2]) },
        uColor4: { value: new THREE.Color(DEFAULT_COLORS[3]) },
        uColor5: { value: new THREE.Color(DEFAULT_COLORS[4]) },
        uColor6: { value: new THREE.Color(DEFAULT_COLORS[5]) },
        uSpeed: { value: 0.35 },
        uIntensity: { value: 1.0 },
        uGrainIntensity: { value: 0.0 },
        uGradientSize: { value: 1.0 },
        uMixSmooth: { value: 0.20 }
      }
    };
  },
  computed: {
    ...mapState(['audioIntensity'])
  },
  watch: {
    // Tester mode: direct color props override cover-derived colors.
    colors: {
      handler(newColors) {
        if (newColors) {
          const parsed = DEFAULT_COLORS.map((fallback, index) => colorFromHex(newColors[index], fallback));
          parsed.forEach((color, index) => {
            this.targetColors[`color${index + 1}`] = color;
          });
        }
      },
      deep: true
    },
    speed(value) {
      this.uniforms.uSpeed.value = value;
    },
    grainIntensity(value) {
      this.uniforms.uGrainIntensity.value = value;
    },
    intensity(value) {
      this.uniforms.uIntensity.value = value;
    },
    gradientSize(value) {
      this.uniforms.uGradientSize.value = value;
    },
    mixSmooth(value) {
      this.uniforms.uMixSmooth.value = value;
    },
    // Audio response: slightly soften the field on beats instead of flashing brightness.
    audioIntensity(newIntensity) {
      if (this.uniforms && this.uniforms.uMixSmooth) {
        const baseSoftness = this.mixSmooth;
        const breathAmount = 0.04;
        this.uniforms.uMixSmooth.value = baseSoftness + newIntensity * breathAmount;
      }
    },
    coverImage(newCover, oldCover) {
      if (newCover && newCover !== oldCover) {
        this.extractAndApplyColors(newCover);
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.$refs.container) {
        this.initThree();
        this.applySettings();
        this.animate();
        window.addEventListener('resize', this.onResize);
      }
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.mesh) {
      this.mesh.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  },
  methods: {
    initThree() {
      this.scene = markRaw(new THREE.Scene());
      this.camera = markRaw(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
      this.renderer = markRaw(new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
      }));

      const rw = Math.floor(window.innerWidth / this.downscale);
      const rh = Math.floor(window.innerHeight / this.downscale);
      this.renderer.setSize(rw, rh, false);

      // Render at low resolution, then stretch the canvas for a soft background.
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';

      this.$refs.container.appendChild(this.renderer.domElement);

      this.material = markRaw(new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;

          uniform float uTime;
          uniform vec2 uResolution;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform vec3 uColor4;
          uniform vec3 uColor5;
          uniform vec3 uColor6;
          uniform float uSpeed;
          uniform float uIntensity;
          uniform float uGrainIntensity;
          uniform float uGradientSize;
          uniform float uMixSmooth;

          varying vec2 vUv;

          // ---- Simplex 2D noise ----
          vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                    -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
            m = m * m;
            m = m * m;
            vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x_) - 0.5;
            vec3 ox = floor(x_ + 0.5);
            vec3 a0 = x_ - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          // ---- Film grain ----
          float grain(vec2 uv, float time) {
            vec2 grainUv = uv * uResolution * 0.5;
            float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
            return grainValue * 2.0 - 1.0;
          }

          // ---- Palette safety: lift pure black slightly ----
          vec3 safePaletteColor(vec3 color) {
            float luminance = dot(color, vec3(0.299, 0.587, 0.114));
            float lift = max(0.08 - luminance, 0.0);
            return clamp(color + vec3(lift), vec3(0.0), vec3(1.0));
          }

          // ---- IDW weight function ----
          float idwWeight(vec2 uv, vec2 center, float softness, float power) {
            float d = length(uv - center);
            return 1.0 / pow(d + softness, power);
          }

          void main() {
            vec2 uv = vUv;
            float time = uTime;

            // Simplex noise UV distortion for organic movement
            float noiseTime = time * uSpeed * 0.2;
            float noiseVal1 = snoise(uv * 1.4 + noiseTime);
            float noiseVal2 = snoise(uv * 1.4 + noiseTime + 100.0);
            vec2 distortedUv = uv + vec2(noiseVal1, noiseVal2) * 0.04;

            // 6 animated anchor points, one per palette color.
            vec2 center1 = vec2(
              0.5 + sin(time * uSpeed * 0.40) * 0.40,
              0.5 + cos(time * uSpeed * 0.50) * 0.40
            );
            vec2 center2 = vec2(
              0.5 + cos(time * uSpeed * 0.60) * 0.45,
              0.5 + sin(time * uSpeed * 0.45) * 0.45
            );
            vec2 center3 = vec2(
              0.5 + sin(time * uSpeed * 0.35) * 0.42,
              0.5 + cos(time * uSpeed * 0.55) * 0.42
            );
            vec2 center4 = vec2(
              0.5 + cos(time * uSpeed * 0.50) * 0.38,
              0.5 + sin(time * uSpeed * 0.40) * 0.43
            );
            vec2 center5 = vec2(
              0.5 + sin(time * uSpeed * 0.70) * 0.35,
              0.5 + cos(time * uSpeed * 0.60) * 0.37
            );
            vec2 center6 = vec2(
              0.5 + cos(time * uSpeed * 0.45) * 0.44,
              0.5 + sin(time * uSpeed * 0.65) * 0.40
            );

            // Safe palette colors
            vec3 c1 = safePaletteColor(uColor1);
            vec3 c2 = safePaletteColor(uColor2);
            vec3 c3 = safePaletteColor(uColor3);
            vec3 c4 = safePaletteColor(uColor4);
            vec3 c5 = safePaletteColor(uColor5);
            vec3 c6 = safePaletteColor(uColor6);

            // IDW parameters
            float softness = max(uMixSmooth, 0.005);
            float power = mix(1.5, 4.0, clamp(uGradientSize, 0.0, 1.0));

            // Subtle animated weight pulsing for organic feel
            float pulse1 = 0.90 + 0.10 * sin(time * uSpeed * 1.0);
            float pulse2 = 0.90 + 0.10 * cos(time * uSpeed * 1.2);
            float pulse3 = 0.90 + 0.10 * sin(time * uSpeed * 0.8);
            float pulse4 = 0.90 + 0.10 * cos(time * uSpeed * 1.3);
            float pulse5 = 0.90 + 0.10 * sin(time * uSpeed * 1.1);
            float pulse6 = 0.90 + 0.10 * cos(time * uSpeed * 0.9);

            // Calculate IDW weights
            float w1 = idwWeight(distortedUv, center1, softness, power) * pulse1;
            float w2 = idwWeight(distortedUv, center2, softness, power) * pulse2;
            float w3 = idwWeight(distortedUv, center3, softness, power) * pulse3;
            float w4 = idwWeight(distortedUv, center4, softness, power) * pulse4;
            float w5 = idwWeight(distortedUv, center5, softness, power) * pulse5;
            float w6 = idwWeight(distortedUv, center6, softness, power) * pulse6;

            // Normalized weighted blend
            float totalWeight = w1 + w2 + w3 + w4 + w5 + w6;
            vec3 color = (c1 * w1 + c2 * w2 + c3 * w3 + c4 * w4 + c5 * w5 + c6 * w6) / totalWeight;

            // Post-processing: intensity / saturation
            float luminance = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(luminance), color, uIntensity);

            // Subtle gamma for richer darks
            color = pow(color, vec3(0.95));

            // Film grain
            color += grain(uv, uTime) * uGrainIntensity;

            // Subtle color shifting over time
            float timeShift = uTime * 0.5;
            color.r += sin(timeShift) * 0.015;
            color.g += cos(timeShift * 1.4) * 0.015;
            color.b += sin(timeShift * 1.2) * 0.015;

            // Cinematic vignette: subtle edge darkening.
            float vignette = 1.0 - smoothstep(0.3, 1.2, length(uv - 0.5));
            color *= mix(0.6, 1.0, vignette);

            // Brightness ceiling: prevent eye-straining bright spots.
            color = min(color, vec3(0.8));

            // Dithering: break color banding with tiny triangular noise.
            vec3 dither = vec3(
              fract(sin(dot(uv * uResolution + uTime, vec2(12.9898, 78.233))) * 43758.5453),
              fract(sin(dot(uv * uResolution + uTime, vec2(93.9898, 67.345))) * 24634.6345),
              fract(sin(dot(uv * uResolution + uTime, vec2(45.1234, 53.789))) * 37245.8734)
            );
            color += (dither - 0.5) / 255.0;

            // Final clamp
            color = clamp(color, vec3(0.0), vec3(1.0));

            gl_FragColor = vec4(color, 1.0);
          }
        `
      }));

      const geometry = markRaw(new THREE.PlaneGeometry(2, 2));
      this.mesh = markRaw(new THREE.Mesh(geometry, this.material));
      this.scene.add(this.mesh);
      this.clock = markRaw(new THREE.Clock());
    },

    applySettings() {
      // Tester mode can provide colors directly.
      if (this.colors) {
        const parsed = DEFAULT_COLORS.map((fallback, index) => colorFromHex(this.colors[index], fallback));
        parsed.forEach((color, index) => {
          this.targetColors[`color${index + 1}`] = color;
          this.uniforms[`uColor${index + 1}`].value.copy(color);
        });
      }
      this.uniforms.uSpeed.value = this.speed;
      this.uniforms.uGrainIntensity.value = this.grainIntensity;
      this.uniforms.uIntensity.value = this.intensity;
      this.uniforms.uGradientSize.value = this.gradientSize;
      this.uniforms.uMixSmooth.value = this.mixSmooth;
    },

    animate() {
      if (this.isPaused) return;

      this.animationId = requestAnimationFrame(this.animate);

      const now = Date.now();
      const elapsed = now - (this.lastRenderTime || 0);

      // Frame-rate limit.
      if (elapsed < this.fpsInterval) return;

      this.lastRenderTime = now - (elapsed % this.fpsInterval);

      this.uniforms.uTime.value = this.clock.getElapsedTime();

      // Smoothly transition colors.
      this.updateColorTransition();

      this.renderer.render(this.scene, this.camera);
    },

    // Lerp uniforms toward the target palette.
    updateColorTransition() {
      for (let i = 1; i <= 6; i++) {
        this.uniforms[`uColor${i}`].value.lerp(this.targetColors[`color${i}`], this.colorTransitionSpeed);
      }
    },

    // Cover color extraction.
    extractAndApplyColors(imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const colors = extractPaletteFromImage(img);

        // Let the render loop animate into the new palette.
        colors.forEach((color, index) => {
          this.targetColors[`color${index + 1}`] = color;
        });

        // Estimate lyric contrast mode from the extracted palette.
        const avgLuminance = getAverageLuminance(colors);
        const isDarkBackground = avgLuminance < 0.4;
        this.$store.commit('SetLyricDarkMode', isDarkBackground);
      };
      img.onerror = (error) => {
        console.error('[NewBgAlternative] Failed to load cover image:', error);
      };
      img.src = imageUrl;
    },

    // Render controls.
    pauseRendering() {
      this.isPaused = true;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },

    resumeRendering() {
      if (!this.isPaused) return;
      this.isPaused = false;
      if (this.clock) {
        this.clock.start();
      }
      this.animate();
    },

    onResize() {
      if (!this.renderer) return;
      const rw = Math.floor(window.innerWidth / this.downscale);
      const rh = Math.floor(window.innerHeight / this.downscale);
      this.renderer.setSize(rw, rh, false);
      this.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

      // Even while paused, render once so resize updates the frame.
      if (this.isPaused && this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }
};
</script>

<style scoped>
.new-bg-alternative {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  transition: opacity 0.8s ease-in-out;
  transform: scale(1.1);
  transform-origin: center center;
}

.new-bg-alternative :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
