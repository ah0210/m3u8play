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
// ========== 1. 使用外部国际化配置 ==========
// 国际化配置已移至 i18n.js 文件，通过 window.i18n 访问

// ========== 2. DOM 元素 & 全局变量 ==========
const el = {
    // 核心元素
    video: document.getElementById('video-player'),
    loadingMask: document.getElementById('loading-mask'),
    loadingText: document.getElementById('loading-text'),
    statusTip: document.getElementById('status-tip'),
    urlInput: document.getElementById('url-input'),
    urlClearBtn: document.getElementById('url-clear-btn'),
    loadPlayBtn: document.getElementById('load-play-btn'),
    loadPlayText: document.getElementById('load-play-text'),
    pauseBtn: document.getElementById('pause-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    pipBtn: document.getElementById('pip-btn'),
    screenshotBtn: document.getElementById('screenshot-btn'),
    shortcutBtn: document.getElementById('shortcut-btn'),
    clearCacheBtn: document.getElementById('clear-cache-btn'),
    historyBtn: document.getElementById('history-btn'),
    historyPanel: document.getElementById('history-panel'),
    historyHeader: document.getElementById('history-header'),
    historyTitle: document.getElementById('historyTitle'),
    historyClear: document.getElementById('history-clear'),
    historyExport: document.getElementById('history-export'),
    historyImport: document.getElementById('history-import'),
    historyImportInput: document.getElementById('history-import-input'),
    historyBody: document.getElementById('history-body'),
    historyEmpty: document.getElementById('history-empty'),
    sortRecentBtn: document.getElementById('sort-recent'),
    sortHotBtn: document.getElementById('sort-hot'),
    alignLeftBtn: document.getElementById('align-left'),
    alignCenterBtn: document.getElementById('align-center'),
    alignRightBtn: document.getElementById('align-right'),
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
    if (el.alignLabel) el.alignLabel.textContent = langConfig.alignLabel;
    if (el.loadPlayText) el.loadPlayText.textContent = langConfig.loadPlayBtn;
    if (el.pauseBtn) el.pauseBtn.innerHTML = `<i class="fas fa-pause"></i> <span>${langConfig.pauseBtn}</span>`;
    if (el.fullscreenBtn) el.fullscreenBtn.innerHTML = `<i class="fas fa-expand"></i> <span>${langConfig.fullscreenBtn}</span>`;
    if (el.pipBtn) el.pipBtn.innerHTML = `<i class="fas fa-expand-arrows-alt"></i> <span>${langConfig.pipBtn}</span>`;
    if (el.screenshotBtn) el.screenshotBtn.innerHTML = `<i class="fas fa-camera"></i> <span>${langConfig.screenshotBtn}</span>`;
    if (el.shortcutBtn) el.shortcutBtn.innerHTML = `<i class="fas fa-keyboard"></i> <span>${langConfig.shortcutBtn}</span>`;
    if (el.clearCacheBtn) el.clearCacheBtn.innerHTML = `<i class="fas fa-trash"></i> <span>${langConfig.clearCacheBtn}</span>`;
    if (el.historyBtn) el.historyBtn.innerHTML = `<i class="fas fa-history"></i> <span>${langConfig.historyBtn}</span>`;
    if (el.urlInput) el.urlInput.placeholder = langConfig.urlInputPlaceholder;
    if (el.shortcutTitle) el.shortcutTitle.textContent = langConfig.shortcutTitle;
    if (el.historyTitle) el.historyTitle.textContent = langConfig.historyTitle;
    if (el.historyClear) el.historyClear.textContent = langConfig.clearHistoryBtn;
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

// 播放历史管理
function savePlayHistory(url, time = 0) {
    if (!url) return;
    
    const historyKey = 'videoPlayHistoryList';
    const maxHistory = 120;
    
    // 获取现有历史记录
    const historyList = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // 查找是否已存在该记录
    const existingIndex = historyList.findIndex(item => item.url === url);
    let updatedList;
    
    if (existingIndex !== -1) {
        // 如果存在，更新记录
        const existingItem = historyList[existingIndex];
        const updatedItem = {
            ...existingItem,
            time: Math.round(time),
            duration: Math.round(el.video.duration || 0),
            date: new Date().toISOString(),
            playCount: (existingItem.playCount || 0) + 1 // 增加播放次数
        };
        
        // 移除旧记录
        const filteredList = historyList.filter((_, index) => index !== existingIndex);
        // 添加更新后的记录到开头
        updatedList = [updatedItem, ...filteredList];
    } else {
        // 如果不存在，创建新记录
        const historyItem = {
            url: url,
            title: url.split('/').pop().split('?')[0] || '未命名视频',
            time: Math.round(time),
            duration: Math.round(el.video.duration || 0),
            date: new Date().toISOString(),
            playCount: 1 // 初始播放次数为1
        };
        
        // 添加到历史记录开头
        updatedList = [historyItem, ...historyList];
    }
    
    // 限制最大记录数
    updatedList = updatedList.slice(0, maxHistory);
    
    // 保存到本地存储
    localStorage.setItem(historyKey, JSON.stringify(updatedList));
    addLog(`保存播放历史：${url}`, 'info');
    
    // 更新历史记录面板
    renderPlayHistory();
}

// 获取播放历史列表
function getPlayHistory() {
    const historyKey = 'videoPlayHistoryList';
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
}

// 清空播放历史
function clearPlayHistory() {
    const historyKey = 'videoPlayHistoryList';
    localStorage.removeItem(historyKey);
    renderPlayHistory();
    addLog('播放历史已清空', 'info');
    showStatus('播放历史已清空', 'success');
}

// 渲染播放历史面板
function renderPlayHistory() {
    const historyList = getPlayHistory();
    const historyBody = el.historyBody;
    const historyEmpty = el.historyEmpty;
    
    // 清空现有内容
    historyBody.innerHTML = '';
    
    if (historyList.length === 0) {
        // 显示空状态
        historyBody.appendChild(historyEmpty);
        historyEmpty.style.display = 'block';
    } else {
        // 隐藏空状态
        historyEmpty.style.display = 'none';
        
        // 获取当前排序方式
        const sortMode = localStorage.getItem('historySortMode') || 'recent';
        
        // 根据排序方式排序历史记录
        const sortedHistory = [...historyList];
        if (sortMode === 'hot') {
            // 按热度排序（播放次数多的排在前面）
            sortedHistory.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        } else {
            // 按时间排序（最新的排在前面）
            sortedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // 渲染历史记录
        sortedHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-content">
                    <div class="history-item-title-container">
                        <span class="history-item-title" data-url="${item.url}">${item.title}</span>
                        <button class="history-item-edit" title="编辑名称" data-url="${item.url}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="history-item-meta">
                        <span class="history-item-date">${new Date(item.date).toLocaleString()}</span>
                        <span class="history-item-time">播放至 ${formatTime(item.time)} / ${formatTime(item.duration)}</span>
                        <span class="history-item-playcount">播放 ${item.playCount || 1} 次</span>
                    </div>
                    <div class="history-item-url">${item.url}</div>
                </div>
                <div class="history-item-actions">
                    <button class="history-item-play" title="播放" data-url="${item.url}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="history-item-delete" title="删除" data-url="${item.url}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            historyBody.appendChild(historyItem);
        });
        
        // 添加事件监听器
        addHistoryItemListeners();
    }
}

// 为历史记录项添加事件监听器
function addHistoryItemListeners() {
    // 播放按钮事件
    document.querySelectorAll('.history-item-play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.closest('.history-item-play').dataset.url;
            el.urlInput.value = url;
            loadVideo(url);
        });
    });
    
    // 删除按钮事件
    document.querySelectorAll('.history-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.closest('.history-item-delete').dataset.url;
            deleteHistoryItem(url);
        });
    });
    
    // 编辑按钮事件
    document.querySelectorAll('.history-item-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.target.closest('.history-item-edit').dataset.url;
            editHistoryItem(url);
        });
    });
}

