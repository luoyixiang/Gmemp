const API_BASE = "https://api-enhanced-eight-sigma.vercel.app";

// 极其丰富的关键词库，按维度分类
const musicLibrary = {
    genres: ["流行", "摇滚", "民谣", "电子", "爵士", "嘻哈", "蓝调", "金属", "朋克"],
    moods: ["治愈", "孤独", "快乐", "伤感", "燃", "解压", "安静", "复古"],
    scenes: ["车载", "运动", "学习", "冥想", "派对", "深夜", "下午茶", "健身"],
    periods: ["80年代", "90年代", "00年代", "经典老歌", "新歌榜"],
    special: ["ACG", "古风", "粤语", "欧美流行", "日系摇滚", "蒸汽波", "赛博朋克"]
};

// 扁平化关键词数组，方便随机提取
const keywords = Object.values(musicLibrary).flat();

let playlist = [];
let currentIndex = 0;
let sound = null;

const titleText = document.getElementById('track-title');
const artistText = document.getElementById('track-artist');
const playlistUI = document.getElementById('playlist');

document.getElementById('random-btn').onclick = fetchRandomList;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;

/**
 * 随机获取歌曲列表
 */
async function fetchRandomList() {
    // 每次点击随机选 1 个关键词
    const randomKey = keywords[Math.floor(Math.random() * keywords.length)];
    // 增加随机偏移量，获取该标签下不同的曲目
    const randomOffset = Math.floor(Math.random() * 50); 

    titleText.innerText = `正在搜索: ${randomKey}...`;
    
    try {
        const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(randomKey)}&limit=20&offset=${randomOffset}`);
        const data = await res.json();
        
        if (data.result && data.result.songs) {
            playlist = data.result.songs;
            renderPlaylist();
            playTrack(0);
        } else {
            // 如果该关键词没搜到，自动换一个再搜
            fetchRandomList();
        }
    } catch (err) {
        titleText.innerText = "连接 API 失败";
        console.error(err);
    }
}

/**
 * 渲染播放列表
 */
function renderPlaylist() {
    playlistUI.innerHTML = playlist.map((song, index) => `
        <li onclick="playTrack(${index})" class="song-item" id="item-${index}">
            ${song.name} - ${song.artists[0].name}
        </li>
    `).join('');
}

/**
 * 核心播放函数
 */
async function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const song = playlist[index];
    
    // UI 状态切换
    document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`item-${index}`);
    if (activeItem) activeItem.classList.add('active');
    
    titleText.innerText = "获取音频...";
    artistText.innerText = song.artists[0].name;

    try {
        const res = await fetch(`${API_BASE}/song/url/v1?id=${song.id}&level=standard`);
        const json = await res.json();
        let mp3Url = json.data[0].url;

        // 修复 Mixed Content: 强制 HTTPS
        if (mp3Url && mp3Url.startsWith("http://")) {
            mp3Url = mp3Url.replace("http://", "https://");
        }

        if (!mp3Url) {
            console.warn(`[跳过] ${song.name} 无效资源`);
            playNext();
            return;
        }

        if (sound) sound.unload();
        sound = new Howl({
            src: [mp3Url],
            html5: true,
            autoplay: true,
            format: ['mp3'],
            onplay: () => {
                titleText.innerText = song.name;
            },
            onend: () => playNext(),
            onloaderror: () => playNext()
        });

    } catch (err) {
        console.error("播放出错:", err);
        playNext();
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        playTrack(currentIndex + 1);
    } else {
        fetchRandomList(); 
    }
}

function playPrev() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
}
