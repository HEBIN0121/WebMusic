/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const QING_MUSIC_BASE = 'https://qingmusic-api.jgs-hebin.workers.dev';
const DEEZER_BASE = 'https://deezer-music-api.jgs-hebin.workers.dev';

export interface Song {
  id: string | number;
  title: string;
  artist: string;
  album?: string;
  img?: string;
  platform: string;
  duration?: string;
}

export const musicService = {
  async search(keyword: string, page: number = 1, limit: number = 20): Promise<Song[]> {
    try {
      // 优先使用咪咕音源，因为咪咕的全曲率较高
      const platforms = ['migu', 'netease', 'kugou', 'kuwo', 'baidu'];
      let allSongs: Song[] = [];
      
      // 并行搜索前两个最稳的平台
      const searchPromises = platforms.slice(0, 2).map(p => 
        fetch(`${QING_MUSIC_BASE}/api/search?keyword=${encodeURIComponent(keyword)}&platform=${p}&page=${page}&limit=${limit}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
      
      const results = await Promise.all(searchPromises);
      
      results.forEach((data, index) => {
        if (data) {
          const list = this.extractList(data);
          allSongs = [...allSongs, ...this.mapSongs(list, platforms[index])];
        }
      });

      // 去重：根据标题和歌手判断是否为同一首歌
      const seen = new Set();
      const uniqueSongs = allSongs.filter(song => {
        const key = `${song.title}-${song.artist}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueSongs.length > 0) return uniqueSongs;
      
      // 如果前两个平台都没结果，尝试 Deezer 作为最后的保底
      const deezerUrl = `${DEEZER_BASE}/api/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`;
      const deezerRes = await fetch(deezerUrl);
      if (deezerRes.ok) {
        const deezerData = await deezerRes.json();
        let list = this.extractList(deezerData);
        return this.mapSongs(list, 'deezer');
      }

      return [];
    } catch (error) {
      console.error('Music Search Error:', error);
      return [];
    }
  },

  extractList(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.result && Array.isArray(data.result)) return data.result;
    if (data.list && Array.isArray(data.list)) return data.list;
    if (data.songs && Array.isArray(data.songs)) return data.songs;
    return [];
  },

  mapSongs(list: any[], platform: string): Song[] {
    return list.map((item: any) => ({
      id: item.id || item.songid || item.hash,
      title: item.title || item.name || item.songname || '未知歌曲',
      artist: item.artist || (item.artists && item.artists[0]?.name) || item.singer || (item.artist && item.artist.name) || '未知歌手',
      album: item.album?.name || item.album || item.albumname || (item.album && item.album.title) || '',
      img: item.pic || item.album?.picUrl || item.img || item.cover || (item.album && item.album.cover_medium) || `https://picsum.photos/seed/${item.id || Math.random()}/200/200`,
      platform: platform,
      duration: item.duration ? (typeof item.duration === 'number' ? this.formatDuration(item.duration) : item.duration) : '--:--'
    }));
  },

  async getSongUrl(id: string | number, platform: string, song?: Song): Promise<string | null> {
    const fetchUrl = async (targetUrl: string) => {
      try {
        const response = await fetch(targetUrl);
        if (!response.ok) return null;
        const data = await response.json();
        
        let url = null;
        if (platform === 'deezer' && data.preview) {
          url = data.preview;
        } else if (data.success) {
          if (typeof data.data === 'string') url = data.data;
          else if (data.data && typeof data.data.url === 'string') url = data.data.url;
          else if (data.data && typeof data.data.data === 'string') url = data.data.data;
        } else if (typeof data.url === 'string') {
          url = data.url;
        } else if (data.data && typeof data.data === 'string') {
          url = data.data;
        } else if (typeof data === 'string' && data.startsWith('http')) {
          url = data;
        }
        
        // 验证链接是否有效且不是 30 秒预览
        if (url && await this.validateUrl(url)) {
          return url;
        }
        return null;
      } catch (e) {
        console.error(`Fetch error for ${targetUrl}:`, e);
        return null;
      }
    };

    try {
      // 优先尝试匹配全曲，特别是如果当前平台是 Deezer
      if (song) {
        console.log('Searching for full version across platforms...');
        const matchResult = await this.matchFullSong(song);
        if (matchResult) return matchResult;
      }

      let url = '';
      if (platform === 'deezer') {
        url = `${DEEZER_BASE}/api/track?id=${id}`;
        return await fetchUrl(url);
      } 
      
      // 1. 尝试 320kbps
      url = `${QING_MUSIC_BASE}/api/song/url?id=${id}&platform=${platform}&br=320`;
      let result = await fetchUrl(url);
      if (result) return result;

      // 2. 尝试 128kbps (默认)
      url = `${QING_MUSIC_BASE}/api/song/url?id=${id}&platform=${platform}`;
      result = await fetchUrl(url);
      if (result) return result;

      return null;
    } catch (error) {
      console.error('Get Song URL Error:', error);
      return null;
    }
  },

  async validateUrl(url: string): Promise<boolean> {
    try {
      // 检查是否包含 preview 关键字，通常意味着是 30 秒片段
      if (url.includes('preview') || url.includes('sample')) {
        // 除非没有其他选择，否则认为预览链接无效（为了触发全曲匹配）
        return false;
      }
      
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      // 如果 HEAD 请求失败，尝试 GET 请求但只读取头部
      try {
        const res = await fetch(url);
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async matchFullSong(song: Song): Promise<string | null> {
    try {
      // 按照优先级搜索平台：咪咕 > 网易云 > 酷狗
      const query = `${song.title} ${song.artist}`;
      const platforms = ['migu', 'netease', 'kugou'];
      
      for (const p of platforms) {
        const searchUrl = `${QING_MUSIC_BASE}/api/search?keyword=${encodeURIComponent(query)}&platform=${p}&page=1&limit=5`;
        const res = await fetch(searchUrl);
        if (!res.ok) continue;
        
        const data = await res.json();
        const list = this.extractList(data);
        
        for (const item of list.slice(0, 2)) {
          const matchedId = item.id || item.songid || item.hash;
          // 尝试获取该歌曲的播放地址
          const url = await this.getSongUrl(matchedId, p);
          if (url && !url.includes('preview') && !url.includes('sample')) {
            console.log(`Matched full version on ${p}:`, url);
            return url;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Match Full Song Error:', error);
      return null;
    }
  },

  formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};
