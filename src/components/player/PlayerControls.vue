<template>
  <div class="player-controls">
    <div class="track-control">
      <div class="track-control_row">
        <button type="button" class="track-control_icon btn-heart" @click="$emit('add-to-playlist')" aria-label="添加到歌单" title="添加到歌单">
          <i class="fa fa-heart"></i>
        </button>
        <button type="button" class="track-control_icon btn-prev" @click="$emit('prev-track')" aria-label="上一首">
          <i class="fa fa-backward"></i>
        </button>
        <button type="button" class="track-control_iconPlay" @click="$emit('play')" :aria-label="isPlaying ? '暂停' : '播放'">
          <i class="fa fa-pause-circle-o" v-if="isPlaying"></i>
          <i class="fa fa-play-circle-o" v-else></i>
        </button>
        <button type="button" class="track-control_icon btn-next" @click="$emit('next-track')" aria-label="下一首">
          <i class="fa fa-forward"></i>
        </button>
        <button type="button" class="track-control_icon btn-mode" @click="$emit('toggle-play-mode')" :aria-label="`播放模式：${playModeTitle}`" :title="playModeTitle">
          <i class="fa fa-repeat" v-if="playMode === 'sequence'"></i>
          <i class="fa fa-random" v-else-if="playMode === 'shuffle'"></i>
          <i class="fa fa-repeat" style="color: #f6002e;" v-else></i>
        </button>
      </div>
    </div>
    <div class="progress">
      <div
        class="progress_bar"
        :class="{ 'is-dragging': isDragging }"
        role="slider"
        tabindex="0"
        aria-label="播放进度"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(displayPercentage)"
        @pointerdown="startProgressDrag"
        @pointermove="moveProgressDrag"
        @pointerup="finishProgressDrag"
        @pointercancel="cancelProgressDrag"
        @lostpointercapture="finishProgressDrag"
        @keydown="keySeek"
      >
        <div class="progress_current" :style="{ width: displayBarWidth }"></div>
      </div>
      <div class="time">
        <div class="progress_time">{{ displayCurrentTime }}</div>
        <div class="progress_duration">{{ duration }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerControls',
  props: {
    isPlaying: {
      type: Boolean,
      default: false
    },
    playMode: {
      type: String,
      default: 'sequence'
    },
    playModeTitle: {
      type: String,
      default: ''
    },
    barWidth: {
      type: String,
      default: '0%'
    },
    currentTime: {
      type: String,
      default: '00:00'
    },
    duration: {
      type: String,
      default: '00:00'
    }
  },
  emits: ['play', 'prev-track', 'next-track', 'toggle-play-mode', 'seek-percentage', 'add-to-playlist'],
  data() {
    return {
      isDragging: false,
      dragPercentage: null
    };
  },
  computed: {
    displayPercentage() {
      if (this.dragPercentage !== null) return this.dragPercentage;
      const parsed = parseFloat(this.barWidth);
      return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
    },
    displayBarWidth() {
      return `${this.displayPercentage}%`;
    },
    displayCurrentTime() {
      if (!this.isDragging) return this.currentTime;
      const durationSeconds = this.parseTime(this.duration);
      if (!durationSeconds) return this.currentTime;
      return this.formatTime(durationSeconds * this.displayPercentage / 100);
    }
  },
  methods: {
    percentageFromEvent(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width) return 0;
      return Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    },
    startProgressDrag(event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      this.isDragging = true;
      this.dragPercentage = this.percentageFromEvent(event);
      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    moveProgressDrag(event) {
      if (!this.isDragging) return;
      event.preventDefault();
      this.dragPercentage = this.percentageFromEvent(event);
    },
    finishProgressDrag(event) {
      if (!this.isDragging) return;
      event.preventDefault();
      this.dragPercentage = this.percentageFromEvent(event);
      const percentage = this.dragPercentage;
      this.isDragging = false;
      this.$emit('seek-percentage', percentage);
      this.$nextTick(() => {
        this.dragPercentage = null;
      });
    },
    cancelProgressDrag() {
      this.isDragging = false;
      this.dragPercentage = null;
    },
    keySeek(event) {
      let percentage = this.displayPercentage;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') percentage -= 5;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') percentage += 5;
      else if (event.key === 'Home') percentage = 0;
      else if (event.key === 'End') percentage = 100;
      else return;
      event.preventDefault();
      this.$emit('seek-percentage', Math.min(100, Math.max(0, percentage)));
    },
    parseTime(value) {
      const parts = String(value || '').split(':').map(Number);
      if (parts.some(part => !Number.isFinite(part))) return 0;
      return parts.reduce((total, part) => total * 60 + part, 0);
    },
    formatTime(seconds) {
      const whole = Math.max(0, Math.floor(seconds));
      const minutes = Math.floor(whole / 60);
      const remainder = whole % 60;
      return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    }
  }
};
</script>

<style scoped>
.track-control_icon,
.track-control_iconPlay {
  appearance: none;
  -webkit-appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
}
</style>
