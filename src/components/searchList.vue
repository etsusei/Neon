<template>
  <div class="search-list-container">
    <div class="cover-warpper" v-for="(track, $index) in result" :key="$index">
      <router-link :to="{name:'List',params:{listId:`${track.id}`}}">
        <div class="cover" @click="toList">
          <img 
            :src="track.coverImgUrl" 
            referrerpolicy="no-referrer" 
            alt="cover" 
            @error="handleImageError($event, track)"
          />
          <div v-if="track.imageError" class="image-error">Img Err</div>
        </div>
      </router-link>
      <div class="name">{{ track.name }}</div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["result"],
  data() {
    return {};
  },
  methods: {
    toList() {
      // Logic if needed, or rely on router-link
    },
    handleImageError(e, track) {
      // console.error('Image failed to load:', track.coverImgUrl);
      track.imageError = true; 
      e.target.style.display = 'none';
      e.target.parentElement.innerText = 'Img Err';
    }
  },
};
</script>

<style lang="scss">
.search-list-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
}
.cover-warpper {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 200px;
  width: 200px;
  margin: 30px 37px;
}
.cover {
  width: 175px;
  height: 175px;
  border-radius: 20px;
  padding: 0 0 0 0;
  margin: auto;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease-in-out;
}
.cover:hover img {
  transform: scale(1.05);
}
.image-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-size: 14px;
}
</style>