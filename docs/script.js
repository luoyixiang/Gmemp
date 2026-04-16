const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const keywords = ["流行", "华语经典", "精选摇滚", "ACG", "欧美流行"];

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
    titleText.innerText = "加载中...";
    try {
        const res = await fetch(`${API_BASE}/cloudsearch?keywords=${encodeURIComponent(key)}&limit=30`);
        const data = await res.json();
        if (data.result && data.result.songs) {
            playlist = data.result.songs.filter(s => s.fee !== 1);
            renderPlaylist();
            if (playlist.length > 0) updateBackground(playlist[0].al.picUrl);
            titleText.innerText = "风格: " + key;
        }
    } catch (e) { titleText.innerText = "网络错误"; }
}

function renderPlaylist() {
    playlistUI.innerHTML = playlist.map((s, i) => `
        <li onclick="playTrack(${i})" class="song-item" id="item-${i}">
            ${s.name} - ${s.ar[0].name}
        </li>
    `).join('');
}

/**
 * 核心逻辑：图片加载与防 404
 */
function updateBackground(picUrl) {
    if (!picUrl) return;

    // 尝试构建 HTTPS 的图片链接
    let safeUrl = picUrl.replace("http://", "https://");
    // 强制尝试 p1 节点 (最稳定)
    safeUrl = safeUrl.replace(/p\d+\.music\.126\.net/, "p1.music.126.net");

    const img = new Image();
    img.src = safeUrl + "?param=500y500";
    
    img.onload = () => {
        bgOverlay.style.backgroundImage = `url('${img.src}')`;
    };
    
    img.onerror = () => {
        console.warn("图片 404 或拦截，使用备份背景");
        // 如果网易云图片加载失败，使用一张高清风景图作为兜底
        bgOverlay.style.backgroundImage = `url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80')`;
    };
}

async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];

    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${index}`).classList.add('active');
    
    updateBackground(song.al.picUrl);
    titleText.innerText = "解析中...";
    artistText.innerText = song.ar[0].name;

    try {
        const res = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const data = await res.json();
        let mp3Url = data.data[0].url;

        if (!mp3Url) { playNext(); return; }

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
    } catch (e) { playNext(); }
}

function playNext() {
    if (currentIndex < playlist.length - 1) playTrack(currentIndex + 1);
    else fetchRandomList();
}

function playPrev() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
}