// 编辑历史记录项名称
function editHistoryItem(url) {
    const historyList = getPlayHistory();
    const item = historyList.find(item => item.url === url);
    if (!item) return;
    
    const newTitle = prompt('请输入新的名称：', item.title);
    if (newTitle !== null && newTitle.trim() !== '') {
        item.title = newTitle.trim();
        // 保存更新后的历史记录
        const historyKey = 'videoPlayHistoryList';
        localStorage.setItem(historyKey, JSON.stringify(historyList));
        renderPlayHistory();
        addLog(`编辑播放历史名称：${url} -> ${newTitle}`, 'info');
    }
}

// 导出播放历史
function exportPlayHistory() {
    const historyList = getPlayHistory();
    const dataStr = JSON.stringify(historyList, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-play-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL
    URL.revokeObjectURL(url);
    
    addLog('播放历史导出成功', 'info');
    showStatus('播放历史导出成功', 'success');
}

// 导入播放历史
function importPlayHistory(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedHistory = JSON.parse(e.target.result);
            if (!Array.isArray(importedHistory)) {
                throw new Error('导入的文件格式不正确');
            }
            
            // 获取现有历史记录
            const historyKey = 'videoPlayHistoryList';
            const existingHistory = getPlayHistory();
            const maxHistory = 120;
            
            // 创建URL到索引的映射，用于快速查找
            const urlMap = new Map();
            const mergedHistory = [];
            
            // 先处理现有历史记录，保存到映射中
            existingHistory.forEach(item => {
                urlMap.set(item.url, item);
                mergedHistory.push(item);
            });
            
            // 处理导入的历史记录
            importedHistory.forEach(importedItem => {
                if (importedItem.url && typeof importedItem === 'object') {
                    if (urlMap.has(importedItem.url)) {
                        // 如果已存在，合并播放次数和时间
                        const existingItem = urlMap.get(importedItem.url);
                        const mergedItem = {
                            ...existingItem,
                            // 取最新的时间
                            date: new Date(importedItem.date) > new Date(existingItem.date) ? importedItem.date : existingItem.date,
                            // 合并播放次数
                            playCount: (existingItem.playCount || 0) + (importedItem.playCount || 1)
                        };
                        
                        // 更新映射和数组
                        urlMap.set(importedItem.url, mergedItem);
                        const index = mergedHistory.findIndex(item => item.url === importedItem.url);
                        if (index !== -1) {
                            mergedHistory[index] = mergedItem;
                        }
                    } else {
                        // 如果不存在，添加新记录
                        const newItem = {
                            url: importedItem.url,
                            title: importedItem.title || importedItem.url.split('/').pop().split('?')[0] || '未命名视频',
                            time: importedItem.time || 0,
                            duration: importedItem.duration || 0,
                            date: importedItem.date || new Date().toISOString(),
                            playCount: importedItem.playCount || 1
                        };
                        
                        urlMap.set(importedItem.url, newItem);
                        mergedHistory.push(newItem);
                    }
                }
            });
            
            // 按日期排序，保留最新的记录
            mergedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
            const finalHistory = mergedHistory.slice(0, maxHistory);
            
            // 保存合并后的历史记录
            localStorage.setItem(historyKey, JSON.stringify(finalHistory));
            
            // 更新界面
            renderPlayHistory();
            
            addLog(`播放历史导入成功，共导入 ${importedHistory.length} 条记录`, 'info');
            showStatus(`播放历史导入成功，共导入 ${importedHistory.length} 条记录`, 'success');
        } catch (error) {
            addLog(`播放历史导入失败：${error.message}`, 'error');
            showStatus(`播放历史导入失败：${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// 删除单个历史记录项
function deleteHistoryItem(url) {
    const historyKey = 'videoPlayHistoryList';
    const historyList = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const updatedList = historyList.filter(item => item.url !== url);
    localStorage.setItem(historyKey, JSON.stringify(updatedList));
    renderPlayHistory();
    addLog(`删除播放历史：${url}`, 'info');
}

// 格式化时间（秒 -> mm:ss）
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 记忆播放位置 - 保留原有功能，同时保存到播放历史
function savePlayPosition(url, time) {
    if (!url || time < 5) return;
    
    // 保存播放位置到播放历史
    savePlayHistory(url, time);
    
    addLog(`保存播放位置：${url} -> ${Math.round(time)}秒`, 'info');
}

// 获取播放位置 - 保留原有功能
function getPlayPosition(url) {
    const historyList = getPlayHistory();
    const historyItem = historyList.find(item => item.url === url);
    const time = historyItem ? historyItem.time : 0;
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
                            // 记录播放历史
                            savePlayHistory(url);
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
                    // 记录播放历史
                    savePlayHistory(url);
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
        // 记录播放历史
        savePlayHistory(url);
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

    // URL 输入框清除按钮
    function updateUrlClearBtnVisibility() {
        if (el.urlInput.value.trim()) {
            el.urlClearBtn.classList.add('visible');
        } else {
            el.urlClearBtn.classList.remove('visible');
        }
    }

    // 初始检查
    updateUrlClearBtnVisibility();

    // 输入时更新
    el.urlInput.addEventListener('input', updateUrlClearBtnVisibility);

    // 清除按钮点击事件
    el.urlClearBtn.addEventListener('click', () => {
        el.urlInput.value = '';
        updateUrlClearBtnVisibility();
        el.urlInput.focus();
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

    // 播放历史
    el.historyBtn.addEventListener('click', () => {
        el.historyBody.classList.toggle('show');
        renderPlayHistory();
    });

    el.historyHeader.addEventListener('click', () => {
        el.historyBody.classList.toggle('show');
    });

    el.historyClear.addEventListener('click', clearPlayHistory);

    // 历史记录导入导出
    el.historyExport.addEventListener('click', exportPlayHistory);
    
    el.historyImport.addEventListener('click', () => {
        el.historyImportInput.click();
    });
    
    el.historyImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importPlayHistory(file);
            // 重置文件输入，允许重新选择同一文件
            e.target.value = '';
        }
    });
    
    // 历史记录排序
    function setHistorySortMode(mode) {
        // 保存排序方式到localStorage
        localStorage.setItem('historySortMode', mode);
        
        // 更新按钮状态
        el.sortRecentBtn.classList.remove('active');
        el.sortHotBtn.classList.remove('active');
        
        if (mode === 'recent') {
            el.sortRecentBtn.classList.add('active');
        } else if (mode === 'hot') {
            el.sortHotBtn.classList.add('active');
        }
        
        // 重新渲染历史记录
        renderPlayHistory();
        addLog(`播放历史排序方式已切换至 ${mode === 'recent' ? '最新' : '热度'}`, 'info');
    }
    
    // 排序按钮事件
    el.sortRecentBtn.addEventListener('click', () => {
        setHistorySortMode('recent');
    });
    
    el.sortHotBtn.addEventListener('click', () => {
        setHistorySortMode('hot');
    });
    
    // 初始化排序状态
    const savedSortMode = localStorage.getItem('historySortMode') || 'recent';
    setHistorySortMode(savedSortMode);
    
    // 对齐控制
    function setPlayerAlignment(align) {
        // 移除所有对齐类
        document.body.classList.remove('player-align-left', 'player-align-center', 'player-align-right');
        // 添加新的对齐类
        document.body.classList.add(`player-align-${align}`);
        
        // 移除所有按钮的active类
        el.alignLeftBtn.classList.remove('active');
        el.alignCenterBtn.classList.remove('active');
        el.alignRightBtn.classList.remove('active');
        
        // 添加当前对齐按钮的active类
        if (align === 'left') {
            el.alignLeftBtn.classList.add('active');
        } else if (align === 'center') {
            el.alignCenterBtn.classList.add('active');
        } else if (align === 'right') {
            el.alignRightBtn.classList.add('active');
        }
        
        // 保存到localStorage
        localStorage.setItem('playerAlignment', align);
        addLog(`播放器对齐方式已切换至 ${align === 'left' ? '左对齐' : align === 'center' ? '居中对齐' : '右对齐'}`, 'info');
    }
    
    // 对齐按钮事件
    el.alignLeftBtn.addEventListener('click', () => {
        setPlayerAlignment('left');
    });
    
    el.alignCenterBtn.addEventListener('click', () => {
        setPlayerAlignment('center');
    });
    
    el.alignRightBtn.addEventListener('click', () => {
        setPlayerAlignment('right');
    });
    
    // 加载保存的对齐方式
    const savedAlignment = localStorage.getItem('playerAlignment') || 'right';
    setPlayerAlignment(savedAlignment);

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
