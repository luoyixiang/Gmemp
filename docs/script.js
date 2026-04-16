const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const musicLibrary = ["流行", "华语", "经典", "ACG", "摇滚", "纯音乐", "治愈", "复古", "欧美流行"];

let playlist = [];
let currentIndex = 0;
let sound = null;

const titleText = document.getElementById('track-title');
const artistText = document.getElementById('track-artist');
const playlistUI = document.getElementById('playlist');
const bgOverlay = document.getElementById('bg-overlay');

// 页面加载自动获取列表
window.onload = () => {
    fetchRandomList();
};

document.getElementById('random-btn').onclick = fetchRandomList;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;

async function fetchRandomList() {
    const randomKey = musicLibrary[Math.floor(Math.random() * musicLibrary.length)];
    const randomOffset = Math.floor(Math.random() * 30); 
    titleText.innerText = `正在加载${randomKey}列表...`;
    
    try {
        const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(randomKey)}&limit=20&offset=${randomOffset}`);
        const data = await res.json();
        if (data.result && data.result.songs) {
            playlist = data.result.songs;
            renderPlaylist();
            titleText.innerText = "列表已就绪";
            artistText.innerText = "请选择歌曲播放";
        }
    } catch (err) {
        titleText.innerText = "初始化失败";
        console.error(err);
    }
}

function renderPlaylist() {
    playlistUI.innerHTML = playlist.map((song, index) => `
        <li onclick="playTrack(${index})" class="song-item" id="item-${index}">
            ${song.name} - ${song.artists[0].name}
        </li>
    `).join('');
}

async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];
    
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${index}`).classList.add('active');
    
    titleText.innerText = "连接中...";
    artistText.innerText = song.artists[0].name;

    try {
        // 1. 并发获取播放链接和歌曲详情（为了拿图片）
        const [urlRes, detailRes] = await Promise.all([
            fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`),
            fetch(`${API_BASE}/song/detail?ids=${song.id}`)
        ]);

        const urlData = await urlRes.json();
        const detailData = await detailRes.json();

        let mp3Url = urlData.data[0].url;
        const picUrl = detailData.songs[0].al.picUrl;

        // 设置背景图 (强制 HTTPS)
        if (picUrl) {
            const safePicUrl = picUrl.replace("http://", "https://");
            bgOverlay.style.backgroundImage = `url('${safePicUrl}?param=500y500')`;
        }

        // 协议修复
        if (mp3Url && mp3Url.startsWith("http://")) {
            mp3Url = mp3Url.replace("http://", "https://");
        }

        if (!mp3Url) {
            playNext();
            return;
        }

        if (sound) sound.unload();
        sound = new Howl({
            src: [mp3Url],
            html5: true,
            autoplay: true,
            format: ['mp3'],
            onplay: () => { titleText.innerText = song.name; },
            onend: () => playNext(),
            onloaderror: () => playNext()
        });

    } catch (err) {
        console.error(err);
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
