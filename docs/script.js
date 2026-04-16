const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";
const musicLibrary = ["流行", "华语经典", "精选摇滚", "ACG热歌", "纯音乐催眠", "欧美金曲"];

let playlist = [];
let currentIndex = 0;
let sound = null;

const titleText = document.getElementById('track-title');
const artistText = document.getElementById('track-artist');
const playlistUI = document.getElementById('playlist');
const bgOverlay = document.getElementById('bg-overlay');

window.onload = () => fetchRandomList();

document.getElementById('random-btn').onclick = fetchRandomList;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;

async function fetchRandomList() {
    const randomKey = musicLibrary[Math.floor(Math.random() * musicLibrary.length)];
    const randomOffset = Math.floor(Math.random() * 20); 
    titleText.innerText = "正在同步云端列表...";
    
    try {
        const res = await fetch(`${API_BASE}/cloudsearch?keywords=${encodeURIComponent(randomKey)}&limit=30&offset=${randomOffset}`);
        const data = await res.json();
        
        if (data.result && data.result.songs) {
            // 【优化】过滤掉 fee=1 (VIP) 或 fee=4 (付费专辑) 的资源，提高有效性
            playlist = data.result.songs.filter(song => song.fee !== 1 && song.fee !== 4);
            
            if (playlist.length === 0) {
                fetchRandomList(); // 如果过滤完没歌了，重新搜
                return;
            }

            renderPlaylist();
            titleText.innerText = "列表已就绪";
            artistText.innerText = `随机风格: ${randomKey}`;
            
            // 默认加载第一首的封面作为初始背景
            updateBackground(playlist[0].id);
        }
    } catch (err) {
        titleText.innerText = "网络异常";
    }
}

function renderPlaylist() {
    playlistUI.innerHTML = playlist.map((song, index) => `
        <li onclick="playTrack(${index})" class="song-item" id="item-${index}">
            ${song.name} - ${song.ar[0].name}
        </li>
    `).join('');
}

/**
 * 独立更新背景函数
 */
async function updateBackground(id) {
    try {
        const res = await fetch(`${API_BASE}/song/detail?ids=${id}`);
        const data = await res.json();
        let picUrl = data.songs[0].al.picUrl;
        if (picUrl) {
            picUrl = picUrl.replace("http://", "https://") + "?param=500y500";
            bgOverlay.style.backgroundImage = `url('${picUrl}')`;
        }
    } catch (e) { console.error("背景加载失败"); }
}

async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[index];
    
    // UI 反馈
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${index}`).classList.add('active');
    
    titleText.innerText = "正在解码音频...";
    artistText.innerText = song.ar[0].name;

    // 优先尝试切换背景
    updateBackground(song.id);

    try {
        const urlRes = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const urlData = await urlRes.json();
        let mp3Url = urlData.data[0].url;

        if (!mp3Url || mp3Url === "") {
            console.warn("资源失效，自动跳过");
            playNext();
            return;
        }

        mp3Url = mp3Url.replace("http://", "https://");

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
