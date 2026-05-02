<template>
  <div class="new-bg-alternative" ref="container" :style="{ opacity: visible ? 1 : 0 }"></div>
</template>

<script>
import * as THREE from 'three';
import { markRaw } from 'vue';
import { mapState } from 'vuex';

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
    // 控制背景是否可见（用于播放/暂停时的渐变切换）
    visible: {
      type: Boolean,
      default: false
    },
    // 专辑封面图片URL，用于提取颜色
    coverImage: {
      type: String,
      default: ''
    },
    // 以下 props 保留给 tester 模式使用，正常集成时不需要传
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
      downscale: 4, // 降采样比例，用于大幅提升渲染性能
      fpsInterval: 1000 / 30, // 限制最大帧率为 30fps
      lastRenderTime: 0,
      scene: null,
      camera: null,
      renderer: null,
      material: null,
      mesh: null,
      clock: null,
      animationId: null,
      isPaused: false,

      // 目标颜色（用于平滑过渡）
      targetColors: {
        color1: new THREE.Color(DEFAULT_COLORS[0]),
        color2: new THREE.Color(DEFAULT_COLORS[1]),
        color3: new THREE.Color(DEFAULT_COLORS[2]),
        color4: new THREE.Color(DEFAULT_COLORS[3]),
        color5: new THREE.Color(DEFAULT_COLORS[4]),
        color6: new THREE.Color(DEFAULT_COLORS[5])
      },

      // 颜色过渡速度
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
    // Tester 模式：直接通过 props 设置颜色
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
    // 音频响应：modulate softness for breathing effect (色块在 beat 时轻微扩散，而非亮度闪烁)
    audioIntensity(newIntensity) {
      if (this.uniforms && this.uniforms.uMixSmooth) {
        const baseSoftness = this.mixSmooth; // prop 值作为基准
        const breathAmount = 0.04; // 微小的 softness 增量
        this.uniforms.uMixSmooth.value = baseSoftness + newIntensity * breathAmount;
      }
    },
    // 封面变化时提取颜色
    coverImage(newCover, oldCover) {
      console.log('[NewBgAlternative] coverImage changed:', oldCover, '->', newCover);
      if (newCover && newCover !== oldCover) {
        this.extractAndApplyColors(newCover);
      }
    },
    visible(newVal) {
      console.log('[NewBgAlternative] visible changed:', newVal);
    }
  },
  mounted() {
    console.log('[NewBgAlternative] Component mounted');
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

      // 强制设置 canvas 样式撑满容器
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

            // 6 animated anchor points — one per palette color
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

            // Cinematic vignette — subtle edge darkening
            float vignette = 1.0 - smoothstep(0.3, 1.2, length(uv - 0.5));
            color *= mix(0.6, 1.0, vignette);

            // Brightness ceiling — prevent eye-straining bright spots
            color = min(color, vec3(0.8));

            // Dithering — break color banding (±0.5/255 triangular noise per channel)
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
      // 如果有 colors prop（tester 模式），直接设置目标颜色
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

      // 帧率限制
      if (elapsed < this.fpsInterval) return;

      this.lastRenderTime = now - (elapsed % this.fpsInterval);

      this.uniforms.uTime.value = this.clock.getElapsedTime();

      // 平滑过渡颜色
      this.updateColorTransition();

      this.renderer.render(this.scene, this.camera);
    },

    // 平滑过渡到目标颜色（和 DynamicBackground 一样）
    updateColorTransition() {
      for (let i = 1; i <= 6; i++) {
        this.uniforms[`uColor${i}`].value.lerp(this.targetColors[`color${i}`], this.colorTransitionSpeed);
      }
    },

    // ========= 封面取色 =========
    extractAndApplyColors(imageUrl) {
      console.log('[NewBgAlternative] extractAndApplyColors called with:', imageUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('[NewBgAlternative] Image loaded successfully');
        const colors = this.extractColors(img);
        console.log('[NewBgAlternative] Extracted colors:', colors.map(c => '#' + c.getHexString()));

        // 设置目标颜色，让 lerp 过渡动画自动完成
        colors.forEach((color, index) => {
          this.targetColors[`color${index + 1}`] = color;
        });

        // 计算平均亮度决定歌词颜色模式
        const luminances = colors.map(c => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
        const avgLuminance = luminances.reduce((a, b) => a + b, 0) / luminances.length;
        const isDarkBackground = avgLuminance < 0.4;
        console.log('[NewBgAlternative] Avg luminance:', avgLuminance.toFixed(3), 'isDark:', isDarkBackground);
        this.$store.commit('SetLyricDarkMode', isDarkBackground);
      };
      img.onerror = (error) => {
        console.error('[NewBgAlternative] Failed to load cover image:', error);
      };
      img.src = imageUrl;
    },

    extractColors(image) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 64;
      canvas.height = 64;
      ctx.drawImage(image, 0, 0, 64, 64);

      const imageData = ctx.getImageData(0, 0, 64, 64).data;
      const colorCounts = {};
      const quantization = 32;
      let totalValidPixels = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        const r = Math.floor(imageData[i] / quantization) * quantization;
        const g = Math.floor(imageData[i + 1] / quantization) * quantization;
        const b = Math.floor(imageData[i + 2] / quantization) * quantization;

        // 过滤纯黑和纯白
        if ((r + g + b) < 15 || (r + g + b) > 720) continue;

        totalValidPixels++;
        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
      }

      console.log('[NewBgAlternative] Color counts:', Object.entries(colorCounts).length, 'unique colors,', totalValidPixels, 'valid pixels');

      // 按频率排序
      const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);

      // 最小像素占比：一个颜色至少占 3% 的有效像素才有资格入选
      const minPixelRatio = 0.03;
      const minPixelCount = Math.max(totalValidPixels * minPixelRatio, 1);

      // 取 top 6 个足够不同的颜色
      const palette = [];
      const minDistance = 0.15;

      for (let [key, count] of sortedColors) {
        if (palette.length >= 6) break;

        // 像素占比不够，跳过（可能是边框、小文字等干扰）
        if (count < minPixelCount) {
          continue;
        }

        const [r, g, b] = key.split(',').map(Number);
        const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);
        const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;

        // 亮度离群检测：如果已有 palette 的平均亮度和这个颜色差距过大，跳过
        if (palette.length >= 2) {
          const paletteLuminances = palette.map(c => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
          const avgLum = paletteLuminances.reduce((a, b) => a + b, 0) / paletteLuminances.length;
          const lumDiff = Math.abs(luminance - avgLum);
          // 如果亮度差超过 0.45（比如 palette 平均 0.6 的浅色，来了个 0.1 的黑色），跳过
          if (lumDiff > 0.45) {
            console.log('[NewBgAlternative] Skipping luminance outlier:', '#' + color.getHexString(),
              'lum:', luminance.toFixed(2), 'avgPalette:', avgLum.toFixed(2));
            continue;
          }
        }

        // 颜色差异检查
        let isDistinct = true;
        for (let existing of palette) {
          const dr = existing.r - color.r;
          const dg = existing.g - color.g;
          const db = existing.b - color.b;
          if (Math.sqrt(dr * dr + dg * dg + db * db) < minDistance) {
            isDistinct = false;
            break;
          }
        }

        if (isDistinct) {
          palette.push(color);
        }
      }

      console.log('[NewBgAlternative] Palette before fill:', palette.length, 'colors');

      // 如果凑不齐 6 个，循环复用已有颜色（微调明度，不偏移色相）
      while (palette.length < 6) {
        if (palette.length > 0) {
          const sourceIndex = (palette.length) % palette.length;
          // 只调整明度（±0.05），不改变色相，避免出现不相关的颜色
          const lightnessShift = (palette.length % 2 === 0) ? 0.05 : -0.05;
          palette.push(palette[sourceIndex].clone().offsetHSL(0, 0, lightnessShift));
        } else {
          palette.push(new THREE.Color(0x333333));
        }
      }

      console.log('[NewBgAlternative] Final palette:', palette.map(c => '#' + c.getHexString()));
      return palette;
    },

    // ========= 渲染控制 =========
    pauseRendering() {
      console.log('[NewBgAlternative] Rendering paused');
      this.isPaused = true;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    },

    resumeRendering() {
      if (!this.isPaused) return;
      console.log('[NewBgAlternative] Rendering resumed');
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

      // 即使在暂停状态下，也要渲染一帧以更新画面
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
  transform: scale(1.1); /* 防止降采样造成的边缘白边 */
  transform-origin: center center;
}

.new-bg-alternative :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
