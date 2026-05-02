<template>
  <div class="album-info">
    <div
      class="player-cover__item"
      @click="$emit('toggle-immersive-mode')"
      :style="{
        backgroundImage: `url(${track.cover})`,
        transform: `scale(${albumScale})`,
        transition: 'transform 0.1s ease-out'
      }"
    >
      <div class="cover-overlay">
        <i class="fa fa-eye"></i>
      </div>
    </div>
    <div class="album-right">
      <div class="album-right_name">{{ track.name }}</div>
      <div class="album-right_info">
        {{ track.album }}-----{{ track.artist }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerTrackInfo',
  props: {
    track: {
      type: Object,
      required: true
    },
    albumScale: {
      type: Number,
      default: 1
    }
  },
  emits: ['toggle-immersive-mode']
};
</script>
