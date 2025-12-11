import axios from "axios"
let baseUrl = 'https://neon.zeabur.app/'
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

// 获取歌曲播放URL - 调用后端统一接口（后端处理 VIP Cookie 和 fallback）
export const getSongUrl = async (id) => {
    try {
        const response = await axios.get(`${baseUrl}api/music/url?id=${id}`)
        if (response.data && response.data.code === 200 && response.data.data?.url) {
            return {
                data: {
                    url: response.data.data.url,
                    id: id,
                    source: response.data.data.source
                }
            }
        }
    } catch (e) {
        console.error('[API] 获取歌曲URL失败:', e)
    }
    return { data: { url: null, msg: '无法获取歌曲链接' } }
}

/////////////////////////search//////////////////////////
export const searchSongs = (keyword, offset = 0, limit = 20) => {
    return axios.get(`${baseUrl}search?keywords=${keyword}&type=1&offset=${offset}&limit=${limit}`)
}

// 获取单曲详情（包含封面）- 使用官方API（更可靠）
export const getSongDetailOfficial = async (songId) => {
    try {
        const response = await axios.get(`${baseUrl}song/detail?ids=${songId}`);
        if (response.data.songs && response.data.songs.length > 0) {
            const song = response.data.songs[0];
            return {
                pic: song.al?.picUrl || '',
                name: song.name,
                ar_name: song.ar?.[0]?.name || ''
            };
        }
        return null;
    } catch (e) {
        console.error('获取歌曲详情失败:', e);
        return null;
    }
}

// 批量获取歌曲详情（一次请求获取多首歌的封面）
export const getSongsDetailBatch = async (songIds) => {
    try {
        const idsStr = songIds.join(',');
        const response = await axios.get(`${baseUrl}song/detail?ids=${idsStr}`);
        if (response.data.songs) {
            return response.data.songs;
        }
        return [];
    } catch (e) {
        console.error('批量获取歌曲详情失败:', e);
        return [];
    }
}

// 获取单曲详情 - 使用第三方API（备用，用于下载）
export const getSongDetail = async (songId) => {
    try {
        const response = await axios.get(`${musicUrl}?url=https://y.music.163.com/m/song?id=${songId}&level=standard&type=json`);
        return response.data;
    } catch (e) {
        console.error('获取歌曲详情失败:', e);
        return null;
    }
}

export const searchAlbums = (keyword, offset = 0, limit = 20) => {
    return axios.get(`${baseUrl}search?keywords=${keyword}&type=10&offset=${offset}&limit=${limit}`)
}

export const searchArtists = (keyword, offset = 0, limit = 20) => {
    return axios.get(`${baseUrl}search?keywords=${keyword}&type=100&offset=${offset}&limit=${limit}`)
}

export const searchLists = (keyword, offset = 0, limit = 20) => {
    return axios.get(`${baseUrl}search?keywords=${keyword}&type=1000&offset=${offset}&limit=${limit}`)
}

export const getTrendList = () => {
    return axios.get(`${baseUrl}top/playlist?limit=10&order=hot`)
}

export const getRank = () => {
    return axios.get(`${baseUrl}toplist/detail`)
}

// 获取歌词
export const getLyric = (songId) => {
    return axios.get(`${baseUrl}lyric?id=${songId}`)
}