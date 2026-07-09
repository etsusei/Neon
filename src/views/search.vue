<template>
  <div class="search-warpper">
    <!-- 页内搜索框：移动端顶部搜索被隐藏后由此承担搜索入口 -->
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
import LiquidCard from "../components/LiquidCard.vue"
import {searchSongs,searchAlbums,searchArtists,searchLists,getSongsDetailBatch} from "../api/neteaseApi"

const PAGE_SIZE = 20;

export default {
    components:{
        listSearch,
        searchAlbum,
        searchArtist,
        searchList,
        LiquidCard
    },
    props:['keyword'],
    data(){
      return{
        localKeyword: (this.keyword || '').trim(),
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
    computed: {
      // 实际用于请求的关键词：路由参数优先，页内输入兜底（BottomNav 用空格占位进入本页）
      activeKeyword() {
        return ((this.keyword || '').trim() || this.localKeyword.trim());
      }
    },
    methods:{
      onSearch() {
        const kw = this.localKeyword.trim();
        if (!kw) return;
        if (kw !== (this.keyword || '').trim()) {
          this.$router.push({ name: 'Search', params: { keyword: kw } });
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
        
        if (!this.activeKeyword) return;
        this.songLoading = true;
        try {
          const result = await searchSongs(this.activeKeyword, this.songOffset, PAGE_SIZE);
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
        
        if (!this.activeKeyword) return;
        this.albumLoading = true;
        try {
          const result = await searchAlbums(this.activeKeyword, this.albumOffset, PAGE_SIZE);
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
        
        if (!this.activeKeyword) return;
        this.artistLoading = true;
        try {
          const result = await searchArtists(this.activeKeyword, this.artistOffset, PAGE_SIZE);
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
        
        if (!this.activeKeyword) return;
        this.listLoading = true;
        try {
          const result = await searchLists(this.activeKeyword, this.listOffset, PAGE_SIZE);
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
            this.localKeyword = newKeyword.trim();
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
  width: 100%;
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
  flex-shrink: 0;
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