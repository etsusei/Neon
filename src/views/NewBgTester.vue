<template>
  <main class="new-bg-tester">
    <NewBgAlternative
      class="tester-bg"
      :visible="true"
      :colors="controls.colors"
      :speed="controls.speed"
      :grain-intensity="controls.grainIntensity"
      :intensity="controls.intensity"
      :gradient-size="controls.gradientSize"
      :mix-smooth="controls.mixSmooth"
    />

    <section class="control-panel" aria-label="New background tester controls">
      <div class="panel-header">
        <p class="eyebrow">NewBG Tester</p>
        <h1>Dynamic Background Lab</h1>
      </div>

      <div class="control-group color-grid">
        <label v-for="(_, index) in controls.colors" :key="index" class="color-control">
          <span>Color {{ index + 1 }}</span>
          <input v-model="controls.colors[index]" type="color" />
          <code>{{ controls.colors[index].toUpperCase() }}</code>
        </label>
      </div>

      <div class="control-group">
        <label class="range-control">
          <span>Motion Speed</span>
          <strong>{{ controls.speed.toFixed(2) }}</strong>
          <input v-model.number="controls.speed" type="range" min="0" max="3" step="0.05" />
        </label>

        <label class="range-control">
          <span>Film Grain</span>
          <strong>{{ controls.grainIntensity.toFixed(2) }}</strong>
          <input v-model.number="controls.grainIntensity" type="range" min="0" max="0.3" step="0.01" />
        </label>

        <label class="range-control">
          <span>Color Intensity</span>
          <strong>{{ controls.intensity.toFixed(2) }}</strong>
          <input v-model.number="controls.intensity" type="range" min="0.5" max="2.0" step="0.05" />
        </label>

        <label class="range-control">
          <span>Sharpness</span>
          <strong>{{ controls.gradientSize.toFixed(2) }}</strong>
          <input v-model.number="controls.gradientSize" type="range" min="0.0" max="1.0" step="0.02" />
        </label>

        <label class="range-control">
          <span>Edge Softness</span>
          <strong>{{ controls.mixSmooth.toFixed(2) }}</strong>
          <input v-model.number="controls.mixSmooth" type="range" min="0.01" max="0.5" step="0.01" />
        </label>
      </div>

      <div class="button-row">
        <button type="button" @click="applyPreset('navyOrange')">Navy Orange</button>
        <button type="button" @click="applyPreset('tealCoral')">Teal Coral</button>
        <button type="button" @click="applyPreset('ember')">Ember</button>
        <button type="button" @click="applyPreset('blackStress')">Black Stress</button>
        <button type="button" @click="applyPreset('rainbow')">Rainbow</button>
        <button type="button" @click="resetControls">Reset</button>
      </div>
    </section>
  </main>
</template>

<script>
import NewBgAlternative from '../components/NewBgAlternative.vue';

const DEFAULT_CONTROLS = {
  colors: ['#f15a22', '#0a0e27', '#f15a22', '#0a0e27', '#f15a22', '#0a0e27'],
  speed: 0.35,
  grainIntensity: 0.0,
  intensity: 1.0,
  gradientSize: 1.0,
  mixSmooth: 0.20
};

const PRESETS = {
  navyOrange: ['#f15a22', '#0a0e27', '#f15a22', '#0a0e27', '#f15a22', '#0a0e27'],
  tealCoral: ['#ff6c50', '#40e0d0', '#ff9f6e', '#12343b', '#f15a22', '#0a0e27'],
  ember: ['#f26633', '#004238', '#d1af9c', '#000000', '#f15a22', '#000000'],
  // Extreme test: 1 bright color + 5 blacks — must NOT show black blocks
  blackStress: ['#000000', '#00fff5', '#000000', '#000000', '#000000', '#000000'],
  // All different bright colors — tests blending quality
  rainbow: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
};

export default {
  name: 'NewBgTester',
  components: {
    NewBgAlternative
  },
  data() {
    return {
      controls: this.cloneControls(DEFAULT_CONTROLS)
    };
  },
  methods: {
    cloneControls(controls) {
      return {
        ...controls,
        colors: [...controls.colors]
      };
    },
    applyPreset(name) {
      this.controls.colors = [...PRESETS[name]];
    },
    resetControls() {
      this.controls = this.cloneControls(DEFAULT_CONTROLS);
    }
  }
};
</script>

<style scoped>
.new-bg-tester {
  position: fixed;
  inset: 0;
  z-index: 999;
  min-height: 100vh;
  overflow: hidden;
  color: #fff;
  font-family: "Inter", "Helvetica", "Arial", sans-serif;
}

.tester-bg {
  position: absolute !important;
  inset: 0;
  z-index: 999 !important;
  transform: none !important;
}

.control-panel {
  position: absolute;
  top: 28px;
  right: 28px;
  z-index: 1000;
  width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 56px);
  overflow-y: auto;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(7, 10, 24, 0.76);
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(18px);
}

.panel-header {
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 6px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 760;
}

.control-group {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.color-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.color-control {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.color-control span,
.range-control span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 700;
}

.color-control input[type="color"] {
  width: 100%;
  height: 42px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

code {
  min-width: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.range-control {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 14px;
  align-items: center;
}

.range-control input {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: #f15a22;
}

.range-control strong {
  color: #fff;
  font-size: 12px;
}

.button-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 22px;
}

button {
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  background: rgba(255, 255, 255, 0.14);
}

@media (max-width: 720px) {
  .control-panel {
    top: auto;
    right: 16px;
    bottom: 16px;
    left: 16px;
    width: auto;
    max-height: 72vh;
  }
}
</style>
