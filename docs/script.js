const API_BASE = 'https://music-api.gdstudio.xyz/api.php';
let currentPlaylist = [];
let currentIndex = -1;
let currentLyrics = [];
let isPlaying = false;
let isUserScrolling = false;
let userScrollTimeout;
let playlistData = [];

const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('totalTime');
const lyricsContainer = document.getElementById('lyricsContainer');
const currentCover = document.getElementById('currentCover');

const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='95' fill='%23111' stroke='%23333' stroke-width='2'/%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%23222' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='60' fill='none' stroke='%232a2a2a' stroke-width='1' stroke-dasharray='4 4'/%3E%3Ccircle cx='100' cy='100' r='40' fill='none' stroke='%232a2a2a' stroke-width='1' stroke-dasharray='2 2'/%3E%3Ccircle cx='100' cy='100' r='15' fill='%23222' stroke='%23444' stroke-width='2'/%3E%3Ccircle cx='100' cy='100' r='5' fill='%23555'/%3E%3Cellipse cx='70' cy='70' rx='30' ry='15' fill='rgba(255,255,255,0.1)' transform='rotate(-45 70 70)'/%3E%3C/svg%3E"; // 黑胶片默认封面

const canvas = document.getElementById('waveCanvas');
const canvasCtx = canvas.getContext('2d');
let animationId;

// 主题切换
function initTheme() {
    const savedTheme = localStorage.getItem('music-player-theme');
    const body = document.body;
    const toggleBtn = document.getElementById('themeToggleBtn');
    const icon = toggleBtn.querySelector('i');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        icon.className = 'fas fa-moon';
    } else {
        body.classList.remove('light-mode');
        icon.className = 'fas fa-sun';
    }
    toggleBtn.addEventListener('click', () => {
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            icon.className = 'fas fa-sun';
            localStorage.setItem('music-player-theme', 'dark');
        } else {
            body.classList.add('light-mode');
            icon.className = 'fas fa-moon';
            localStorage.setItem('music-player-theme', 'light');
        }
    });
}

async function searchMusic() {
    const keyword = document.getElementById('searchInput').value.trim();
    const source = document.getElementById('sourceSelect').value;
    if (!keyword) {
        showNotification('请输入搜索关键词', 'warning');
        return;
    }
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i><div>正在搜索音乐...</div></div>`;
    try {
        const response = await fetch(`${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=30`);
        const data = await response.json();
        if (data && data.length > 0) {
            currentPlaylist = data;
            displaySearchResults(data, 'searchResults', currentPlaylist);
        } else {
            resultsContainer.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i><div>未找到相关歌曲，请尝试其他关键词</div></div>`;
        }
    } catch (error) {
        console.error('搜索失败:', error);
        resultsContainer.innerHTML = `<div class="error"><i class="fas fa-wifi"></i><div>网络连接失败，请检查网络后重试</div></div>`;
    }
}

async function getAlbumCoverUrl(song, size = 300) {
    if (!song.pic_id) return DEFAULT_COVER;
    try {
        const response = await fetch(`${API_BASE}?types=pic&source=${song.source}&id=${song.pic_id}&size=${size}`);
        const data = await response.json();
        if (data && data.url) return data.url;
    } catch (error) { console.error('获取专辑图失败:', error); }
    return DEFAULT_COVER;
}

