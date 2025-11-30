<template>
  <div v-if="currentIndex !== null">
    <div
      v-for="(track, $index) in tracks"
      :key="$index"
      :class="currentIndex == $index ? isPlay : warp"
      @click="toPlay($index)"
    >
      <div
        class="album-img"
        :style="{ backgroundImage: `url(${track.cover})` }"
      ></div>
      <div class="info">
        <div class="songname">{{ track.name }}</div>
        <div class="albuminfo">{{ track.artist }}</div>
      </div>
    </div>
  </div>
</template>


<script>
import { mapGetters } from "vuex";
import { mapMutations } from "vuex";
export default {
  data() {
    return {
      isPlay: "play",
      warp: "warpper",
    };
  },
  computed: {
    ...mapGetters(["tracks", "currentIndex"]),
  },
  watch: {
    // currentIndex: {
    //   handler: function (newindex) {
    //     if (newindex) {
    //     }
    //   },
    //   deep: true,
    //   immediate: true,
    // },
  },
  methods: {
    ...mapMutations({
      toPlay: "GetIndex",
    }),
  },
};
</script>

<style lang="scss">
.warpper {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  height: 50px;
  width: 200px;
  padding: 0 0 0 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}
.play {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  height: 50px;
  width: 200px;
  padding: 0 0 0 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  background-color: rgba(210, 210, 210, 0.6);
}
.warpper:hover {
  background-color: rgba(210, 210, 210, 0.6);
}
.album-img {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  width: 30px;
  height: 30px;
  border-radius: 5px;
  padding: 0 3px 0 0;
  margin: auto 0;
}
.info {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  margin: auto 0;
  padding: 0 0 0 10px;
  width: 150px;
  overflow: hidden;
}
.songname {
  font-size: 16px;
  text-align: left;
  overflow: hidden;
}
.albuminfo {
  font-size: 10px;
  text-align: left;
  border-bottom-style: ridge;
  overflow: hidden;
}
</style>