<template>
  <div class="playlist-detail-container">
    <div class="header">
      <div class="back-btn" @click="$router.back()">
        <i class="fa fa-arrow-left"></i>
      </div>
      <div class="playlist-header-info">
        <div class="playlist-cover" :style="{ backgroundImage: `url(${playlist.cover || defaultCover})` }"></div>
        <div class="playlist-meta">
          <h1>{{ playlist.name }}</h1>
          <p>{{ songs.length }} 首歌曲</p>
        </div>
      </div>
      <button class="play-all-btn" @click="playAll" v-if="songs.length > 0">
        <i class="fa fa-play"></i> 播放全部
      </button>
    </div>

    <div class="songs-list" v-if="songs.length > 0">
      <div 
        v-for="(song, index) in songs" 
        :key="song.id" 
        class="song-item"
        @click="playSong(index)"
      >
        <div class="song-index">{{ index + 1 }}</div>
        <div class="song-cover" :style="{ backgroundImage: `url(${song.cover})` }"></div>
        <div class="song-info">
          <div class="song-name">{{ song.song_name }}</div>
          <div class="song-artist">{{ song.artist }}</div>
        </div>
        <div class="song-actions" @click.stop>
          <i class="fa fa-download" @click="downloadSong(song)"></i>
          <i class="fa fa-trash" @click="removeSong(song)"></i>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <i class="fa fa-music"></i>
      <p>歌单还是空的</p>
    </div>
  </div>
</template>

<script>
import { getPlaylistSongs, removeSongFromPlaylist, getMyPlaylists } from '../api/userApi'
import { mapMutations } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'MyPlaylistDetail',
  props: ['id'],
  data() {
    return {
      playlist: {},
      songs: [],
      defaultCover: 'https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg'
    }
  },
  methods: {
    ...mapMutations({
      pushToPlayer: 'PushTracks',
      toPlay: 'GetIndex'
    }),
    async loadPlaylist() {
      try {
        // Get playlist info
        const playlistsRes = await getMyPlaylists()
        if (playlistsRes.data.code === 200) {
          this.playlist = playlistsRes.data.data.find(p => p.id == this.id) || {}
        }
        
        // Get songs
        const songsRes = await getPlaylistSongs(this.id)
        if (songsRes.data.code === 200) {
          this.songs = songsRes.data.data
        }
      } catch (err) {
        console.error('Load playlist error:', err)
      }
    },
    playAll() {
      if (this.songs.length === 0) return
      
      // 转换格式
      const tracks = this.songs.map(s => ({
        id: s.song_id,
        name: s.song_name,
        ar: [{ name: s.artist }],
        al: { name: s.album, picUrl: s.cover }
      }))
      
      this.pushToPlayer(tracks)
      this.toPlay(0)
      this.$store.commit('SetSinglePlay', false)
    },
    playSong(index) {
      const tracks = this.songs.map(s => ({
        id: s.song_id,
        name: s.song_name,
        ar: [{ name: s.artist }],
        al: { name: s.album, picUrl: s.cover }
      }))
      
      this.pushToPlayer(tracks)
      this.toPlay(index)
      this.$store.commit('SetSinglePlay', false)
    },
    async removeSong(song) {
      try {
        await ElMessageBox.confirm(`确定要从歌单中移除「${song.song_name}」吗？`, '确认移除', {
          confirmButtonText: '移除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const res = await removeSongFromPlaylist(this.id, song.song_id)
        if (res.data.code === 200) {
          this.loadPlaylist()
          ElMessage.success('已移除')
        }
      } catch (err) {
        if (err !== 'cancel') {
          ElMessage.error('移除失败')
        }
      }
    },
    async downloadSong(song) {
      const filename = `${song.song_name} - ${song.artist}.mp3`;
      
      // 方法1: 优先使用 VIP 接口（后端统一接口）
      try {
        const response = await fetch(`https://neon.zeabur.app/api/music/url?id=${song.song_id}`);
        const data = await response.json();
        
        if (data.code === 200 && data.data && data.data.url) {
          console.log(`[下载] VIP接口成功 (${data.data.source}): ${filename}`);
          await this.downloadFile(data.data.url, filename);
          return;
        }
      } catch (e) {
        console.warn('[下载] VIP接口失败:', e);
      }
      
      // 方法2: 备用第三方接口
      console.log('[下载] VIP接口失败，尝试第三方接口...');
      const qualities = ['exhigh', 'standard'];
      const apiTemplate = (id, level) => 
        `https://api.kxzjoker.cn/api/163_music?url=https://y.music.163.com/m/song?id=${id}&userid=8719916627&dlt=0846&level=${level}&type=json`;
      
      for (const quality of qualities) {
        try {
          const response = await fetch(apiTemplate(song.song_id, quality));
          const data = await response.json();
          
          if (data.status === 200 && data.url) {
            console.log(`[下载] 第三方接口成功: ${filename}`);
            await this.downloadFile(data.url, filename);
            return;
          }
        } catch (e) {
          console.warn(`[下载] 第三方接口 ${quality} 失败`);
        }
      }
      
      ElMessage.error('获取下载链接失败');
    },
    async downloadFile(url, filename) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        ElMessage.success('下载成功');
      } catch (e) {
        window.open(url, '_blank');
      }
    }
  },
  mounted() {
    this.loadPlaylist()
  }
}
</script>

<style lang="scss" scoped>
.playlist-detail-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.2);
  }
}

.playlist-header-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.playlist-cover {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
}

.playlist-meta {
  margin-left: 16px;
  
  h1 {
    margin: 0;
    font-size: 22px;
  }
  
  p {
    margin: 6px 0 0;
    color: #666;
  }
}

.play-all-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
}

.songs-list {
  display: flex;
  flex-direction: column;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.song-index {
  width: 30px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.song-cover {
  width: 45px;
  height: 45px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  margin-right: 12px;
}

.song-info {
  flex: 1;
}

.song-name {
  font-size: 15px;
  font-weight: 500;
}

.song-artist {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
}

.song-actions {
  display: flex;
  gap: 4px;
  
  i {
    color: #999;
    padding: 8px;
    cursor: pointer;
    transition: color 0.2s;
    
    &.fa-download:hover {
      color: #52c41a;
    }
    
    &.fa-trash:hover {
      color: #f5222d;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  
  i {
    font-size: 48px;
    margin-bottom: 16px;
  }
}
</style>