async function displaySearchResults(songs, containerId, playlistForPlayback) {
    const resultsContainer = document.getElementById(containerId);
    resultsContainer.innerHTML = '';
    for (let index = 0; index < songs.length; index++) {
        const song = songs[index];
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.onclick = () => playSong(index, playlistForPlayback);
        songItem.innerHTML = `
            <div class="song-index">${(index + 1).toString().padStart(2, '0')}</div>
            <div class="song-info">
                <div class="song-name">${escapeHtml(song.name)}</div>
                <div class="song-artist">${Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist} · ${song.album}</div>
            </div>
            <div class="song-actions">
                <button class="action-btn" onclick="event.stopPropagation(); downloadSong(${index})" title="下载音乐"><i class="fas fa-download"></i></button>
                <button class="action-btn" onclick="event.stopPropagation(); downloadLyric(${index})" title="下载歌词"><i class="fas fa-file-text"></i></button>
            </div>
            <div class="song-duration">--:--</div>
        `;
        resultsContainer.appendChild(songItem);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function playSong(index, playlist) {
    if (!playlist || index < 0 || index >= playlist.length) return;
    currentPlaylist = playlist;
    currentIndex = index;
    const song = currentPlaylist[index];
    await updateCurrentSongInfo(song);
    updateActiveItem();
    try {
        showNotification('正在加载音乐...', 'info');
        const quality = document.getElementById('qualitySelect').value;
        const urlResponse = await fetch(`${API_BASE}?types=url&source=${song.source}&id=${song.id}&br=${quality}`);
        const urlData = await urlResponse.json();
        if (urlData && urlData.url) {
            audioPlayer.src = urlData.url;
            audioPlayer.load();
            loadLyrics(song);
            document.getElementById('downloadSongBtn').disabled = false;
            document.getElementById('downloadLyricBtn').disabled = false;
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isPlaying = true;
                    updatePlayButton();
                    currentCover.classList.add('playing');
                    startVisualization();
                    showNotification(`开始播放 (${getQualityText(urlData.br || quality)})`, 'success');
                }).catch(error => {
                    console.error('播放失败:', error);
                    showNotification('播放失败，请尝试其他歌曲', 'error');
                });
            }
        } else {
            showNotification('无法获取音乐链接，请尝试其他歌曲或更换音质', 'error');
        }
    } catch (error) {
        console.error('播放失败:', error);
        showNotification('播放失败，请检查网络连接', 'error');
    }
}

function getQualityText(br) {
    const map = { '128': '标准音质', '192': '较高音质', '320': '高品质', '740': '无损音质', '999': 'Hi-Res音质' };
    return map[br] || `${br}K`;
}

async function downloadCurrentSong() { if (currentIndex === -1) { showNotification('请先选择要下载的歌曲', 'warning'); return; } await downloadSong(currentIndex); }
async function downloadCurrentLyric() { if (currentIndex === -1) { showNotification('请先选择要下载歌词的歌曲', 'warning'); return; } await downloadLyric(currentIndex); }

