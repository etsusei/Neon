<template>
  <div class="volume-control">
    <div class="volume-control_row">
      <div class="volume-control_speaker">
        <i class="fa fa-volume-up"></i>
      </div>
      <div class="volume-control_bar">
        <div
          class="bar"
          ref="volumeBar"
          @mousedown="startVolumeDrag"
          @click="clickVolume"
        >
          <div class="current-volume" :style="{ width: volumeWidth }"></div>
        </div>
      </div>
      <div class="playlist-btn" @click="$emit('open-playlist')">
        <i class="fa fa-list"></i>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerVolume',
  props: {
    volumeWidth: {
      type: String,
      default: '0%'
    }
  },
  emits: ['set-volume-percentage', 'open-playlist'],
  data() {
    return {
      isDragging: false
    };
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.handleVolumeDrag);
    document.removeEventListener('mouseup', this.stopVolumeDrag);
  },
  methods: {
    getPercentage(event) {
      const rect = this.$refs.volumeBar.getBoundingClientRect();
      return Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    },
    clickVolume(event) {
      if (!this.isDragging) {
        this.$emit('set-volume-percentage', this.getPercentage(event));
      }
    },
    startVolumeDrag(event) {
      event.preventDefault();
      this.isDragging = true;
      this.$emit('set-volume-percentage', this.getPercentage(event));
      document.addEventListener('mousemove', this.handleVolumeDrag);
      document.addEventListener('mouseup', this.stopVolumeDrag);
    },
    handleVolumeDrag(event) {
      if (this.isDragging) {
        this.$emit('set-volume-percentage', this.getPercentage(event));
      }
    },
    stopVolumeDrag() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.handleVolumeDrag);
      document.removeEventListener('mouseup', this.stopVolumeDrag);
    }
  }
};
</script>
