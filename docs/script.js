const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progress = document.getElementById('progress');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const volumeBar = document.getElementById('volumeBar');
const volume = document.getElementById('volume');
const playerTrackName = document.getElementById('playerTrackName');
const playerArtist = document.getElementById('playerArtist');
const playerAlbumArt = document.getElementById('playerAlbumArt');

let playlistData = [];
let currentSongIndex = -1;
let isPlaying = false;

// 格式化时间
function formatTime(s) {
    if (isNaN(s)) return '00:00';
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
}

// 播放逻辑
async function playTrack(index) {
    if (index < 0 || index >= playlistData.length) return;
    currentSongIndex = index;
    const song = playlistData[index];

    // 更新UI
    playerTrackName.innerText = song.name;
    playerArtist.innerText = song.artist;
    const pic = song.pic_id ? `https://music.163.com/api/img/blur/${song.pic_id}` : '';
    playerAlbumArt.innerHTML = pic ? `<img src="${pic}?param=100y100">` : '<i class="fas fa-music"></i>';

    document.querySelectorAll('.song-card').forEach((c, i) => c.classList.toggle('active', i === index));

    try {
        const res = await fetch(`https://api.vience.cn/api/music?id=${song.id}&type=netease`);
        const data = await res.json();
        if (data.url) {
            audioPlayer.src = data.url;
            audioPlayer.play();
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    } catch (e) { console.error('播放失败'); }
}

// 搜索逻辑
document.getElementById('searchBtn').onclick = async () => {
    const kw = document.getElementById('searchInput').value;
    if (!kw) return;
    resultsContainer.innerHTML = '<div class="error"><i class="fas fa-spinner fa-spin"></i><div>加载中...</div></div>';
    
    try {
        const res = await fetch(`https://api.vience.cn/api/music?name=${encodeURIComponent(kw)}&type=netease`);
        const data = await res.json();
        if (data.code === 200) {
            playlistData = data.data.map(item => ({
                name: item.name,
                artist: item.artist.join(' / '),
                id: item.id,
                pic_id: item.pic_id
            }));
            renderList();
        }
    } catch (e) { console.error('搜索异常'); }
};

function renderList() {
    resultsContainer.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'song-list';
    playlistData.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        const pic = s.pic_id ? `https://music.163.com/api/img/blur/${s.pic_id}?param=100y100` : 'https://via.placeholder.com/60';
        card.innerHTML = `<img src="${pic}"><div class="song-info"><div class="song-name">${s.name}</div><div class="song-artist">${s.artist}</div></div>`;
        card.onclick = () => playTrack(i);
        list.appendChild(card);
    });
    resultsContainer.appendChild(list);
}

// 基础控制
playBtn.onclick = () => {
    if (!audioPlayer.src) return;
    isPlaying ? audioPlayer.pause() : audioPlayer.play();
    isPlaying = !isPlaying;
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
};

document.getElementById('nextBtn').onclick = () => playTrack((currentSongIndex + 1) % playlistData.length);
document.getElementById('prevBtn').onclick = () => playTrack(currentSongIndex <= 0 ? playlistData.length - 1 : currentSongIndex - 1);

audioPlayer.ontimeupdate = () => {
    const p = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = p + '%';
    currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
};
audioPlayer.onloadedmetadata = () => totalTimeDisplay.innerText = formatTime(audioPlayer.duration);
audioPlayer.onended = () => document.getElementById('nextBtn').click();

progressBar.onclick = (e) => {
    audioPlayer.currentTime = (e.offsetX / progressBar.clientWidth) * audioPlayer.duration;
};

volumeBar.onclick = (e) => {
    const v = e.offsetX / volumeBar.clientWidth;
    audioPlayer.volume = v;
    volume.style.width = (v * 100) + '%';
};
