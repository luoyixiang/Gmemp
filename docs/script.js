const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const keywords = ["流行", "古风", "经典", "ACG", "摇滚", "民谣"];

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
    titleText.innerText = "同步列表中...";
    
    try {
        const res = await fetch(`${API_BASE}/cloudsearch?keywords=${encodeURIComponent(key)}&limit=30`);
        const data = await res.json();
        
        if (data.result && data.result.songs) {
            // 严格过滤 VIP 和无版权
            playlist = data.result.songs.filter(s => s.fee !== 1 && s.fee !== 4);
            renderPlaylist();
            if (playlist.length > 0) updateBackground(playlist[0].al.picUrl);
            titleText.innerText = "风格: " + key;
            artistText.innerText = "随机加载成功";
        }
    } catch (e) {
        titleText.innerText = "网络异常，请刷新";
    }
}

function renderPlaylist() {
    playlistUI.innerHTML = playlist.map((s, i) => `
        <li onclick="playTrack(${i})" class="song-item" id="item-${i}">
            ${s.name} - ${s.ar[0].name}
        </li>
    `).join('');
}

/**
 * 核心修复：图片域名替换
 */
function updateBackground(picUrl) {
    if (!picUrl) return;

    // 修复 ERR_CONNECTION_CLOSED: 
    // 1. 将所有 p3/p4.music.126.net 替换为 music.163.com 的镜像路径
    // 2. 强制使用 HTTPS
    let safeUrl = picUrl.replace(/https?:\/\/(p\d+)\.music\.126\.net/, "https://music.163.com/api/img/blur");
    
    // 如果上面的正则没匹配到，使用通用备份方案
    if (safeUrl === picUrl) {
        safeUrl = picUrl.replace("http://", "https://").replace(/p\d+\.music\.126\.net/, "p1.music.126.net");
    }

    const img = new Image();
    img.src = safeUrl + "?param=500y500"; 
    img.onload = () => {
        bgOverlay.style.backgroundImage = `url('${img.src}')`;
    };
    img.onerror = () => {
        // 如果还报错，尝试最后的保底方案
        bgOverlay.style.backgroundImage = `url('https://p1.music.126.net/6y-UleORxhDykBXqbhvQSg==/109951163447127233.jpg')`;
    };
}

async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];

    // UI
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${index}`).classList.add('active');
    
    updateBackground(song.al.picUrl);
    titleText.innerText = "解析地址...";
    artistText.innerText = song.ar[0].name;

    try {
        const res = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const data = await res.json();
        let mp3Url = data.data[0].url;

        if (!mp3Url) {
            console.log("资源失效，跳过");
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
