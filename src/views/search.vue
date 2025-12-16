<template>
  <div class="search-warpper">
    <!-- Search Bar for Mobile/Page Top -->
    <div class="page-search-container">
      <liquid-card border-radius="20px">
        <div class="page-search-inner">
          <input
            class="page-search-input"
            v-model="localKeyword"
            type="text"
            placeholder="Search songs, albums, artists..."
            @keyup.enter="onSearch"
          />
          <svg
            @click="onSearch"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            class="feather feather-search"
            viewBox="0 0 24 24"
            style="cursor: pointer; margin-right: 12px;"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
        </div>
      </liquid-card>
    </div>

    <el-tabs type="border-card">
      <el-tab-pane label="Song">
        <list-search 
          :result="songResult" 
          :loading="songLoading"
          :hasMore="songHasMore"
          @load-more="loadMoreSongs"
        />
      </el-tab-pane>
      <el-tab-pane label="Album">
        <search-album 
          :result="albumResult" 
          :loading="albumLoading"
          :hasMore="albumHasMore"
          @load-more="loadMoreAlbums"
        />
      </el-tab-pane>
      <el-tab-pane label="Artist">
        <search-artist 
          :result="artistResult" 
          :loading="artistLoading"
          :hasMore="artistHasMore"
          @load-more="loadMoreArtists"
        />
      </el-tab-pane>
      <el-tab-pane label="List">
        <search-list 
          :result="listResult"
          :loading="listLoading"
          :hasMore="listHasMore"
          @load-more="loadMoreLists"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import listSearch from "../components/listSearch.vue"
import searchAlbum from "../components/searchAlbum.vue"
import searchArtist from "../components/searchArtist.vue"
import searchList from "../components/searchList.vue"
import LiquidCard from "../components/LiquidCard.vue" // Import LiquidCard
import {searchSongs,searchAlbums,searchArtists,searchLists,getSongsDetailBatch} from "../api/neteaseApi"

const PAGE_SIZE = 20;

