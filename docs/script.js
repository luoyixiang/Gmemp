// 获取DOM元素
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const volumeBar = document.getElementById('volumeBar');
const volume = document.getElementById('volume');
const muteBtn = document.getElementById('muteBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const playlistInput = document.getElementById('playlistInput');
const importBtn = document.getElementById('importBtn');
const resultsContainer = document.getElementById('resultsContainer');
const playerTrackName = document.getElementById('playerTrackName');
const playerArtist = document.getElementById('playerArtist');
const playerAlbumArt = document.getElementById('playerAlbumArt');
const notification = document.getElementById('notification');

let playlistData = [];
let currentSongIndex = -1;
let isPlaying = false;

// 格式化时间
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 显示通知
function showNotification(message, type = 'info') {
    notification.innerText = message;
    notification.style.background = type === 'error' ? 'rgba(220, 53, 69, 0.9)' : 'rgba(231, 60, 126, 0.9)';
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 更新播放状态UI
function updatePlayBtn() {
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

// 播放指定索引的歌曲
async function playTrack(index) {
    if (index < 0 || index >= playlistData.length) return;
    
    currentSongIndex = index;
    const song = playlistData[index];
    
    // 更新UI
    playerTrackName.innerText = song.name;
    playerArtist.innerText = song.artist;
    
    // 获取封面图
    let picUrl = '';
    if (song.source === 'netease') {
        picUrl = `https://music.163.com/api/img/blur/${song.pic_id}`;
    }
    
    if (picUrl) {
        playerAlbumArt.innerHTML = `<img src="${picUrl}?param=100y100" alt="album">`;
    } else {
        playerAlbumArt.innerHTML = `<i class="fas fa-music"></i>`;
    }

    // 设置所有卡片状态
    document.querySelectorAll('.song-card').forEach((card, idx) => {
        if (idx === index) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    try {
        // 使用原文件中的 API
        const response = await fetch(`https://api.vience.cn/api/music?id=${song.id}&type=${song.source || 'netease'}`);
        const data = await response.json();
        
        if (data && data.url) {
            audioPlayer.src = data.url;
            audioPlayer.play();
            isPlaying = true;
            updatePlayBtn();
            showNotification(`正在播放: ${song.name}`);
        } else {
            showNotification('无法获取播放链接，尝试下一首', 'error');
            playNext();
        }
    } catch (error) {
        console.error('播放失败:', error);
        showNotification('播放出错', 'error');
    }
}

// 播放下一首
function playNext() {
    if (playlistData.length === 0) return;
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= playlistData.length) nextIndex = 0;
    playTrack(nextIndex);
}

// 播放上一首
function playPrev() {
    if (playlistData.length === 0) return;
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = playlistData.length - 1;
    playTrack(prevIndex);
}

// 播放/暂停切换
playBtn.addEventListener('click', () => {
    if (currentSongIndex === -1) return;
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
    isPlaying = !isPlaying;
    updatePlayBtn();
});

prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

// 进度条控制
audioPlayer.addEventListener('timeupdate', () => {
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = percent + '%';
    currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener('loadedmetadata', () => {
    totalTimeDisplay.innerText = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener('ended', playNext);

progressBar.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    audioPlayer.currentTime = (clickX / width) * duration;
});

// 音量控制
volumeBar.addEventListener('click', (e) => {
    const width = volumeBar.clientWidth;
    const clickX = e.offsetX;
    const vol = clickX / width;
    audioPlayer.volume = vol;
    volume.style.width = (vol * 100) + '%';
});

muteBtn.addEventListener('click', () => {
    audioPlayer.muted = !audioPlayer.muted;
    muteBtn.innerHTML = audioPlayer.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
});

// 渲染搜索结果
function displaySearchResults(songs) {
    resultsContainer.innerHTML = '';
    const songList = document.createElement('div');
    songList.className = 'song-list';
    
    songs.forEach((song, index) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        if (index === currentSongIndex) card.classList.add('active');
        
        let picUrl = '';
        if (song.source === 'netease') {
            picUrl = `https://music.163.com/api/img/blur/${song.pic_id}`;
        }

        card.innerHTML = `
            <img src="${picUrl ? picUrl + '?param=100y100' : 'https://via.placeholder.com/60'}" alt="cover">
            <div class="song-info">
                <div class="song-name">${song.name}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
        `;
        
        card.addEventListener('click', () => playTrack(index));
        songList.appendChild(card);
    });
    
    resultsContainer.appendChild(songList);
}

// 搜索事件
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

async function performSearch() {
    const keywords = searchInput.value.trim();
    if (!keywords) return showNotification('请输入搜索词');
    
    resultsContainer.innerHTML = `
        <div class=\"error\">
            <i class=\"fas fa-spinner fa-spin\"></i>
            <div>正在全力搜索中...</div>
        </div>
    `;

    try {
        const response = await fetch(`https://api.vience.cn/api/music?name=${encodeURIComponent(keywords)}&type=netease`);
        const data = await response.json();
        
        if (data && data.code === 200) {
            playlistData = data.data.map(item => ({
                name: item.name,
                artist: item.artist.join(' / '),
                album: item.album,
                id: item.id,
                pic_id: item.pic_id,
                source: 'netease'
            }));
            displaySearchResults(playlistData);
        } else {
            resultsContainer.innerHTML = `<div class=\"error\"><i class=\"fas fa-search\"></i><div>未找到匹配歌曲</div></div>`;
        }
    } catch (error) {
        showNotification('搜索失败', 'error');
    }
}

// 导入歌单事件
importBtn.addEventListener('click', importPlaylist);
playlistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') importPlaylist();
});

async function importPlaylist() {
    const playlistId = playlistInput.value.trim();
    if (!playlistId) return showNotification('请输入歌单ID');
    
    resultsContainer.innerHTML = `
        <div class=\"error\">
            <i class=\"fas fa-spinner fa-spin\"></i>
            <div>正在加载歌单内容...</div>
        </div>
    `;

    try {
        const response = await fetch(`https://api.vience.cn/api/music?playlist=${playlistId}&type=netease`);
        const data = await response.json();
        
        let songs = [];
        if (data && data.playlist) {
            songs = data.playlist.tracks.map(track => ({
                name: track.name,
                artist: track.ar.map(a => a.name).join(' / '),
                album: track.al.name,
                id: track.id,
                pic_id: track.al.pic_id_str || track.al.pic_str || track.al.pic,
                source: 'netease'
            }));
        } else if (data && data.tracks) {
             songs = data.tracks.map(track => ({
                name: track.name,
                artist: track.ar.map(a => a.name).join(' / '),
                album: track.al.name,
                id: track.id,
                pic_id: track.al.pic_id_str || track.al.pic_str || track.al.pic,
                source: 'netease'
            }));
        }

        if (songs.length > 0) {
            playlistData = songs;
            displaySearchResults(songs);
            showNotification(`成功加载 ${songs.length} 首歌曲`);
        } else {
            resultsContainer.innerHTML = `<div class=\"error\"><i class=\"fas fa-exclamation-triangle\"></i><div>解析歌单失败</div></div>`;
        }
    } catch (error) {
        showNotification('导入失败', 'error');
    }
}
