<template>
  <div class="liquid-card" :class="customClass" :style="containerStyle" @click="$emit('click', $event)">
    <div class="liquid-card-effect" :style="effectStyle" v-liquid-glass="{ disabled: noDistortion }"></div>
    <div class="liquid-card-tint" :style="tintStyle"></div>
    <div class="liquid-card-shine" :style="shineStyle"></div>
    <div class="liquid-card-content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { isLiquidGlassSupported } from '../utils/liquidGlass';

export default {
  name: 'LiquidCard',
  props: {
    // Custom class for external styling overrides
    customClass: {
      type: String,
      default: ''
    },
    // Border radius (default 32px)
    borderRadius: {
      type: String,
      default: '32px'
    },
    // Tint opacity (default 0.25)
    tintOpacity: {
      type: Number,
      default: undefined
    },
    // Enable hover scaling effect
    hoverEffect: {
      type: Boolean,
      default: false
    },
    // Disable distortion effect
    noDistortion: {
      type: Boolean,
      default: false
    },
    // Allow content to overflow (e.g. for popping out images)
    overflowVisible: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    containerStyle() {
      return {
        borderRadius: this.borderRadius,
        overflow: this.overflowVisible ? 'visible' : 'hidden'
      };
    },
    effectStyle() {
      // 物理折射引擎(v-liquid-glass 指令)可用时由它设置 backdrop-filter；
      // 这里只在引擎不可用(非 Chromium)时输出旧的噪声滤镜作降级
      if (this.noDistortion || isLiquidGlassSupported()) {
        return {
          borderRadius: this.borderRadius
        };
      }
      return {
        borderRadius: this.borderRadius,
        backdropFilter: 'url(#glass-distortion)',
        WebkitBackdropFilter: 'url(#glass-distortion)'
      };
    },
    tintStyle() {
      return {
        borderRadius: this.borderRadius,
        /* If prop is provided, override global variable locally */
        '--glass-opacity': this.tintOpacity !== undefined ? this.tintOpacity : undefined
      };
    },
    shineStyle() {
      return {
        borderRadius: this.borderRadius
      };
    }
  }
};
</script>

<style scoped>
.liquid-card {
  position: relative;
  /* Ensure stacking context is handled correctly */
  isolation: isolate; 
  /* Clipping for correct border radius relative to backdrop, unless overridden */
  /* overflow: hidden; - Moved to inline style via prop */
  width: 100%;
  height: 100%;
  /* No default background opacity to avoid stacking issues */
}

/* Optional hover effect */
.liquid-card:hover {
  transform: scale(1.0); /* Default no scale */
  transition: transform 0.3s ease;
}

/* Effect Layer (The Distortion) */
.liquid-card-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  /* backdrop-filter: url(#glass-distortion); Moved to inline style via prop */
  /* -webkit-backdrop-filter: url(#glass-distortion); Moved to inline style via prop */
  pointer-events: none;
}

/* Tint Layer (Whitening) */
.liquid-card-tint {
  z-index: 1;
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-color: rgba(255, 255, 255, var(--glass-opacity));
  transition: background-color 0.5s ease; /* Smooth tint color transition */
}

/* Shine Layer (Highlight Borders) */
.liquid-card-shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
  box-shadow: 
    inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
    inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
}

/* Content Layer (The actual content) */
.liquid-card-content {
  position: relative; /* Relative to maintain flow if needed, or absolute if filling */
  z-index: 3;
  width: 100%;
  height: 100%;
  /* Ensure content doesn't get distorted */
}
</style>
