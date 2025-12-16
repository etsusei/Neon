import * as types from './mutation-types';
const mutations = {
    [types.PushTracks](state, songs) {
        state.tracks.splice(0, state.tracks.length);
        for (var i = 0; i < songs.length; i++) {
            state.tracks.push({
                id: songs[i].id,
                name: songs[i].name,
                artist: songs[i].ar[0].name,
                album: songs[i].al.name,
                cover: songs[i].al.picUrl,
                source: "https://music.163.com/song/media/outer/url?id=" + songs[i].id + ".mp3"
            })
        }
    },
    [types.PushSearchTracks](state, songs) {
        state.tracks.splice(0, state.tracks.length);
        for (var i = 0; i < songs.length; i++) {
            state.tracks.push({
                id: songs[i].id,
                name: songs[i].name,
                artist: songs[i].artists[0].name,
                album: songs[i].album.name,
                cover: songs[i].album.img1v1Url || songs[i].album.picUrl || "",
                source: "https://music.163.com/song/media/outer/url?id=" + songs[i].id + ".mp3"
            })
        }
    },
    [types.GetIndex](state, index) {
        // 强制触发 watcher：先设为 null 再设为目标值
        // 这样即使 index 相同也会触发更新
        state.index = null;
        setTimeout(() => {
            state.index = index;
        }, 0);
    },
    [types.PushIndex](state, currentIndex) {
        // 直接设置，不使用强制触发（避免与 jumpToClick 形成循环）
        state.index = currentIndex;
        state.currentIndex = currentIndex;
    },
    [types.SetIsPlaying](state, isPlaying) {
        console.log('[mutations] SetIsPlaying:', isPlaying);
        state.isPlaying = isPlaying;
    },
    [types.SetCurrentTrackCover](state, coverUrl) {
        console.log('[mutations] SetCurrentTrackCover:', coverUrl);
        state.currentTrackCover = coverUrl;
    },
    [types.SetAudioIntensity](state, intensity) {
        state.audioIntensity = intensity;
    },
    [types.ToggleImmersiveMode](state) {
        state.isImmersiveMode = !state.isImmersiveMode;
        console.log('[mutations] ToggleImmersiveMode:', state.isImmersiveMode);
    },
    [types.SetCurrentTime](state, time) {
        state.currentTime = time;
    },
    [types.SetSeekTime](state, time) {
        state.seekTime = time;
    },
    [types.SetLyricDarkMode](state, isDark) {
        state.lyricDarkMode = isDark;
    },
    // 播放模式
    [types.SetPlayMode](state, mode) {
        state.playMode = mode;
        console.log('[mutations] SetPlayMode:', mode);
    },
    [types.SetSinglePlay](state, isSingle) {
        state.isSinglePlay = isSingle;
        console.log('[mutations] SetSinglePlay:', isSingle);
    },
    [types.SetShuffledIndices](state, indices) {
        state.shuffledIndices = indices;
        console.log('[mutations] SetShuffledIndices:', indices.length, 'items');
    },
    [types.ToggleDarkMode](state) {
        state.isDarkMode = !state.isDarkMode;
        console.log('[mutations] ToggleDarkMode:', state.isDarkMode);
    },
    [types.SetIsPlayerExpanded](state, isExpanded) {
        state.isPlayerExpanded = isExpanded;
    }
}
export default mutations;