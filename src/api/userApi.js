import { apiClient } from "./http"

// ========== Auth API ==========

export const login = (username, password) => {
    return apiClient.post('api/auth/login', { username, password })
}

export const getCurrentUser = () => {
    return apiClient.get('api/auth/me')
}

export const updateProfile = (data) => {
    return apiClient.put('api/auth/profile', data)
}

// ========== Playlist API ==========

export const getMyPlaylists = () => {
    return apiClient.get('api/playlists')
}

export const createPlaylist = (name, cover) => {
    return apiClient.post('api/playlists', { name, cover })
}

export const deletePlaylist = (id) => {
    return apiClient.delete(`api/playlists/${id}`)
}

export const getPlaylistSongs = (id) => {
    return apiClient.get(`api/playlists/${id}/songs`)
}

export const addSongToPlaylist = (playlistId, song) => {
    return apiClient.post(`api/playlists/${playlistId}/songs`, {
        song_id: song.id,
        song_name: song.name,
        artist: song.artist,
        album: song.album,
        cover: song.cover
    })
}

export const removeSongFromPlaylist = (playlistId, songId) => {
    return apiClient.delete(`api/playlists/${playlistId}/songs/${songId}`)
}

// ========== Export / import API ==========

export const exportPlaylists = () => {
    return apiClient.get('api/export')
}

export const importPlaylists = (data) => {
    return apiClient.post('api/export', data)
}
