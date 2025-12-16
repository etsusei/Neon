<template>
  <div class="playlist-detail-container">
    <div class="header">

      <div class="playlist-header-info">
        <div class="playlist-cover" :style="{ backgroundImage: `url(${playlist.cover || defaultCover})` }"></div>
        <div class="playlist-meta">
          <h1>{{ playlist.name }}</h1>
          <p>{{ songs.length }} 首歌曲</p>
        </div>
      </div>

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
      const filename = `${song.song_name} - ${song.artist}`;
      
      // 使用后端代理下载接口
      const downloadUrl = `https://neon.zeabur.app/api/music/download?id=${song.song_id}&name=${encodeURIComponent(filename)}`;
      
      console.log(`[下载] 开始: ${filename}`);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
      
      ElMessage.success('开始下载...');
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
    color: var(--text-primary);
  }
  
  p {
    margin: 6px 0 0;
    color: var(--text-secondary);
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
  color: var(--text-primary);
}

.song-artist {
  font-size: 13px;
  color: var(--text-secondary);
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
  /* Mobile Optimization */
  @media screen and (max-width: 520px) {
    .playlist-detail-container {
      padding: 0 12px 100px 12px; /* Top padding handled by header spacing */
      position: relative;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden; /* Prevent horizontal spill */
    }

    .header {
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-top: 20px;
      margin-bottom: 30px;
      width: 100%; /* constrain header */
    }


    .playlist-header-info {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 100%; /* Double safety */
      margin: 0;
      overflow: hidden;
    }

    .playlist-cover {
      width: 220px;
      height: 220px;
      margin: 0 auto 20px auto; /* Force horizontal centering */
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }

    .playlist-meta {
      margin-left: 0;
      margin-bottom: 24px;
      width: 100%;
    }

    .playlist-meta h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }



    /* Song List Mobile */
    .song-index {
      display: none;
    }

    .song-item {
      padding: 12px 0;
      border-bottom: 0.5px solid rgba(0,0,0,0.05);
    }

    .song-cover {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      margin-right: 14px;
    }

    .song-info {
      overflow: hidden;
    }

    .song-name {
      font-size: 16px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
</style>
