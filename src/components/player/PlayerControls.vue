<template>
  <div class="player-controls">
    <div class="track-control">
      <div class="track-control_row">
        <div class="track-control_icon" @click="$emit('add-to-playlist')" title="添加到歌单">
          <i class="fa fa-heart"></i>
        </div>
        <div class="track-control_icon" @click="$emit('prev-track')">
          <i class="fa fa-backward"></i>
        </div>
        <div class="track-control_iconPlay" @click="$emit('play')">
          <i class="fa fa-pause-circle-o" v-if="isPlaying"></i>
          <i class="fa fa-play-circle-o" v-else></i>
        </div>
        <div class="track-control_icon" @click="$emit('next-track')">
          <i class="fa fa-forward"></i>
        </div>
        <div class="track-control_icon" @click="$emit('toggle-play-mode')" :title="playModeTitle">
          <i class="fa fa-repeat" v-if="playMode === 'sequence'"></i>
          <i class="fa fa-random" v-else-if="playMode === 'shuffle'"></i>
          <i class="fa fa-repeat" style="color: #f6002e;" v-else></i>
        </div>
      </div>
    </div>
    <div class="progress">
      <div class="progress_bar" @click="clickProgress">
        <div class="progress_current" :style="{ width: barWidth }"></div>
      </div>
      <div class="time">
        <div class="progress_time">{{ currentTime }}</div>
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
  methods: {
    clickProgress(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const percentage = ((event.clientX - rect.left) / rect.width) * 100;
      this.$emit('seek-percentage', Math.min(100, Math.max(0, percentage)));
    }
  }
};
</script>
