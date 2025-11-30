import axios from "axios"
let baseUrl = 'https://netease-cloud-music-api-qqlcx5.vercel.app/'
let musicUrl = 'https://api.kxzjoker.cn/api/163_music'

export const getAlbumInfo = (id) => {
    return axios.get(`${baseUrl}album?id=${id}`);
}
export const getPlayListInfo = (id) => {
    return axios.get(`${baseUrl}playlist/detail?id=${id}`)
}

export const getAllSongs = (id) => {
    return axios.get(`${baseUrl}song/detail?ids=${id}`)
}

export const getArtistTrend = (id) => {
    return axios.get(`${baseUrl}artists?id=${id}`)
}

export const getArtistAlbum = (id) => {
    return axios.get(`${baseUrl}artist/album?id=${id}`)
}

export const getSongUrl = (id) => {
    return axios.get(`${musicUrl}?url=https://y.music.163.com/m/song?id=${id}&level=standard&type=json`)
}

/////////////////////////search//////////////////////////
export const searchSongs = (id) => {
    return axios.get(`${baseUrl}search?keywords=${id}&type=1`)
}

export const searchAlbums = (id) => {
    return axios.get(`${baseUrl}search?keywords=${id}&type=10`)
}

export const searchArtists = (id) => {
    return axios.get(`${baseUrl}search?keywords=${id}&type=100`)
}

export const searchLists = (id) => {
    return axios.get(`${baseUrl}search?keywords=${id}&type=1000`)
}

export const getTrendList = () => {
    return axios.get(`${baseUrl}top/playlist?limit=10&order=hot`)
}

export const getRank = () => {
    return axios.get(`${baseUrl}toplist/detail`)
}