async function downloadSong(index) {
    const song = currentPlaylist[index];
    const quality = document.getElementById('qualitySelect').value;
    try {
        showNotification('正在获取下载链接...', 'info');
        const response = await fetch(`${API_BASE}?types=url&source=${song.source}&id=${song.id}&br=${quality}`);
        const data = await response.json();
        if (data && data.url) {
            const link = document.createElement('a');
            link.href = data.url;
            link.download = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}.mp3`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification('开始下载音乐文件', 'success');
        } else { showNotification('无法获取下载链接', 'error'); }
    } catch (error) { console.error('下载失败:', error); showNotification('下载失败，请稍后重试', 'error'); }
}

async function downloadLyric(index) {
    const song = currentPlaylist[index];
    try {
        showNotification('正在获取歌词...', 'info');
        const response = await fetch(`${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`);
        const data = await response.json();
        if (data && data.lyric) {
            let content = `歌曲：${song.name}\n歌手：${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}\n专辑：${song.album}\n来源：${song.source}\n\n${data.lyric}`;
            if (data.tlyric) content += `\n=== 翻译歌词 ===\n${data.tlyric}`;
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${song.name} - ${Array.isArray(song.artist) ? song.artist.join(', ') : song.artist}.lrc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showNotification('歌词下载完成', 'success');
        } else { showNotification('该歌曲暂无歌词', 'warning'); }
    } catch (error) { console.error('下载歌词失败:', error); showNotification('下载歌词失败，请稍后重试', 'error'); }
}

document.getElementById('qualitySelect').addEventListener('change', () => {
    if (currentIndex !== -1 && audioPlayer.src) {
        const currentTime = audioPlayer.currentTime;
        const wasPlaying = isPlaying;
        playSong(currentIndex, currentPlaylist).then(() => {
            audioPlayer.currentTime = currentTime;
            if (!wasPlaying) audioPlayer.pause();
        });
    }
});

async function updateCurrentSongInfo(song) {
    document.getElementById('currentTitle').textContent = song.name;
    document.getElementById('currentArtist').textContent = `${Array.isArray(song.artist) ? song.artist.join(' / ') : song.artist} · ${song.album}`;
    const coverUrl = await getAlbumCoverUrl(song, 500);
    currentCover.src = coverUrl;
}

function updateActiveItem() {
    document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
    const activeListItems = document.querySelectorAll((currentPlaylist === playlistData ? '#playlistResults' : '#searchResults') + ' .song-item');
    if (activeListItems[currentIndex]) activeListItems[currentIndex].classList.add('active');
}

function updatePlayButton() {
    const icon = playBtn.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

async function loadLyrics(song) {
    try {
        const response = await fetch(`${API_BASE}?types=lyric&source=${song.source}&id=${song.lyric_id || song.id}`);
        const data = await response.json();
        if (data && data.lyric) parseLyrics(data.lyric);
        else { lyricsContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>'; currentLyrics = []; }
    } catch (error) { console.error('获取歌词失败:', error); lyricsContainer.innerHTML = '<div class="lyric-line">歌词加载失败</div>'; currentLyrics = []; }
}

function parseLyrics(lrcText) {
    const lines = lrcText.split('\n');
    currentLyrics = [];
    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3].padEnd(3, '0'));
            const text = match[4].trim();
            if (text) currentLyrics.push({ time: minutes * 60 + seconds + milliseconds / 1000, text });
        }
    });
    currentLyrics.sort((a, b) => a.time - b.time);
    displayLyrics();
}

function displayLyrics() {
    lyricsContainer.innerHTML = '';
    if (currentLyrics.length === 0) { lyricsContainer.innerHTML = '<div class="lyric-line">暂无歌词</div>'; return; }
    currentLyrics.forEach((lyric, index) => {
        const line = document.createElement('div');
        line.className = 'lyric-line';
        line.textContent = lyric.text;
        line.onclick = () => { audioPlayer.currentTime = lyric.time; };
        lyricsContainer.appendChild(line);
    });
}

function updateLyricHighlight() {
    const currentTime = audioPlayer.currentTime;
    let activeIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (currentLyrics[i].time <= currentTime) activeIndex = i;
        else break;
    }
    const lyricLines = document.querySelectorAll('.lyric-line');
    lyricLines.forEach((line, idx) => line.classList.toggle('active', idx === activeIndex));
    if (activeIndex >= 0 && lyricLines[activeIndex] && !isUserScrolling) {
        const activeLine = lyricLines[activeIndex];
        const container = document.getElementById('lyricsContainer');
        if (activeLine && container) {
            const containerHeight = container.clientHeight;
            const lineHeight = activeLine.offsetHeight;
            const lineOffsetTop = activeLine.offsetTop;
            const idealScrollTop = lineOffsetTop - (containerHeight / 2) + (lineHeight / 2);
            container.scrollTo({ top: Math.max(0, idealScrollTop), behavior: 'smooth' });
        }
    }
}

function togglePlay() {
    if (audioPlayer.src) isPlaying ? audioPlayer.pause() : audioPlayer.play();
    else showNotification('请先选择要播放的歌曲', 'warning');
}

function previousSong() { if (currentIndex > 0) playSong(currentIndex - 1, currentPlaylist); else showNotification('已经是第一首歌曲', 'info'); }
function nextSong() { if (currentIndex < currentPlaylist.length - 1) playSong(currentIndex + 1, currentPlaylist); else showNotification('已经是最后一首歌曲', 'info'); }
function seekTo(event) { if (audioPlayer.duration) { const rect = event.target.getBoundingClientRect(); const percent = (event.clientX - rect.left) / rect.width; audioPlayer.currentTime = percent * audioPlayer.duration; } }
function setVolume(value) { audioPlayer.volume = value / 100; const icon = document.querySelector('.volume-icon'); if (value == 0) icon.className = 'fas fa-volume-mute volume-icon'; else if (value < 50) icon.className = 'fas fa-volume-down volume-icon'; else icon.className = 'fas fa-volume-up volume-icon'; }
function formatTime(seconds) { const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; }

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'error' ? 'rgba(244, 67, 54, 0.9)' : type === 'warning' ? 'rgba(255, 152, 0, 0.9)' : 'rgba(33, 150, 243, 0.9)';
    notification.style.cssText = `position:fixed; top:100px; right:30px; background:${bgColor}; color:white; padding:15px 20px; border-radius:10px; backdrop-filter:blur(10px); box-shadow:0 8px 25px rgba(0,0,0,0.3); z-index:1000; transform:translateX(400px); transition:transform 0.3s ease; max-width:300px; font-size:14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => { notification.style.transform = 'translateX(400px)'; setTimeout(() => notification.remove(), 300); }, 3000);
}

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = percent + '%';
        currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        updateLyricHighlight();
    }
});
audioPlayer.addEventListener('loadedmetadata', () => totalTimeSpan.textContent = formatTime(audioPlayer.duration));
audioPlayer.addEventListener('ended', () => nextSong());
audioPlayer.addEventListener('play', () => { isPlaying = true; updatePlayButton(); currentCover.classList.add('playing'); startVisualization(); });
audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayButton(); currentCover.classList.remove('playing'); stopVisualization(); });

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowLeft' && e.target.tagName !== 'INPUT') { e.preventDefault(); previousSong(); }
    else if (e.code === 'ArrowRight' && e.target.tagName !== 'INPUT') { e.preventDefault(); nextSong(); }
});
document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') searchMusic(); });
lyricsContainer.addEventListener('scroll', () => {
    isUserScrolling = true;
    clearTimeout(userScrollTimeout);
    userScrollTimeout = setTimeout(() => { isUserScrolling = false; }, 2000);
});

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = 100; }
function drawWave() {
    animationId = requestAnimationFrame(drawWave);
    canvasCtx.fillStyle = document.body.classList.contains('light-mode') ? 'rgba(245,245,250,0.2)' : 'rgba(12,12,12,0.2)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#ff8a80');
    gradient.addColorStop(1, '#ff6b6b');
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = gradient;
    canvasCtx.beginPath();
    const time = Date.now() * 0.002;
    const amplitude = isPlaying ? 30 + Math.random() * 20 : 5;
    const points = 100;
    for (let i = 0; i <= points; i++) {
        const x = (i / points) * canvas.width;
        const noise = isPlaying ? Math.random() * 10 : 0;
        const y = canvas.height / 2 + Math.sin(i * 0.02 + time) * amplitude + noise;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
    for (let i = 0; i <= points; i++) {
        const x = (i / points) * canvas.width;
        const noise = isPlaying ? Math.random() * 10 : 0;
        const y = canvas.height / 2 - Math.sin(i * 0.02 + time) * amplitude - noise;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
    }
    canvasCtx.stroke();
}
function startVisualization() { if (!animationId) drawWave(); }
function stopVisualization() { if (animationId) { cancelAnimationFrame(animationId); animationId = null; canvasCtx.clearRect(0, 0, canvas.width, canvas.height); } }

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

