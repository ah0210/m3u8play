// 动态加载 hls.js，仅在需要时加载
let Hls = null;
let hlsLoaded = false;

async function loadHlsJs() {
    if (hlsLoaded) return;
    
    try {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.async = true;
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        Hls = window.Hls;
        hlsLoaded = true;
        console.log('hls.js 加载成功');
    } catch (error) {
        console.error('hls.js 加载失败:', error);
        throw error;
    }
}
// ========== 1. 国际化配置 ==========
const i18n = {
    'zh-CN': {
        pageTitle: '终极版 M3U8/MP4 播放器',
        langLabel: '语言',
        themeLabel: '主题',
        volumeLabel: '音量',
        speedLabel: '倍速',
        qualityLabel: '画质',
        loadPlayBtn: '加载播放',
        pauseBtn: '暂停',
        fullscreenBtn: '全屏',
        pipBtn: '画中画',
        screenshotBtn: '截图',
        shortcutBtn: '快捷键',
        clearCacheBtn: '清理缓存',
        urlInputPlaceholder: '输入 m3u8/MP4 链接',
        loadingText: '加载中...',
        statusSuccessLoad: '视频加载完成，可播放',
        statusSuccessLoadNative: '视频加载完成（原生 HLS）',
        statusSuccessPlay: '视频播放中',
        statusSuccessPause: '视频已暂停',
        statusSuccessEnd: '视频播放完毕',
        statusSuccessFullscreen: '已进入全屏模式',
        statusSuccessExitFullscreen: '已退出全屏模式',
        statusSuccessPip: '已进入画中画模式',
        statusSuccessExitPip: '已退出画中画模式',
        statusSuccessSpeed: '已切换至 {speed} 倍速播放',
        statusSuccessQuality: '已切换至 {quality} 画质',
        statusSuccessScreenshot: '截图成功，可在弹窗中下载',
        statusSuccessScreenshotDownload: '截图已下载',
        statusSuccessClearCache: '缓存已清理完成',
        statusErrorUrl: '错误：请输入有效的视频链接',
        statusErrorLoad: '视频加载失败',
        statusErrorNetwork: '错误：网络请求失败，请检查链接或网络',
        statusErrorDecode: '错误：视频解码失败，格式不支持',
        statusErrorUnknown: '错误：{msg}',
        statusErrorVideo: '错误：{msg}',
        statusErrorScreenshot: '截图失败：{msg}（可能受跨域限制）',
        statusErrorPip: '{action}画中画失败：{msg}（需视频播放后操作）',
        statusOffline: '⚠️ 网络已断开，将在恢复后自动重连',
        statusReconnect: '网络恢复，正在重新加载视频...',
        shortcutTitle: '快捷键说明',
        shortcutPlay: '播放/暂停',
        shortcutForward: '快进 5 秒',
        shortcutBackward: '后退 5 秒',
        shortcutVolUp: '音量+5%',
        shortcutVolDown: '音量-5%',
        shortcutFullscreen: '全屏/退出全屏',
        shortcutPip: '画中画/退出',
        shortcutScreenshot: '截图',
        touchTip: '双击播放/暂停',
        logTitle: '播放日志',
        screenshotDownload: '下载截图'
    },
    'en-US': {
        pageTitle: 'Ultimate M3U8/MP4 Player',
        langLabel: 'Language',
        themeLabel: 'Theme',
        volumeLabel: 'Volume',
        speedLabel: 'Speed',
        qualityLabel: 'Quality',
        loadPlayBtn: 'Load & Play',
        pauseBtn: 'Pause',
        fullscreenBtn: 'Fullscreen',
        pipBtn: 'PiP',
        screenshotBtn: 'Screenshot',
        shortcutBtn: 'Shortcuts',
        clearCacheBtn: 'Clear Cache',
        urlInputPlaceholder: 'Enter m3u8/MP4 URL',
        loadingText: 'Loading...',
        statusSuccessLoad: 'Video loaded successfully, ready to play',
        statusSuccessLoadNative: 'Video loaded (Native HLS)',
        statusSuccessPlay: 'Video playing',
        statusSuccessPause: 'Video paused',
        statusSuccessEnd: 'Video playback completed',
        statusSuccessFullscreen: 'Entered fullscreen mode',
        statusSuccessExitFullscreen: 'Exited fullscreen mode',
        statusSuccessPip: 'Entered picture-in-picture mode',
        statusSuccessExitPip: 'Exited picture-in-picture mode',
        statusSuccessSpeed: 'Switched to {speed}x playback speed',
        statusSuccessQuality: 'Switched to {quality} quality',
        statusSuccessScreenshot: 'Screenshot taken, download in popup',
        statusSuccessScreenshotDownload: 'Screenshot downloaded',
        statusSuccessClearCache: 'Cache cleared successfully',
        statusErrorUrl: 'Error: Please enter a valid video URL',
        statusErrorLoad: 'Video load failed',
        statusErrorNetwork: 'Error: Network request failed, check URL or network',
        statusErrorDecode: 'Error: Video decoding failed, format not supported',
        statusErrorUnknown: 'Error: {msg}',
        statusErrorVideo: 'Error: {msg}',
        statusErrorScreenshot: 'Screenshot failed: {msg} (may be restricted by CORS)',
        statusErrorPip: '{action} picture-in-picture failed: {msg} (operate after video plays)',
        statusOffline: '⚠️ Network disconnected, auto-reconnect when restored',
        statusReconnect: 'Network restored, reloading video...',
        shortcutTitle: 'Shortcut Keys',
        shortcutPlay: 'Play/Pause',
        shortcutForward: 'Forward 5s',
        shortcutBackward: 'Backward 5s',
        shortcutVolUp: 'Volume +5%',
        shortcutVolDown: 'Volume -5%',
        shortcutFullscreen: 'Fullscreen/Exit',
        shortcutPip: 'PiP/Exit',
        shortcutScreenshot: 'Screenshot',
        touchTip: 'Double tap to play/pause',
        logTitle: 'Playback Log',
        screenshotDownload: 'Download Screenshot'
    }
};

