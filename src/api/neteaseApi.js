import { apiClient, externalClient, getWithRetry } from "./http"
import { thumb } from "../utils/imgThumb"

const musicUrl = 'https://api.kxzjoker.cn/api/163_music'
const encodeKeyword = (keyword) => encodeURIComponent(keyword || '')

// 带超时的 axios 实例：弱网下请求不会永久挂起，到点失败可被 catch/重试

// 通用 GET 重试：弱网(尤其大陆访问东京)偶发丢包时，重试一次往往就成功

// 单批歌曲详情（带重试），ids 为逗号串
export const getSongsDetailChunk = (idsStr) => {
  return getWithRetry(`song/detail?ids=${idsStr}`)
}

/**
 * 分批拉取歌曲详情，避免一个巨型请求在弱网上整体卡死。
 * @param {Array} trackIds  trackIds 数组（每项含 .id），保持原始顺序
 * @param {Function} onBatch (songs, fromIndex) => void  每批到达即回调用于增量渲染
 * @param {Number} batchSize 每批 ID 数量
 * @returns {Promise<Array>} 全部歌曲(按原顺序，失败的批次位置为占位 null 会被过滤)
 */
export const getAllSongsBatched = async (trackIds, onBatch, batchSize = 50) => {
  const ids = (trackIds || []).map(t => t.id)
  const chunks = []
  for (let i = 0; i < ids.length; i += batchSize) {
    chunks.push({ start: i, ids: ids.slice(i, i + batchSize) })
  }
  const all = new Array(ids.length).fill(null)
  const concurrency = 4
  let nextIndex = 0

  const loadNextChunk = async () => {
    while (nextIndex < chunks.length) {
      const { start, ids: chunkIds } = chunks[nextIndex++]
      try {
        const result = await getSongsDetailChunk(chunkIds.join(','))
        if (result.data && result.data.code == 200 && Array.isArray(result.data.songs)) {
          result.data.songs.forEach((song, idx) => { all[start + idx] = song })
          if (typeof onBatch === 'function') onBatch(result.data.songs, start)
        }
      } catch (e) {
        console.error(`[API] 歌曲详情第 ${start / batchSize + 1} 批加载失败:`, e)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, loadNextChunk)
  )
  return all.filter(Boolean)
}

export const getAlbumInfo = (id) => {
    return apiClient.get(`album?id=${id}`);
}
export const getPlayListInfo = (id) => {
    return getWithRetry(`playlist/detail?id=${id}`)
}

export const getAllSongs = (id) => {
    return getWithRetry(`song/detail?ids=${id}`)
}

export const getArtistTrend = (id) => {
    return apiClient.get(`artists?id=${id}`)
}

export const getArtistAlbum = (id) => {
    return apiClient.get(`artist/album?id=${id}`)
}

// 获取歌曲播放URL - 调用后端统一接口（后端处理 VIP Cookie 和 fallback）
export const getSongUrl = async (id) => {
    try {
        const response = await apiClient.get(`api/music/url?id=${id}`)
        if (response.data && response.data.code === 200 && response.data.data?.url) {
            return {
                data: {
                    url: response.data.data.url,
                    id: id,
                    source: response.data.data.source,
                    // 网易云登录用户的播放反馈：{ trial, reason, trialStart, trialEnd }
                    playInfo: response.data.data.playInfo || null
                }
            }
        }
        // 严格模式下后端会带具体原因(VIP 专属/地区不可播)，透传给播放器提示
        if (response.data) {
            return {
                data: {
                    url: null,
                    msg: response.data.msg || '无法获取歌曲链接',
                    playInfo: response.data.data?.playInfo || null
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
    return apiClient.get(`search?keywords=${encodeKeyword(keyword)}&type=1&offset=${offset}&limit=${limit}`)
}

// 获取单曲详情（包含封面）- 使用官方API（更可靠）
export const getSongDetailOfficial = async (songId) => {
    try {
        const response = await apiClient.get(`song/detail?ids=${songId}`);
        if (response.data.songs && response.data.songs.length > 0) {
            const song = response.data.songs[0];
            return {
                pic: thumb(song.al?.picUrl || '', 300),
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
        const response = await apiClient.get(`song/detail?ids=${idsStr}`);
        if (response.data.songs) {
            return response.data.songs.map(song => ({
                ...song,
                al: song.al ? { ...song.al, picUrl: thumb(song.al.picUrl, 300) } : song.al
            }));
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
        const response = await externalClient.get(`${musicUrl}?url=https://y.music.163.com/m/song?id=${songId}&level=standard&type=json`);
        return response.data;
    } catch (e) {
        console.error('获取歌曲详情失败:', e);
        return null;
    }
}

export const searchAlbums = (keyword, offset = 0, limit = 20) => {
    return apiClient.get(`search?keywords=${encodeKeyword(keyword)}&type=10&offset=${offset}&limit=${limit}`)
}

export const searchArtists = (keyword, offset = 0, limit = 20) => {
    return apiClient.get(`search?keywords=${encodeKeyword(keyword)}&type=100&offset=${offset}&limit=${limit}`)
}

export const searchLists = (keyword, offset = 0, limit = 20) => {
    return apiClient.get(`search?keywords=${encodeKeyword(keyword)}&type=1000&offset=${offset}&limit=${limit}`)
}

export const getTrendList = () => {
    return apiClient.get(`top/playlist?limit=10&order=hot`)
}

export const getRank = () => {
    return apiClient.get(`toplist/detail`)
}

// 获取歌词
export const getLyric = (songId) => {
    return apiClient.get(`lyric?id=${songId}`)
}