async function parsePlaylist() {
    const playlistId = document.getElementById('playlistIdInput').value.trim();
    if (!playlistId) { showNotification('请输入歌单ID', 'warning'); return; }
    const resultsContainer = document.getElementById('playlistResults');
    resultsContainer.innerHTML = `<div class="loading"><i class="fas fa-spinner"></i><div>正在解析歌单...</div></div>`;
    try {
        const response = await fetch(`${API_BASE}?types=playlist&id=${playlistId}&source=netease`);
        const data = await response.json();
        let songs = [];
        if (data && data.playlist && data.playlist.tracks) {
            songs = data.playlist.tracks.map(track => ({ name: track.name, artist: track.ar.map(a => a.name).join(' / '), album: track.al.name, id: track.id, pic_id: track.al.pic_id_str || track.al.pic_str || track.al.pic, lyric_id: track.id, source: 'netease' }));
        } else if (data && data.tracks) {
            songs = data.tracks.map(track => ({ name: track.name, artist: track.ar.map(a => a.name).join(' / '), album: track.al.name, id: track.id, pic_id: track.al.pic_id_str || track.al.pic_str || track.al.pic, lyric_id: track.id, source: 'netease' }));
        }
        if (songs.length > 0) {
            playlistData = songs;
            displaySearchResults(songs, 'playlistResults', playlistData);
            showNotification(`成功加载 ${songs.length} 首歌曲`, 'success');
        } else {
            resultsContainer.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i><div>解析歌单失败，请检查ID是否正确或API是否正常</div></div>`;
        }
    } catch (error) {
        console.error('解析歌单失败:', error);
        resultsContainer.innerHTML = `<div class="error"><i class="fas fa-wifi"></i><div>网络连接失败，请检查网络后重试</div></div>`;
    }
}

window.addEventListener('load', () => {
    initTheme();
    setVolume(80);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setTimeout(() => showNotification('欢迎使用云音乐播放器！', 'success'), 1000);
});
