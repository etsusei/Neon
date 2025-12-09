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
        state.index = index
    },
    [types.PushIndex](state, currentIndex) {
        console.log('[mutations] PushIndex called');
        console.log('[mutations]   Old index:', state.index);
        console.log('[mutations]   New index:', currentIndex);
        state.index = currentIndex;
        state.currentIndex = currentIndex;
        console.log('[mutations]   State updated, index is now:', state.index);
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
    }
}
export default mutations;