export default {
    components:{
        listSearch,
        searchAlbum,
        searchArtist,
        searchList,
        LiquidCard // Register
    },
    props:['keyword'],
    data(){
      return{
        localKeyword: this.keyword || '', // Init with prop
        // Song
        songResult: [],
        songOffset: 0,
        songLoading: false,
        songHasMore: true,
        // Album
        albumResult: [],
        albumOffset: 0,
        albumLoading: false,
        albumHasMore: true,
        // Artist
        artistResult: [],
        artistOffset: 0,
        artistLoading: false,
        artistHasMore: true,
        // List
        listResult: [],
        listOffset: 0,
        listLoading: false,
        listHasMore: true
      }
    },
    methods:{
      onSearch() {
        if (this.localKeyword && this.localKeyword !== this.keyword) {
           this.$router.push({ name: 'Search', params: { keyword: this.localKeyword } });
        }
      },
      // ========== Song ==========
      resetSongSearch() {
        this.songResult = [];
        this.songOffset = 0;
        this.songHasMore = true;
      },
      async getSongs(isLoadMore = false) {
        if (this.songLoading) return;
        if (!isLoadMore) this.resetSongSearch();
        
        this.songLoading = true;
        try {
          // Use this.keyword (prop) for actual API call, or localKeyword?
          // Router update will trigger watcher, which calls getSongs.
          // So getSongs should use this.keyword.
          // Fallback to localKeyword if keyword prop is missing?
          const query = this.keyword || this.localKeyword;
          if (!query) {
             this.songLoading = false;
             return;
          }
          
          const result = await searchSongs(query, this.songOffset, PAGE_SIZE);
          if (result.data.code == "200" && result.data.result.songs) {
            const songs = result.data.result.songs;
            if (songs.length < PAGE_SIZE) this.songHasMore = false;
            
            // 使用官方API批量获取封面（一次请求，更可靠）
            const songIds = songs.map(s => s.id);
            const detailSongs = await getSongsDetailBatch(songIds);
            
            // 创建 ID 到封面的映射
            const coverMap = {};
            detailSongs.forEach(ds => {
              if (ds && ds.al && ds.al.picUrl) {
                coverMap[ds.id] = ds.al.picUrl;
              }
            });
            
            // 为每首歌设置封面
            songs.forEach(song => {
              song.album = song.album || {};
              song.album.img1v1Url = coverMap[song.id] || song.album.picUrl || '';
            });
            
            this.songResult = isLoadMore ? [...this.songResult, ...songs] : songs;
            this.songOffset += songs.length;
          } else {
            this.songHasMore = false;
          }
        } catch (e) {
          console.error('搜索歌曲失败:', e);
        } finally {
          this.songLoading = false;
        }
      },
      loadMoreSongs() {
        if (this.songHasMore && !this.songLoading) this.getSongs(true);
      },

      // ========== Album ==========
      resetAlbumSearch() {
        this.albumResult = [];
        this.albumOffset = 0;
        this.albumHasMore = true;
      },
      async getAlbums(isLoadMore = false) {
        if (this.albumLoading) return;
        if (!isLoadMore) this.resetAlbumSearch();
        
        this.albumLoading = true;
        try {
          const query = this.keyword || this.localKeyword;
          const result = await searchAlbums(query, this.albumOffset, PAGE_SIZE);
          if (result.data.code == "200" && result.data.result.albums) {
            const albums = result.data.result.albums;
            if (albums.length < PAGE_SIZE) this.albumHasMore = false;
            
            this.albumResult = isLoadMore ? [...this.albumResult, ...albums] : albums;
            this.albumOffset += albums.length;
          } else {
            this.albumHasMore = false;
          }
        } catch (e) {
          console.error('搜索专辑失败:', e);
        } finally {
          this.albumLoading = false;
        }
      },
      loadMoreAlbums() {
        if (this.albumHasMore && !this.albumLoading) this.getAlbums(true);
      },

      // ========== Artist ==========
      resetArtistSearch() {
        this.artistResult = [];
        this.artistOffset = 0;
        this.artistHasMore = true;
      },
      async getArtists(isLoadMore = false) {
        if (this.artistLoading) return;
        if (!isLoadMore) this.resetArtistSearch();
        
        this.artistLoading = true;
        try {
          const query = this.keyword || this.localKeyword;
          const result = await searchArtists(query, this.artistOffset, PAGE_SIZE);
          if (result.data.code == "200" && result.data.result.artists) {
            const artists = result.data.result.artists;
            if (artists.length < PAGE_SIZE) this.artistHasMore = false;
            
            this.artistResult = isLoadMore ? [...this.artistResult, ...artists] : artists;
            this.artistOffset += artists.length;
          } else {
            this.artistHasMore = false;
          }
        } catch (e) {
          console.error('搜索艺人失败:', e);
        } finally {
          this.artistLoading = false;
        }
      },
      loadMoreArtists() {
        if (this.artistHasMore && !this.artistLoading) this.getArtists(true);
      },

      // ========== List ==========
      resetListSearch() {
        this.listResult = [];
        this.listOffset = 0;
        this.listHasMore = true;
      },
      async getLists(isLoadMore = false) {
        if (this.listLoading) return;
        if (!isLoadMore) this.resetListSearch();
        
        this.listLoading = true;
        try {
          const query = this.keyword || this.localKeyword;
          const result = await searchLists(query, this.listOffset, PAGE_SIZE);
          if (result.data.code == "200" && result.data.result.playlists) {
            const playlists = result.data.result.playlists;
            if (playlists.length < PAGE_SIZE) this.listHasMore = false;
            
            this.listResult = isLoadMore ? [...this.listResult, ...playlists] : playlists;
            this.listOffset += playlists.length;
          } else {
            this.listHasMore = false;
          }
        } catch (e) {
          console.error('搜索歌单失败:', e);
        } finally {
          this.listLoading = false;
        }
      },
      loadMoreLists() {
        if (this.listHasMore && !this.listLoading) this.getLists(true);
      }
    },
    watch: {
      keyword: {
        handler(newKeyword, oldKeyword) {
          if (newKeyword && newKeyword !== oldKeyword) {
            this.localKeyword = newKeyword; // Sync local
            this.getSongs();
            this.getAlbums();
            this.getArtists();
            this.getLists();
          }
        },
        immediate: false
      }
    },
    mounted(){
      this.getSongs();
      this.getAlbums();
      this.getArtists();
      this.getLists();
    }
};
</script>

<style lang="scss">
.search-warpper{
  width: 100% !important;
  max-width: 1480px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 32px;
}

.page-search-container {
  width: 100%;
  height: 44px;
  margin-bottom: 20px;
}

.page-search-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
  padding-left: 16px;
}

.page-search-input {
  border: none;
  flex: 1;
  outline: none;
  height: 100%;
  font-size: 16px;
  background-color: transparent;
  color: var(--main-color, #333);
  
  &::placeholder {
    color: var(--main-color, #333);
    opacity: 0.6;
  }
}

/* Make sure text is visible in dark mode if main-color changes */
.dark-mode .page-search-input {
  color: #fff;
  &::placeholder {
    color: #fff;
  }
}

.el-tabs--border-card {
  background: none;
  border: none;
  box-shadow: none;
}
div#pane-1 {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
}
div#pane-2 {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
}
div#pane-3 {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: auto 0;
}
.el-tabs--border-card>.el-tabs__header {
    background-color: rgba(255,255,255,0.5);
    border-bottom: none;
    margin: 0;
    border-radius: 0 0 10px 10px;
}
.el-tabs--border-card>.el-tabs__header .el-tabs__item.is-active {
    color:none;
    background-color: #00000012;
    border-radius: 0 0 10px 10px;
     border-right-color: none; 
    border-left-color:none 
}
</style>