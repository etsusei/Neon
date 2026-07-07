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
      <marquee-text class="album-right_name" :text="track.name" />
      <marquee-text class="album-right_info" :text="track.artist" />
    </div>
  </div>
</template>

<script>
import MarqueeText from '../MarqueeText.vue';

export default {
  name: 'PlayerTrackInfo',
  components: {
    MarqueeText
  },
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