// ========== 2. DOM 元素 & 全局变量 ==========
const el = {
    // 核心元素
    video: document.getElementById('video-player'),
    loadingMask: document.getElementById('loading-mask'),
    loadingText: document.getElementById('loading-text'),
    statusTip: document.getElementById('status-tip'),
    urlInput: document.getElementById('url-input'),
    loadPlayBtn: document.getElementById('load-play-btn'),
    loadPlayText: document.getElementById('load-play-text'),
    pauseBtn: document.getElementById('pause-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    pipBtn: document.getElementById('pip-btn'),
    screenshotBtn: document.getElementById('screenshot-btn'),
    shortcutBtn: document.getElementById('shortcut-btn'),
    clearCacheBtn: document.getElementById('clear-cache-btn'),
    volumeIcon: document.getElementById('volume-icon'),
    progressWrap: document.getElementById('progress-wrap'),
    progressBar: document.getElementById('progress-bar'),
    progressLoaded: document.getElementById('progress-loaded'),
    volumeSlider: document.getElementById('volume-slider'),
    speedSelect: document.getElementById('speed-select'),
    qualitySelect: document.getElementById('quality-select'),
    // 扩展元素
    screenshotModal: document.getElementById('screenshot-modal'),
    screenshotImg: document.getElementById('screenshot-img'),
    screenshotClose: document.getElementById('screenshot-close'),
    screenshotDownload: document.getElementById('screenshot-download'),
    shortcutTip: document.getElementById('shortcut-tip'),
    touchTip: document.getElementById('touch-tip'),
    // 国际化元素
    langLabel: document.getElementById('langLabel'),
    themeLabel: document.getElementById('themeLabel'),
    speedLabel: document.getElementById('speedLabel'),
    qualityLabel: document.getElementById('qualityLabel'),
    shortcutTitle: document.getElementById('shortcutTitle'),
    shortcutPlay: document.getElementById('shortcutPlay'),
    shortcutForward: document.getElementById('shortcutForward'),
    shortcutBackward: document.getElementById('shortcutBackward'),
    shortcutVolUp: document.getElementById('shortcutVolUp'),
    shortcutVolDown: document.getElementById('shortcutVolDown'),
    shortcutFullscreen: document.getElementById('shortcutFullscreen'),
    shortcutPip: document.getElementById('shortcutPip'),
    shortcutScreenshot: document.getElementById('shortcutScreenshot'),
    pageTitle: document.getElementById('pageTitle'),
    // 主题/语言
    langSelect: document.getElementById('lang-select'),
    themeSelect: document.getElementById('theme-select'),
    // 日志
    logHeader: document.getElementById('log-header'),
    logBody: document.getElementById('log-body'),
    logTitle: document.getElementById('logTitle'),
    logClear: document.getElementById('log-clear')
};

let hls = null;
let isLoading = false;
let currentVideoUrl = '';
let reconnectTimer = null;
let shortcutTimer = null;
let touchTimer = null;
let currentLang = 'zh-CN';
let currentTheme = 'light';

// ========== 3. 工具函数：国际化 ==========
function updateI18n(lang) {
    currentLang = lang;
    const langConfig = i18n[lang];
    
    // 确保元素存在后再更新
    if (el.pageTitle) el.pageTitle.textContent = langConfig.pageTitle;
    if (el.langLabel) el.langLabel.textContent = langConfig.langLabel;
    if (el.themeLabel) el.themeLabel.textContent = langConfig.themeLabel;
    if (el.speedLabel) el.speedLabel.textContent = langConfig.speedLabel;
    if (el.qualityLabel) el.qualityLabel.textContent = langConfig.qualityLabel;
    if (el.loadPlayText) el.loadPlayText.textContent = langConfig.loadPlayBtn;
    if (el.pauseBtn) el.pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span>${langConfig.pauseBtn}</span>`;
    if (el.fullscreenBtn) el.fullscreenBtn.innerHTML = `<i class="fas fa-expand"></i> <span>${langConfig.fullscreenBtn}</span>`;
    if (el.pipBtn) el.pipBtn.innerHTML = `<i class="fas fa-expand-arrows-alt"></i> <span>${langConfig.pipBtn}</span>`;
    if (el.screenshotBtn) el.screenshotBtn.innerHTML = `<i class="fas fa-camera"></i> <span>${langConfig.screenshotBtn}</span>`;
    if (el.shortcutBtn) el.shortcutBtn.innerHTML = `<i class="fas fa-keyboard"></i> <span>${langConfig.shortcutBtn}</span>`;
    if (el.clearCacheBtn) el.clearCacheBtn.innerHTML = `<i class="fas fa-trash"></i> <span>${langConfig.clearCacheBtn}</span>`;
    if (el.urlInput) el.urlInput.placeholder = langConfig.urlInputPlaceholder;
    if (el.shortcutTitle) el.shortcutTitle.textContent = langConfig.shortcutTitle;
    if (el.shortcutPlay) el.shortcutPlay.textContent = langConfig.shortcutPlay;
    if (el.shortcutForward) el.shortcutForward.textContent = langConfig.shortcutForward;
    if (el.shortcutBackward) el.shortcutBackward.textContent = langConfig.shortcutBackward;
    if (el.shortcutVolUp) el.shortcutVolUp.textContent = langConfig.shortcutVolUp;
    if (el.shortcutVolDown) el.shortcutVolDown.textContent = langConfig.shortcutVolDown;
    if (el.shortcutFullscreen) el.shortcutFullscreen.textContent = langConfig.shortcutFullscreen;
    if (el.shortcutPip) el.shortcutPip.textContent = langConfig.shortcutPip;
    if (el.shortcutScreenshot) el.shortcutScreenshot.textContent = langConfig.shortcutScreenshot;
    if (el.touchTip) el.touchTip.textContent = langConfig.touchTip;
    if (el.logTitle) el.logTitle.textContent = langConfig.logTitle;
    if (el.screenshotDownload) el.screenshotDownload.textContent = langConfig.screenshotDownload;

    // 记录日志
    addLog(`切换语言至 ${lang === 'zh-CN' ? '中文' : 'English'}`, 'info');
}

// ========== 4. 工具函数：主题切换 ==========
function updateTheme(theme) {
    currentTheme = theme;
    document.body.className = theme;
    localStorage.setItem('playerTheme', theme);
    
    // 记录日志
    addLog(`切换主题至 ${theme === 'light' ? '亮色' : '暗色'}`, 'info');
}

// ========== 5. 工具函数：日志记录 ==========
function addLog(message, type = 'info') {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const logItem = document.createElement('div');
    logItem.className = `log-item log-type-${type}`;
    logItem.innerHTML = `<span class="log-time">[${timeStr}]</span><span>${message}</span>`;
    
    el.logBody.appendChild(logItem);
    el.logBody.scrollTop = el.logBody.scrollHeight; // 滚动到底部

    // 控制台日志（方便调试）
    switch(type) {
        case 'error': console.error(`[Player] ${message}`); break;
        case 'success': console.log(`[Player] ${message}`); break;
        default: console.info(`[Player] ${message}`); break;
    }
}

// ========== 6. 工具函数：状态提示 ==========
function showStatus(text, type) {
    el.statusTip.textContent = text;
    el.statusTip.className = `status-tip show ${type}`;
    
    // 记录日志
    addLog(text, type === 'error' ? 'error' : 'success');

    if (type !== 'loading' && type !== 'offline') {
        setTimeout(() => el.statusTip.classList.remove('show'), 3000);
    }
}

// ========== 7. 工具函数：加载遮罩 ==========
function showLoading(text = i18n[currentLang].loadingText) {
    isLoading = true;
    el.loadingMask.classList.add('show');
    el.loadingText.textContent = text;
    showStatus(text, 'loading');
    addLog(`开始加载：${text}`, 'info');
}
function hideLoading() {
    isLoading = false;
    el.loadingMask.classList.remove('show');
    el.statusTip.classList.remove('show');
    addLog('加载完成，隐藏遮罩', 'info');
}

// ========== 8. 功能：缓存清理 ==========
function clearCache() {
    // 清除播放记录、倍速记忆、主题设置
    localStorage.removeItem('videoPlayHistory');
    localStorage.removeItem('playerPreferredSpeed');
    localStorage.removeItem('playerTheme');
    
    // 重置播放器状态
    el.speedSelect.value = '1';
    el.video.playbackRate = 1;
    
    showStatus(i18n[currentLang].statusSuccessClearCache, 'success');
    addLog('已清理所有本地缓存（播放记录、倍速、主题）', 'success');
}

// ========== 9. 功能：移动端触摸操作 ==========
function initTouchEvents() {
    // 双击播放/暂停
    let lastTapTime = 0;
    el.video.addEventListener('touchstart', (e) => {
        const now = Date.now();
        if (now - lastTapTime < 300) {
            // 双击
            e.preventDefault();
            if (el.video.paused && !isLoading) {
                // 播放视频
                el.video.play().then(() => {
                    el.pauseBtn.disabled = false;
                    showStatus(i18n[currentLang].statusSuccessPlay, 'success');
                }).catch(err => {
                    showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
                });
            } else {
                el.pauseBtn.click();
            }
            // 显示触摸提示
            el.touchTip.classList.add('show');
            clearTimeout(touchTimer);
            touchTimer = setTimeout(() => {
                el.touchTip.classList.remove('show');
            }, 1000);
        }
        lastTapTime = now;
    });

    // 滑动调整进度/音量
    let startX = 0, startY = 0;
    el.video.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        
        if (startX === 0) {
            startX = touch.clientX;
            startY = touch.clientY;
            return;
        }

        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        // 横向滑动：调整进度
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();
            const progressDelta = (deltaX / el.video.offsetWidth) * el.video.duration;
            el.video.currentTime = Math.max(0, Math.min(el.video.currentTime + progressDelta, el.video.duration));
            el.progressBar.style.width = `${(el.video.currentTime / el.video.duration) * 100}%`;
        } 
        // 纵向滑动：调整音量
        else {
            e.preventDefault();
            const volumeDelta = -deltaY / el.video.offsetHeight;
            const newVolume = Math.max(0, Math.min(el.video.volume + volumeDelta, 1));
            el.video.volume = newVolume;
            el.volumeSlider.value = newVolume;
        }

        startX = touch.clientX;
        startY = touch.clientY;
    });

    el.video.addEventListener('touchend', () => {
        startX = 0;
        startY = 0;
    });

    addLog('初始化移动端触摸事件完成', 'info');
}

// ========== 10. 原有核心功能（略作调整适配国际化） ==========
// 画质选择
function initQualitySelector(hlsInstance) {
    if (!hlsInstance || !hlsInstance.levels || hlsInstance.levels.length === 0) {
        el.qualitySelect.disabled = true;
        el.qualitySelect.innerHTML = '<option value="">自动</option>';
        return;
    }

    el.qualitySelect.innerHTML = '<option value="">自动</option>';
    el.qualitySelect.disabled = false;

    hlsInstance.levels.forEach((level, index) => {
        const bitrate = Math.round(level.bitrate / 1000);
        const width = level.width || 'Unknown';
        const height = level.height || 'Unknown';
        const resolution = currentLang === 'zh-CN' ? 
            `${width}x${height} (${bitrate}kbps)` : 
            `${width}x${height} (${bitrate}kbps)`;
        const option = document.createElement('option');
        option.value = index;
        option.textContent = resolution;
        el.qualitySelect.appendChild(option);
    });

    el.qualitySelect.addEventListener('change', () => {
        const selectedLevel = el.qualitySelect.value;
        hlsInstance.currentLevel = selectedLevel === '' ? -1 : Number(selectedLevel);
        const selectedText = selectedLevel === '' ? 
            (currentLang === 'zh-CN' ? '自动' : 'Auto') : 
            el.qualitySelect.options[el.qualitySelect.selectedIndex].text;
        showStatus(i18n[currentLang].statusSuccessQuality.replace('{quality}', selectedText), 'success');
    });
}

// 倍速记忆
function savePlaybackSpeed(speed) {
    localStorage.setItem('playerPreferredSpeed', speed);
    addLog(`保存倍速设置：${speed}x`, 'info');
}
function getSavedPlaybackSpeed() {
    const speed = localStorage.getItem('playerPreferredSpeed') || '1';
    addLog(`读取保存的倍速：${speed}x`, 'info');
    return speed;
}

// 截图
function captureScreenshot() {
    try {
        // 检查视频是否有有效的源和尺寸
        if (!el.video.src || el.video.videoWidth === 0 || el.video.videoHeight === 0) {
            showStatus(i18n[currentLang].statusErrorScreenshot.replace('{msg}', '视频未加载或无效'), 'error');
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = el.video.videoWidth;
        canvas.height = el.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(el.video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL('image/png');
        
        el.screenshotImg.src = imageUrl;
        el.screenshotModal.classList.add('show');
        
        el.screenshotDownload.onclick = () => {
            const a = document.createElement('a');
            a.href = imageUrl;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = currentLang === 'zh-CN' ? 
                `视频截图_${timestamp}.png` : 
                `Video_Screenshot_${timestamp}.png`;
            a.download = fileName;
            a.click();
            showStatus(i18n[currentLang].statusSuccessScreenshotDownload, 'success');
        };

        showStatus(i18n[currentLang].statusSuccessScreenshot, 'success');
    } catch (err) {
        // 处理 blob URL 相关错误
        if (err.message.includes('Not allowed to load local resource') || err.message.includes('blob:')) {
            showStatus(i18n[currentLang].statusErrorScreenshot.replace('{msg}', '浏览器安全限制，无法生成截图'), 'error');
        } else {
            showStatus(i18n[currentLang].statusErrorScreenshot.replace('{msg}', err.message), 'error');
        }
    }
}

// 画中画
function togglePictureInPicture() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().then(() => {
            el.pipBtn.textContent = currentLang === 'zh-CN' ? '画中画' : 'PiP';
            showStatus(i18n[currentLang].statusSuccessExitPip, 'success');
        }).catch(err => {
            showStatus(i18n[currentLang].statusErrorPip.replace('{action}', currentLang === 'zh-CN' ? '退出' : 'Exit ').replace('{msg}', err.message), 'error');
        });
    } else {
        el.video.requestPictureInPicture().then(() => {
            el.pipBtn.textContent = currentLang === 'zh-CN' ? '退出画中画' : 'Exit PiP';
            showStatus(i18n[currentLang].statusSuccessPip, 'success');
        }).catch(err => {
            showStatus(i18n[currentLang].statusErrorPip.replace('{action}', currentLang === 'zh-CN' ? '进入' : 'Enter ').replace('{msg}', err.message), 'error');
        });
    }
}

// 全屏
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (el.video.requestFullscreen) {
            el.video.requestFullscreen();
        } else if (el.video.webkitRequestFullscreen) {
            el.video.webkitRequestFullscreen();
        } else if (el.video.msRequestFullscreen) {
            el.video.msRequestFullscreen();
        }
        el.fullscreenBtn.textContent = currentLang === 'zh-CN' ? '退出全屏' : 'Exit Fullscreen';
        showStatus(i18n[currentLang].statusSuccessFullscreen, 'success');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        el.fullscreenBtn.textContent = currentLang === 'zh-CN' ? '全屏' : 'Fullscreen';
        showStatus(i18n[currentLang].statusSuccessExitFullscreen, 'success');
    }
}

// 断网重连
function handleNetworkStatus() {
    if (!navigator.onLine) {
        showStatus(i18n[currentLang].statusOffline, 'offline');
        el.video.pause();
        if (reconnectTimer) clearInterval(reconnectTimer);
        addLog('网络断开，暂停播放并准备重连', 'error');
    } else {
        el.statusTip.classList.remove('show');
        if (currentVideoUrl && el.video.paused) {
            reconnectTimer = setInterval(() => {
                if (isLoading) return;
                showLoading(i18n[currentLang].statusReconnect);
                loadVideo(currentVideoUrl, true);
            }, 3000);
        }
        addLog('网络恢复，开始尝试重连', 'info');
    }
}

// 记忆播放位置
function savePlayPosition(url, time) {
    if (!url || time < 5) return;
    const playHistory = JSON.parse(localStorage.getItem('videoPlayHistory') || '{}');
    playHistory[url] = time;
    localStorage.setItem('videoPlayHistory', JSON.stringify(playHistory));
    addLog(`保存播放位置：${url} -> ${Math.round(time)}秒`, 'info');
}
function getPlayPosition(url) {
    const playHistory = JSON.parse(localStorage.getItem('videoPlayHistory') || '{}');
    const time = playHistory[url] || 0;
    addLog(`读取播放位置：${url} -> ${Math.round(time)}秒`, 'info');
    return time;
}

// 加载视频
async function loadVideo(url, restorePosition = false) {
    if (!url || !url.trim()) {
        showStatus(i18n[currentLang].statusErrorUrl, 'error');
        return;
    }

    currentVideoUrl = url.trim();
    addLog(`开始加载视频：${currentVideoUrl}`, 'info');

    hideLoading();
    if (hls) {
        hls.destroy();
        hls = null;
        addLog('销毁原有 HLS 实例', 'info');
    }
    
    // 彻底清除视频元素的所有媒体源，避免blob URL错误
    el.video.pause();
    
    // 清除视频源之前，确保停止所有加载操作
    if (el.video.src) {
        // 如果是blob URL，先将其设置为空，然后再设置为默认值
        el.video.src = '';
        // 对于MediaSource扩展，确保彻底清理
        if (el.video.mediaSource) {
            try {
                el.video.mediaSource.endOfStream();
            } catch (e) {
                // 忽略清理错误
            }
        }
    }
    
    // 重置所有控制状态
            el.pauseBtn.disabled = true;
            el.fullscreenBtn.disabled = true;
            el.pipBtn.disabled = true;
            el.screenshotBtn.disabled = true;
            el.qualitySelect.disabled = true;
    el.progressBar.style.width = '0%';
    el.progressLoaded.style.width = '0%';

    if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
    }

    showLoading(i18n[currentLang].loadingText);

    if (url.endsWith('.m3u8')) {
        try {
            // 动态加载 hls.js
            if (!hlsLoaded) {
                await loadHlsJs();
            }
            
            if (Hls.isSupported()) {
                hls = new Hls({
                    maxBufferLength: 30,
                    startLevel: -1,
                    enableWorker: true,
                    lowLatencyMode: true
                });

                hls.attachMedia(el.video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    hideLoading();
                    initQualitySelector(hls);
                    if (restorePosition) {
                                const savedTime = getPlayPosition(url);
                                if (savedTime > 0) el.video.currentTime = savedTime;
                            }
                            showStatus(i18n[currentLang].statusSuccessLoad, 'success');
                            el.fullscreenBtn.disabled = false;
                            el.pipBtn.disabled = !('pictureInPictureEnabled' in document);
                            el.screenshotBtn.disabled = false;
                            // 自动播放
                            el.video.play().then(() => {
                                el.pauseBtn.disabled = false;
                                showStatus(i18n[currentLang].statusSuccessPlay, 'success');
                            }).catch(err => {
                                // 自动播放失败时不报错，允许用户手动播放
                                console.log('自动播放失败，等待用户手动播放:', err.message);
                            });
                    // 注意：当使用HLS.js时，不要调用el.video.load()，因为它会破坏MediaSource连接
                });

                hls.on(Hls.Events.LOADING_PROGRESS, (event, data) => {
                    const loadedPercent = (data.loaded / data.total) * 100;
                    el.progressLoaded.style.width = `${loadedPercent}%`;
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    hideLoading();
                    let errorText = i18n[currentLang].statusErrorLoad;
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                errorText = i18n[currentLang].statusErrorNetwork;
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                errorText = i18n[currentLang].statusErrorDecode;
                                hls.recoverMediaError();
                                break;
                            default:
                                errorText = i18n[currentLang].statusErrorUnknown.replace('{msg}', data.details);
                                // 保存当前状态，然后彻底清理
                                const currentUrl = currentVideoUrl;
                                // 先销毁HLS实例
                                hls.destroy();
                                hls = null;
                                // 彻底清除视频源，避免blob URL错误
                                el.video.src = '';
                                // 重置控制状态
                                el.pauseBtn.disabled = true;
                                el.fullscreenBtn.disabled = true;
                                el.pipBtn.disabled = true;
                                el.screenshotBtn.disabled = true;
                                break;
                        }
                    }
                    showStatus(errorText, 'error');
                });

                hls.loadSource(url);
            } else if (el.video.canPlayType('application/vnd.apple.mpegurl')) {
                el.video.src = url;
                el.video.addEventListener('loadedmetadata', () => {
                    hideLoading();
                    if (restorePosition) {
                        const savedTime = getPlayPosition(url);
                        if (savedTime > 0) el.video.currentTime = savedTime;
                    }
                    showStatus(i18n[currentLang].statusSuccessLoadNative, 'success');
                    el.fullscreenBtn.disabled = false;
                    el.pipBtn.disabled = !('pictureInPictureEnabled' in document);
                    el.screenshotBtn.disabled = false;
                    // 自动播放
                    el.video.play().then(() => {
                        el.pauseBtn.disabled = false;
                        showStatus(i18n[currentLang].statusSuccessPlay, 'success');
                    }).catch(err => {
                        // 自动播放失败时不报错，允许用户手动播放
                        console.log('自动播放失败，等待用户手动播放:', err.message);
                    });
                }, { once: true });
                
                // 添加错误处理，避免"The element has no supported sources"错误
                el.video.addEventListener('error', (e) => {
                    hideLoading();
                    const errorMsg = currentLang === 'zh-CN' ? '视频加载失败：无法播放此格式' : 'Video load failed: Format not supported';
                    showStatus(i18n[currentLang].statusErrorVideo.replace('{msg}', errorMsg), 'error');
                }, { once: true });
            } else {
                hideLoading();
                showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', '当前浏览器不支持播放 m3u8 格式'), 'error');
                // 确保视频元素没有无效的src
                el.video.src = '';
            }
        } catch (error) {
            hideLoading();
            showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', 'hls.js 加载失败'), 'error');
            addLog(`hls.js 加载失败：${error.message}`, 'error');
        }
    }
else {
    el.video.src = url;
    el.video.addEventListener('loadedmetadata', () => {
        hideLoading();
        if (restorePosition) {
            const savedTime = getPlayPosition(url);
            if (savedTime > 0) el.video.currentTime = savedTime;
        }
        showStatus(i18n[currentLang].statusSuccessLoad, 'success');
        el.fullscreenBtn.disabled = false;
        el.pipBtn.disabled = !('pictureInPictureEnabled' in document);
        el.screenshotBtn.disabled = false;
        // 自动播放
        el.video.play().then(() => {
            el.pauseBtn.disabled = false;
            showStatus(i18n[currentLang].statusSuccessPlay, 'success');
        }).catch(err => {
            // 自动播放失败时不报错，允许用户手动播放
            console.log('自动播放失败，等待用户手动播放:', err.message);
        });
    }, { once: true });

    el.video.addEventListener('error', (e) => {
        hideLoading();
        let errorMsg = '';
        const error = el.video.error;
        
        // 处理不同类型的视频错误
        if (error) {
            const errorCodes = {
                1: currentLang === 'zh-CN' ? '视频加载被中止' : 'Video load aborted',
                2: currentLang === 'zh-CN' ? '网络请求失败' : 'Network request failed',
                3: currentLang === 'zh-CN' ? '视频解码失败' : 'Video decoding failed',
                4: currentLang === 'zh-CN' ? '视频格式不支持' : 'Video format not supported',
                5: currentLang === 'zh-CN' ? '视频加载超时' : 'Video load timeout'
            };
            
            // 特殊处理 "has no supported sources" 错误
            if (error.message && error.message.includes('has no supported sources')) {
                errorMsg = currentLang === 'zh-CN' ? '视频没有有效的源' : 'The video has no supported sources';
            } else {
                errorMsg = errorCodes[error.code] || error.message || 'Unknown error';
            }
        } else {
            errorMsg = currentLang === 'zh-CN' ? '视频加载失败' : 'Video load failed';
        }
        
        const errorText = i18n[currentLang].statusErrorVideo.replace('{msg}', errorMsg);
        showStatus(errorText, 'error');
    }, { once: true });
}
}

// ========== 11. 快捷键（适配国际化） ==========
function initShortcutKeys() {
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === el.urlInput) return;

        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                if (el.video.paused && !isLoading) {
                    // 播放视频
                    el.video.play().then(() => {
                        el.pauseBtn.disabled = false;
                        showStatus(i18n[currentLang].statusSuccessPlay, 'success');
                    }).catch(err => {
                        showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
                    });
                } else {
                    el.pauseBtn.click();
                }
                break;
            case 'arrowright':
                e.preventDefault();
                el.video.currentTime = Math.min(el.video.currentTime + 5, el.video.duration);
                el.progressBar.style.width = `${(el.video.currentTime / el.video.duration) * 100}%`;
                break;
            case 'arrowleft':
                e.preventDefault();
                el.video.currentTime = Math.max(el.video.currentTime - 5, 0);
                el.progressBar.style.width = `${(el.video.currentTime / el.video.duration) * 100}%`;
                break;
            case 'arrowup':
                e.preventDefault();
                const newVolumeUp = Math.min(Number(el.video.volume) + 0.05, 1);
                el.video.volume = newVolumeUp;
                el.volumeSlider.value = newVolumeUp;
                break;
            case 'arrowdown':
                e.preventDefault();
                const newVolumeDown = Math.max(Number(el.video.volume) - 0.05, 0);
                el.video.volume = newVolumeDown;
                el.volumeSlider.value = newVolumeDown;
                break;
            case 'f':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'p':
                e.preventDefault();
                togglePictureInPicture();
                break;
            case 's':
                e.preventDefault();
                captureScreenshot();
                break;
            default:
                break;
        }
    });

    el.shortcutBtn.addEventListener('click', () => {
        el.shortcutTip.classList.add('show');
        clearTimeout(shortcutTimer);
        shortcutTimer = setTimeout(() => {
            el.shortcutTip.classList.remove('show');
        }, 5000);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== el.shortcutBtn && !el.shortcutTip.contains(e.target)) {
            clearTimeout(shortcutTimer);
            el.shortcutTip.classList.remove('show');
        }
    });

    addLog('初始化快捷键完成', 'info');
}

// 更新音量图标
function updateVolumeIcon() {
    const volume = el.video.volume;
    const icon = el.volumeIcon;
    
    if (el.video.muted || volume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

// ========== 12. 事件绑定 ==========
function bindEvents() {
    // 加载播放按钮
    el.loadPlayBtn.addEventListener('click', () => {
        const url = el.urlInput.value.trim();
        if (!currentVideoUrl || currentVideoUrl !== url) {
            // 加载新视频
            loadVideo(url);
        } else if (el.video.paused && !isLoading) {
            // 播放已有视频
            el.video.play().then(() => {
                el.pauseBtn.disabled = false;
                showStatus(i18n[currentLang].statusSuccessPlay, 'success');
            }).catch(err => {
                showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
            });
        }
    });

    el.pauseBtn.addEventListener('click', () => {
        el.video.pause();
        savePlayPosition(currentVideoUrl, el.video.currentTime);
        showStatus(i18n[currentLang].statusSuccessPause, 'success');
    });

    // 全屏
    el.fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
        const span = el.fullscreenBtn.querySelector('span');
        span.textContent = document.fullscreenElement ? 
            (currentLang === 'zh-CN' ? '退出全屏' : 'Exit Fullscreen') : 
            (currentLang === 'zh-CN' ? '全屏' : 'Fullscreen');
    });
    document.addEventListener('webkitfullscreenchange', () => {
        const span = el.fullscreenBtn.querySelector('span');
        span.textContent = document.webkitFullscreenElement ? 
            (currentLang === 'zh-CN' ? '退出全屏' : 'Exit Fullscreen') : 
            (currentLang === 'zh-CN' ? '全屏' : 'Fullscreen');
    });

    // 画中画
    el.pipBtn.addEventListener('click', togglePictureInPicture);
    el.video.addEventListener('enterpictureinpicture', () => {
        const span = el.pipBtn.querySelector('span');
        span.textContent = currentLang === 'zh-CN' ? '退出画中画' : 'Exit PiP';
    });
    el.video.addEventListener('leavepictureinpicture', () => {
        const span = el.pipBtn.querySelector('span');
        span.textContent = currentLang === 'zh-CN' ? '画中画' : 'PiP';
    });

    // 截图
    el.screenshotBtn.addEventListener('click', captureScreenshot);
    el.screenshotClose.addEventListener('click', () => {
        el.screenshotModal.classList.remove('show');
        el.screenshotImg.src = '';
    });
    el.screenshotModal.addEventListener('click', (e) => {
        if (e.target === el.screenshotModal) {
            el.screenshotModal.classList.remove('show');
            el.screenshotImg.src = '';
        }
    });

    // 音量
    el.volumeSlider.addEventListener('input', () => {
        el.video.volume = el.volumeSlider.value;
        el.video.muted = el.volumeSlider.value == 0;
        updateVolumeIcon();
    });
    
    // 音量图标点击切换静音
    el.volumeIcon.addEventListener('click', () => {
        el.video.muted = !el.video.muted;
        if (el.video.muted) {
            el.volumeSlider.value = 0;
        }
        updateVolumeIcon();
    });

    // 倍速
    el.speedSelect.addEventListener('change', () => {
        const speed = el.speedSelect.value;
        el.video.playbackRate = speed;
        savePlaybackSpeed(speed);
        showStatus(i18n[currentLang].statusSuccessSpeed.replace('{speed}', speed), 'success');
    });

    // 进度条
    el.video.addEventListener('timeupdate', () => {
        if (!el.video.duration) return;
        const percent = (el.video.currentTime / el.video.duration) * 100;
        el.progressBar.style.width = `${percent}%`;
    });

    el.video.addEventListener('progress', () => {
        if (el.video.buffered.length === 0) return;
        const bufferedEnd = el.video.buffered.end(el.video.buffered.length - 1);
        const loadedPercent = (bufferedEnd / el.video.duration) * 100;
        el.progressLoaded.style.width = `${loadedPercent}%`;
    });

    el.progressWrap.addEventListener('click', (e) => {
        if (!el.video.duration) return;
        const rect = el.progressWrap.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width);
        el.video.currentTime = percent * el.video.duration;
        el.progressBar.style.width = `${percent * 100}%`;
    });

    // 视频结束
    el.video.addEventListener('ended', () => {
        savePlayPosition(currentVideoUrl, 0);
        showStatus(i18n[currentLang].statusSuccessEnd, 'success');
    });

    // 回车加载
    el.urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') el.loadPlayBtn.click();
    });

    // 语言切换
    el.langSelect.addEventListener('change', (e) => {
        updateI18n(e.target.value);
    });

    // 主题切换
    el.themeSelect.addEventListener('change', (e) => {
        updateTheme(e.target.value);
    });

    // 缓存清理
    el.clearCacheBtn.addEventListener('click', clearCache);

    // 日志面板
    el.logHeader.addEventListener('click', () => {
        el.logBody.classList.toggle('show');
    });
    el.logClear.addEventListener('click', () => {
        el.logBody.innerHTML = '';
        addLog('日志已清空', 'info');
    });

    // 网络状态
    window.addEventListener('online', handleNetworkStatus);
    window.addEventListener('offline', handleNetworkStatus);

    // 页面关闭
    window.addEventListener('beforeunload', () => {
        if (currentVideoUrl) {
            savePlayPosition(currentVideoUrl, el.video.currentTime);
        }
        savePlaybackSpeed(el.video.playbackRate);
        addLog('页面即将关闭，保存播放状态', 'info');
    });
}

// ========== 13. 初始化 ==========
window.onload = () => {
    // 初始化日志面板
    addLog('播放器开始初始化', 'info');

    // 加载保存的主题
    const savedTheme = localStorage.getItem('playerTheme') || 'light';
    el.themeSelect.value = savedTheme;
    updateTheme(savedTheme);

    // 初始化国际化
    updateI18n(currentLang);

    // 初始化倍速
    const savedSpeed = getSavedPlaybackSpeed();
    el.speedSelect.value = savedSpeed;
    el.video.playbackRate = savedSpeed;

    // 初始化音量
    el.video.volume = el.volumeSlider.value;

    // 初始化快捷键
    initShortcutKeys();

    // 初始化移动端触摸事件
    initTouchEvents();

    // 绑定所有事件
    bindEvents();

    // 自动加载示例链接
    const defaultUrl = el.urlInput.value.trim();
    if (defaultUrl) {
        const savedTime = getPlayPosition(defaultUrl);
        loadVideo(defaultUrl, savedTime > 0);
    }

    addLog('播放器初始化完成', 'success');
};
