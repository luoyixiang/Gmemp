const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const keywords = ["流行", "民谣", "经典", "ACG", "轻音乐", "欧美"];

let playlist = [];
let currentIndex = 0;
let sound = null;

const titleDisplay = document.getElementById('track-title');
const artistDisplay = document.getElementById('track-artist');
const listDisplay = document.getElementById('playlist');

document.getElementById('random-btn').onclick = fetchRandomList;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;

async function fetchRandomList() {
    const randomKey = keywords[Math.floor(Math.random() * keywords.length)];
    const randomOffset = Math.floor(Math.random() * 20); 

    titleDisplay.innerText = "正在搜寻音乐...";
    
    try {
        const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(randomKey)}&limit=15&offset=${randomOffset}`);
        const data = await res.json();
        
        if (data.result && data.result.songs) {
            playlist = data.result.songs;
            renderUI();
            playTrack(0);
        } else {
            titleDisplay.innerText = "未找到歌曲，请重试";
        }
    } catch (err) {
        titleDisplay.innerText = "网络连接失败";
        console.error("Search Error:", err);
    }
}

function renderUI() {
    listDisplay.innerHTML = playlist.map((song, index) => `
        <li onclick="playTrack(${index})" class="song-item" id="item-${index}">
            ${song.name} - ${song.artists[0].name}
        </li>
    `).join('');
}

async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    // 更新 UI
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    const currentItem = document.getElementById(`item-${index}`);
    if (currentItem) currentItem.classList.add('active');
    
    titleDisplay.innerText = "连接中...";
    artistDisplay.innerText = song.artists[0].name;

    try {
        const res = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const json = await res.json();
        let mp3Url = json.data[0].url;

        // 【关键修复 1】解决 Mixed Content 问题：强制 HTTPS 
        if (mp3Url && mp3Url.startsWith("http://")) {
            mp3Url = mp3Url.replace("http://", "https://");
        }

        // 【关键修复 2】解决无地址跳过问题 
        if (!mp3Url) {
            console.warn(`歌曲 ${song.name} 无播放地址，跳过...`);
            titleDisplay.innerText = "版权限制，跳过中...";
            setTimeout(playNext, 1000); 
            return;
        }

        titleDisplay.innerText = song.name;

        if (sound) sound.unload();
        sound = new Howl({
            src: [mp3Url],
            html5: true,
            autoplay: true,
            format: ['mp3'],
            onend: () => playNext(),
            onloaderror: (id, err) => {
                console.error("加载错误:", err);
                playNext(); // 加载失败也尝试下一首
            }
        });
    } catch (err) {
        console.error("Play Error:", err);
        playNext();
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        playTrack(currentIndex + 1);
    } else {
        fetchRandomList(); // 列表播完自动换关键词随机
    }
}

function playPrev() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
}
