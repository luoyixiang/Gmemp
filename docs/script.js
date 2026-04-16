const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const keywords = ["流行", "民谣", "经典", "电子", "摇滚", "ACG", "轻音乐"];

let playlist = [];
let currentIndex = 0;
let sound = null;

// DOM 绑定
const titleDisplay = document.getElementById('track-title');
const artistDisplay = document.getElementById('track-artist');
const listDisplay = document.getElementById('playlist');

document.getElementById('random-btn').onclick = fetchRandomList;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;

/**
 * 随机获取歌曲列表
 */
async function fetchRandomList() {
    const randomKey = keywords[Math.floor(Math.random() * keywords.length)];
    const randomOffset = Math.floor(Math.random() * 30); 

    titleDisplay.innerText = "正在搜寻歌曲...";
    
    try {
        const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(randomKey)}&limit=15&offset=${randomOffset}`);
        const data = await res.json();
        
        if (data.result && data.result.songs) {
            playlist = data.result.songs;
            renderUI();
            playTrack(0);
        }
    } catch (err) {
        titleDisplay.innerText = "搜索失败，请重试";
        console.error(err);
    }
}

/**
 * 渲染列表 UI
 */
function renderUI() {
    listDisplay.innerHTML = playlist.map((song, index) => `
        <li onclick="playTrack(${index})" class="song-item" id="item-${index}">
            ${song.name} - ${song.artists[0].name}
        </li>
    `).join('');
}

/**
 * 播放逻辑
 */
async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    // 更新高亮样式
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${index}`).classList.add('active');
    
    titleDisplay.innerText = song.name;
    artistDisplay.innerText = song.artists[0].name;

    try {
        // 获取链接
        const res = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const json = await res.json();
        const url = json.data[0].url;

        if (!url) {
            console.warn("无播放地址，尝试下一首");
            playNext();
            return;
        }

        // Howler 控制
        if (sound) sound.unload();
        sound = new Howl({
            src: [url],
            html5: true,
            autoplay: true,
            onend: () => playNext()
        });
    } catch (err) {
        console.error("加载音频失败", err);
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        playTrack(currentIndex + 1);
    } else {
        fetchRandomList(); // 播完了自动换一批
    }
}

function playPrev() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
}