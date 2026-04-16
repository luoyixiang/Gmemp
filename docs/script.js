const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const keywords = ["流行", "古风", "经典", "ACG", "摇滚", "欧美流行", "粤语金曲"];

let playlist = [];
let currentIndex = 0;
let sound = null;

const bgOverlay = document.getElementById('bg-overlay');
const titleText = document.getElementById('track-title');
const artistText = document.getElementById('track-artist');
const playlistUI = document.getElementById('playlist');

window.onload = () => fetchRandomList();
document.getElementById('random-btn').onclick = fetchRandomList;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;

async function fetchRandomList() {
    const key = keywords[Math.floor(Math.random() * keywords.length)];
    titleText.innerText = "获取新列表中...";
    
    try {
        const res = await fetch(`${API_BASE}/cloudsearch?keywords=${encodeURIComponent(key)}&limit=30`);
        const data = await res.json();
        
        if (data.result && data.result.songs) {
            // 过滤 VIP(1) 和 需要购买专辑(4) 的曲目
            playlist = data.result.songs.filter(s => s.fee !== 1 && s.fee !== 4);
            
            if (playlist.length === 0) {
                fetchRandomList();
                return;
            }

            renderPlaylist();
            updateBackground(playlist[0].al.picUrl);
            titleText.innerText = "发现: " + key;
            artistText.innerText = "已加载 " + playlist.length + " 首歌曲";
        }
    } catch (e) {
        titleText.innerText = "接口请求失败";
    }
}

function renderPlaylist() {
    playlistUI.innerHTML = playlist.map((s, i) => `
        <li onclick="playTrack(${i})" class="song-item" id="item-${i}">
            ${s.name} - ${s.ar[0].name}
        </li>
    `).join('');
}

function updateBackground(picUrl) {
    if (!picUrl) return;
    // 强制转换为 https 并使用 p1 节点，通常这是最稳定的 CDN 节点
    let safeUrl = picUrl.replace(/http:\/\/p\d+/, "https://p1");
    safeUrl = safeUrl.replace("http://", "https://");
    
    // 预加载图片后再更新，防止闪烁
    const img = new Image();
    img.src = `${safeUrl}?param=500y500`;
    img.onload = () => {
        bgOverlay.style.backgroundImage = `url('${img.src}')`;
    };
}

async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];

    // 更新 UI 状态
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById(`item-${index}`);
    if (item) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    updateBackground(song.al.picUrl);
    titleText.innerText = "解析地址...";
    artistText.innerText = song.ar[0].name;

    try {
        const res = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const data = await res.json();
        let mp3Url = data.data[0].url;

        if (!mp3Url) {
            console.warn("无权限，跳过");
            playNext();
            return;
        }

        mp3Url = mp3Url.replace("http://", "https://");

        if (sound) sound.unload();
        sound = new Howl({
            src: [mp3Url],
            html5: true,
            autoplay: true,
            onplay: () => titleText.innerText = song.name,
            onend: () => playNext(),
            onloaderror: () => playNext()
        });
    } catch (e) {
        playNext();
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) playTrack(currentIndex + 1);
    else fetchRandomList();
}

function playPrev() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
}
