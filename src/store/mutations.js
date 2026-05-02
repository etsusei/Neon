import * as types from './mutation-types';

function requestTrackPlayback(state, trackIndex) {
    // Force watchers to run even when the same index is selected again.
    state.playback.requestedTrackIndex = null;
    setTimeout(() => {
        state.playback.requestedTrackIndex = trackIndex;
    }, 0);
}

function setCurrentTrackIndex(state, trackIndex) {
    state.playback.requestedTrackIndex = trackIndex;
    state.playback.currentTrackIndex = trackIndex;
}

function setPlaybackActive(state, isPlaying) {
    state.playback.isPlaying = isPlaying;
}

function setPlaybackCover(state, coverUrl) {
    state.playback.coverImage = coverUrl || "";
}

function setPlaybackTime(state, time) {
    state.playback.currentTime = time;
}

function setPlaybackSeekTime(state, time) {
    state.playback.seekTime = time;
}

function setPlaybackMode(state, mode) {
    state.playback.mode = mode;
}

function setSingleTrackPlayback(state, isSingleTrack) {
    state.playback.isSingleTrack = isSingleTrack;
}

function setShuffledPlaybackOrder(state, indices) {
    state.playback.shuffledIndices = indices;
}

const mutations = {
    [types.PushTracks](state, songs) {
        state.tracks.splice(0, state.tracks.length);
        for (var i = 0; i < songs.length; i++) {
            state.tracks.push({
                id: songs[i].id,
                name: songs[i].name,
                artist: songs[i].ar[0].name,
                album: songs[i].al.name,
                cover: songs[i].al.picUrl
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
                cover: songs[i].album.img1v1Url || songs[i].album.picUrl || ""
            })
        }
    },

    [types.RequestTrackPlayback]: requestTrackPlayback,
    [types.SetCurrentTrackIndex]: setCurrentTrackIndex,
    [types.SetPlaybackActive]: setPlaybackActive,
    [types.SetPlaybackCover]: setPlaybackCover,
    [types.SetPlaybackTime]: setPlaybackTime,
    [types.SetPlaybackSeekTime]: setPlaybackSeekTime,
    [types.SetPlaybackMode]: setPlaybackMode,
    [types.SetSingleTrackPlayback]: setSingleTrackPlayback,
    [types.SetShuffledPlaybackOrder]: setShuffledPlaybackOrder,

    [types.SetAudioIntensity](state, intensity) {
        state.audioIntensity = intensity;
    },
    [types.ToggleImmersiveMode](state) {
        state.isImmersiveMode = !state.isImmersiveMode;
    },
    [types.SetLyricDarkMode](state, isDark) {
        state.lyricDarkMode = isDark;
    },
    [types.ToggleDarkMode](state) {
        state.isDarkMode = !state.isDarkMode;
    },

    // Legacy aliases.
    [types.GetIndex]: requestTrackPlayback,
    [types.PushIndex]: setCurrentTrackIndex,
    [types.SetIsPlaying]: setPlaybackActive,
    [types.SetCurrentTrackCover]: setPlaybackCover,
    [types.SetCurrentTime]: setPlaybackTime,
    [types.SetSeekTime]: setPlaybackSeekTime,
    [types.SetPlayMode]: setPlaybackMode,
    [types.SetSinglePlay]: setSingleTrackPlayback,
    [types.SetShuffledIndices]: setShuffledPlaybackOrder
}

export default mutations;
