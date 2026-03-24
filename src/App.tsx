/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  Zap, 
  Heart, 
  Cloud, 
  History, 
  LogOut, 
  Search, 
  MoreHorizontal,
  Music2,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Crown,
  Disc,
  Mic2,
  Radio,
  Plus,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { musicService, Song } from './services/musicService';

// --- 数据定义 ---

const listeningActivityData = [
  { name: '周一', value: 30 },
  { name: '周二', value: 45 },
  { name: '周三', value: 35 },
  { name: '周四', value: 70 },
  { name: '周五', value: 50 },
  { name: '周六', value: 90 },
  { name: '周日', value: 85 },
];

const COLORS = ['#3b82f6', 'rgba(255, 255, 255, 0.1)'];

const defaultSong: Song = {
  id: 'default',
  title: 'Chandelier',
  artist: 'Sia',
  img: 'https://picsum.photos/seed/sia1/200/200',
  platform: 'netease',
  duration: '3:31'
};

// --- 组件定义 ---

export default function App() {
  const [activeModule, setActiveModule] = useState('home'); 
  const [activeTab, setActiveTab] = useState('最近播放');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlatform, setSearchPlatform] = useState('migu');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextSongUrl, setNextSongUrl] = useState<string | null>(null);
  const [nextSong, setNextSong] = useState<Song | null>(null);
  const [currentSong, setCurrentSong] = useState<Song>(defaultSong);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const [likedSongs, setLikedSongs] = useState<Song[]>([
    { id: '186016', title: '晴天', artist: '周杰伦', duration: '4:29', img: 'https://picsum.photos/seed/jay1/100/100', platform: 'netease' },
    { id: '186001', title: '七里香', artist: '周杰伦', duration: '4:59', img: 'https://picsum.photos/seed/jay2/100/100', platform: 'netease' },
  ]);

  const [cloudFiles, setCloudFiles] = useState([
    { id: 1, name: '我的录音 01.mp3', size: '12.4 MB', date: '2024-03-20' },
    { id: 2, name: 'Demo_Track_Final.wav', size: '45.8 MB', date: '2024-03-18' },
  ]);
  
  const [history, setHistory] = useState<Song[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 搜索处理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    const results = await musicService.search(searchQuery);
    setSearchResults(results);
    setIsLoading(false);
    setActiveTab('搜索结果');
  };

  const [isSongLoading, setIsSongLoading] = useState(false);
  const playNextRef = useRef<() => void>(() => {});

  // 播放处理
  const playSong = async (song: Song) => {
    if (isSongLoading) return;
    
    setIsSongLoading(true);
    setCurrentSong(song);
    // 更新历史记录
    setHistory(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, 20);
    });
    
    try {
      // 检查是否有预加载的地址
      let url = (nextSong?.id === song.id) ? nextSongUrl : null;
      
      if (!url) {
        url = await musicService.getSongUrl(song.id, song.platform, song);
      }

      if (url && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = url;
        await audioRef.current.play();
        setIsPlaying(true);
        
        // 播放成功后，预加载下一首
        preloadNextSong(song);
      } else {
        alert('无法获取播放地址，该歌曲可能受版权保护或已下架');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('播放失败:', error);
        alert('播放失败，请稍后重试');
      }
    } finally {
      setIsSongLoading(false);
    }
  };

  // 预加载下一首
  const preloadNextSong = async (current: Song) => {
    const list = activeTab === '搜索结果' ? searchResults : (activeTab === 'history' ? history : likedSongs);
    if (list.length === 0) return;
    
    const currentIndex = list.findIndex(s => s.id === current.id);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= list.length) nextIndex = 0;
    
    const next = list[nextIndex];
    setNextSong(next);
    
    console.log('Preloading next song:', next.title);
    const url = await musicService.getSongUrl(next.id, next.platform, next);
    setNextSongUrl(url);
  };

  // 播放下一首
  const playNext = () => {
    const list = activeTab === '搜索结果' ? searchResults : (activeTab === 'history' ? history : likedSongs);
    if (list.length === 0) return;
    
    const currentIndex = list.findIndex(s => s.id === currentSong.id);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= list.length) nextIndex = 0; // 循环播放
    
    playSong(list[nextIndex]);
  };

  // 更新 playNextRef
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // 播放上一首
  const playPrevious = () => {
    const list = activeTab === '搜索结果' ? searchResults : (activeTab === 'history' ? history : likedSongs);
    if (list.length === 0) return;
    
    const currentIndex = list.findIndex(s => s.id === currentSong.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = list.length - 1; // 循环播放
    
    playSong(list[prevIndex]);
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('播放失败:', error);
          }
        }
      }
    }
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => playNextRef.current();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const pieData = [
    { name: 'Played', value: currentTime || 0.001 },
    { name: 'Remaining', value: Math.max(0.001, duration - currentTime) },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'home':
        return (
          <motion.div 
            key="home"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">发现音乐</h1>
                <p className="text-white/40 text-sm mt-1">探索最新热门歌曲和个性化推荐</p>
              </div>
              
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索歌手、歌曲、专辑" 
                    className="glass-card bg-white/5 border-white/10 rounded-full pl-12 pr-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 w-64 transition-all"
                  />
                  {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" size={18} />}
                </div>
              </form>
            </div>

            {/* 标签页 */}
            <div className="flex gap-6">
              {['最近播放', '搜索结果', '排行榜', '播客'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`glass-pill ${activeTab === tab ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 动态内容展示 */}
            {activeTab === '搜索结果' ? (
              <div className="flex flex-col gap-2">
                {searchResults.length > 0 ? (
                  searchResults.map((song, idx) => (
                    <div 
                      key={`${song.id}-${idx}`} 
                      onClick={() => playSong(song)}
                      className={`glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all group cursor-pointer ${currentSong.id === song.id ? 'bg-white/10 border-blue-500/50' : ''}`}
                    >
                      <span className="w-6 text-white/40 text-sm">{idx + 1}</span>
                      <img src={song.img} alt={song.title} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">{song.title}</p>
                        <p className="text-xs text-white/40">{song.artist}</p>
                      </div>
                      <span className="text-white/40 text-sm">{song.duration}</span>
                      {isSongLoading && currentSong.id === song.id ? (
                        <Loader2 size={18} className="text-blue-400 animate-spin" />
                      ) : (
                        <Play size={18} className="text-white/40 group-hover:text-white" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 flex flex-col items-center gap-4">
                    <Search size={48} className="text-white/10" />
                    <div className="text-white/20">
                      <p>暂无搜索结果</p>
                      <p className="text-xs mt-2">请尝试更换关键词或切换搜索平台</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 音乐分类卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MusicCard 
                    title="流行金曲" 
                    artist="全球前50强" 
                    listeners="240万" 
                    icon={<Disc size={32} className="text-blue-400" />} 
                    bgColor="bg-blue-500/10"
                    img="https://picsum.photos/seed/pop/200/200"
                  />
                  <MusicCard 
                    title="爵士之夜" 
                    artist="丝滑灵魂乐" 
                    listeners="85万" 
                    icon={<Mic2 size={32} className="text-orange-400" />} 
                    bgColor="bg-orange-500/10"
                    img="https://picsum.photos/seed/jazz/200/200"
                  />
                  <MusicCard 
                    title="电子舞曲" 
                    artist="深层混音" 
                    listeners="120万" 
                    icon={<Radio size={32} className="text-purple-400" />} 
                    bgColor="bg-purple-500/10"
                    img="https://picsum.photos/seed/electronic/200/200"
                  />
                </div>

                {/* 底部网格：活跃度与歌单 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-4">
                  <div className="flex flex-col gap-6">
                    <h3 className="text-xl font-bold">听歌活跃度</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={listeningActivityData}>
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <h3 className="text-xl font-bold">热门歌单</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <PlaylistItem title="早安咖啡" icon={<Music2 size={18} className="text-blue-400" />} />
                      <PlaylistItem title="健身节奏" icon={<Music2 size={18} className="text-blue-400" />} />
                      <PlaylistItem title="深度学习" icon={<Music2 size={18} className="text-yellow-400" />} />
                      <PlaylistItem title="惬意氛围" icon={<Music2 size={18} className="text-yellow-400" />} />
                      <PlaylistItem title="派对混音" icon={<Music2 size={18} className="text-yellow-400" />} />
                      <PlaylistItem title="助眠音效" icon={<Music2 size={18} className="text-blue-400" />} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        );
      case 'zap':
        return (
          <motion.div 
            key="zap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <h1 className="text-3xl font-bold tracking-tight">为你推荐</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-[32px] p-8 flex flex-col gap-4 bg-gradient-to-br from-blue-500/20 to-transparent">
                <h2 className="text-2xl font-bold">每日推荐 30 首</h2>
                <p className="text-white/60">根据你的听歌习惯，每天 6:00 更新</p>
                <button className="bg-white text-black px-6 py-2 rounded-full font-bold w-fit mt-4 flex items-center gap-2">
                  <Play size={18} fill="currentColor" /> 立即播放
                </button>
              </div>
              <div className="glass-card rounded-[32px] p-8 flex flex-col gap-4 bg-gradient-to-br from-purple-500/20 to-transparent">
                <h2 className="text-2xl font-bold">私人漫游</h2>
                <p className="text-white/60">开启属于你的音乐冒险之旅</p>
                <button className="bg-white text-black px-6 py-2 rounded-full font-bold w-fit mt-4 flex items-center gap-2">
                  <Radio size={18} /> 开启漫游
                </button>
              </div>
            </div>
          </motion.div>
        );
      case 'heart':
        return (
          <motion.div 
            key="heart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">我喜欢的音乐</h1>
              <button className="glass-pill flex items-center gap-2"><Play size={16} fill="currentColor" /> 播放全部</button>
            </div>
            <div className="flex flex-col gap-2">
              {likedSongs.length > 0 ? (
                likedSongs.map((song, idx) => (
                  <div 
                    key={song.id} 
                    onClick={() => playSong(song)}
                    className={`glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all group cursor-pointer ${currentSong.id === song.id ? 'bg-white/10 border-blue-500/50' : ''}`}
                  >
                    <span className="w-6 text-white/40 text-sm">{idx + 1}</span>
                    <img src={song.img} alt={song.title} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">{song.title}</p>
                      <p className="text-xs text-white/40">{song.artist}</p>
                    </div>
                    <span className="text-white/40 text-sm">{song.duration}</span>
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSongLoading && currentSong.id === song.id ? (
                        <Loader2 size={18} className="text-blue-400 animate-spin" />
                      ) : (
                        <Play size={18} className="text-white/40 hover:text-white" />
                      )}
                      <Heart size={18} className="text-red-500 fill-red-500" />
                      <MoreHorizontal size={18} className="text-white/40" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-white/20">暂无收藏歌曲</div>
              )}
            </div>
          </motion.div>
        );
      case 'cloud':
        return (
          <motion.div 
            key="cloud"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">音乐云盘</h1>
              <button className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
                <Plus size={18} /> 上传音乐
              </button>
            </div>
            <div className="glass-card rounded-[32px] p-6">
              <div className="flex items-center justify-between text-xs text-white/40 mb-4 px-4">
                <span className="flex-1">文件名</span>
                <span className="w-24">大小</span>
                <span className="w-32">上传日期</span>
                <span className="w-24 text-right">操作</span>
              </div>
              <div className="flex flex-col gap-1">
                {cloudFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all group">
                    <div className="flex-1 flex items-center gap-3">
                      <Music2 size={18} className="text-blue-400" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                    <span className="w-24 text-xs text-white/40">{file.size}</span>
                    <span className="w-32 text-xs text-white/40">{file.date}</span>
                    <div className="w-24 flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download size={16} className="text-white/60 hover:text-white cursor-pointer" />
                      <Trash2 size={16} className="text-white/60 hover:text-red-500 cursor-pointer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 'history':
        return (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">最近播放</h1>
              <button 
                onClick={() => setHistory([])}
                className="text-white/40 hover:text-white text-sm transition-colors"
              >
                清空列表
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {history.length > 0 ? (
                history.map((song, idx) => (
                  <div 
                    key={`${song.id}-${idx}`} 
                    onClick={() => playSong(song)}
                    className={`glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all group cursor-pointer ${currentSong.id === song.id ? 'bg-white/10 border-blue-500/50' : ''}`}
                  >
                    <img src={song.img} alt={song.title} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">{song.title}</p>
                      <p className="text-xs text-white/40">{song.artist}</p>
                    </div>
                    <span className="text-white/40 text-xs">刚刚</span>
                    {isSongLoading && currentSong.id === song.id ? (
                      <Loader2 size={18} className="text-blue-400 animate-spin" />
                    ) : (
                      <Play size={18} className="text-white/40 group-hover:text-white cursor-pointer" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-white/20">暂无播放记录</div>
              )}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-10 bg-black/30 relative">
      <audio ref={audioRef} />
      
      {/* 侧边栏 */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50">
        <div className="glass px-3 py-8 rounded-full flex flex-col gap-8 items-center">
          <SidebarIcon icon={<Home size={22} />} active={activeModule === 'home'} onClick={() => setActiveModule('home')} />
          <SidebarIcon icon={<Zap size={22} />} active={activeModule === 'zap'} onClick={() => setActiveModule('zap')} />
          <SidebarIcon icon={<Heart size={22} />} active={activeModule === 'heart'} onClick={() => setActiveModule('heart')} />
          <SidebarIcon icon={<Cloud size={22} />} active={activeModule === 'cloud'} onClick={() => setActiveModule('cloud')} />
          <SidebarIcon icon={<History size={22} />} active={activeModule === 'history'} onClick={() => setActiveModule('history')} />
          <div className="w-8 h-[1px] bg-white/10 my-2" />
          <SidebarIcon icon={<LogOut size={22} />} />
        </div>
      </div>

      {/* 主仪表盘容器 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-7xl h-[85vh] rounded-[48px] overflow-hidden flex relative"
      >
        {/* 左侧内容区 */}
        <div className="flex-1 p-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>

        {/* 右侧面板 */}
        <div className="w-80 p-8 border-l border-white/10 flex flex-col gap-8 bg-white/5">
          {/* 用户资料 */}
          <div className="flex items-center gap-4">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Hasibul" 
              alt="用户" 
              className="w-12 h-12 rounded-xl bg-white/10 p-1"
            />
            <div>
              <p className="font-bold text-sm">Md. Hasibul Haque</p>
              <p className="text-white/40 text-xs">高级会员</p>
            </div>
          </div>

          {/* 正在播放卡片 */}
          <div className="glass-card rounded-[32px] p-6 flex flex-col items-center gap-6">
            <div className="w-full flex justify-between items-center">
              <h4 className="font-bold">正在播放</h4>
              <MoreHorizontal size={18} className="text-white/40 cursor-pointer" />
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    startAngle={180}
                    endAngle={0}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 text-center">
                <p className="text-lg font-bold truncate w-32">{currentSong.title}</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">{currentSong.artist}</p>
              </div>
            </div>

            <div className="w-full flex flex-col gap-6">
              <div className="flex items-center justify-center gap-6">
                <SkipBack 
                  size={20} 
                  onClick={playPrevious}
                  className="text-white/40 cursor-pointer hover:text-white transition-colors" 
                />
                <div 
                  onClick={togglePlay}
                  className="bg-white p-3 rounded-full text-black cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                >
                  {isSongLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />
                  )}
                </div>
                <SkipForward 
                  size={20} 
                  onClick={playNext}
                  className="text-white/40 cursor-pointer hover:text-white transition-colors" 
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500 hover:bg-white/20 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between text-white/40">
                <Volume2 size={16} />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </div>

          {/* 升级卡片 */}
          <div className="mt-auto glass-card bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl p-6 border-blue-500/20">
            <p className="text-sm font-bold leading-tight mb-4">解锁无限高保真音乐体验</p>
            <button className="w-full glass bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all">
              升级到 Pro <Crown size={14} className="text-yellow-400" />
            </button>
          </div>
        </div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function SidebarIcon({ icon, active, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-2xl transition-all ${active ? 'bg-white/20 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
    </button>
  );
}

function MusicCard({ title, artist, listeners, icon, bgColor, img }: { title: string, artist: string, listeners: string, icon: React.ReactNode, bgColor: string, img: string }) {
  return (
    <div className="glass-card rounded-[32px] p-6 hover:bg-white/10 transition-all cursor-pointer group relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
        <img src={img} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div className={`${bgColor} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <MoreHorizontal size={18} className="text-white/40" />
      </div>
      <div className="relative z-10 flex justify-between items-end">
        <div>
          <p className="text-xs text-white/40 mb-1">{artist}</p>
          <h4 className="font-bold text-lg">{title}</h4>
        </div>
        <p className="text-sm font-bold text-white/60">{listeners}</p>
      </div>
    </div>
  );
}

function PlaylistItem({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="bg-white/5 p-2 rounded-lg">
          {icon}
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ChevronRight size={14} className="text-white/20" />
    </div>
  );
}
