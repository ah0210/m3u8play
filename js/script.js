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
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    pipBtn: document.getElementById('pip-btn'),
    screenshotBtn: document.getElementById('screenshot-btn'),
    shortcutBtn: document.getElementById('shortcut-btn'),
    clearCacheBtn: document.getElementById('clear-cache-btn'),
    helpBtn: document.getElementById('help-btn'),
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
    centerPlayBtn: document.getElementById('center-play-btn'),
    // 扩展元素
    screenshotModal: document.getElementById('screenshot-modal'),
    screenshotImg: document.getElementById('screenshot-img'),
    screenshotClose: document.getElementById('screenshot-close'),
    screenshotDownload: document.getElementById('screenshot-download'),
    helpModal: document.getElementById('help-modal'),
    helpClose: document.getElementById('help-close'),
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
    logClear: document.getElementById('log-clear'),
    // 侧边栏
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle')
};

let hls = null;
let isLoading = false;
let currentVideoUrl = '';
let reconnectTimer = null;
let shortcutTimer = null;
let touchTimer = null;
// 从localStorage读取保存的语言，默认中文
let currentLang = localStorage.getItem('playerLang') || 'zh-CN';
let currentTheme = 'light';
let saveHistoryTimer = null; // 保存历史记录的防抖定时器
const SAVE_HISTORY_DELAY = 2000; // 防抖延迟时间（毫秒）

// ========== 安全工具函数：输入过滤和XSS防护 ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    return escapeHtml(input);
}

// ========== 输入验证函数 ==========
function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    // 简单的URL格式验证
    try {
        const urlObj = new URL(url);
        // 只允许http和https协议
        return ['http:', 'https:'].includes(urlObj.protocol);
    } catch (error) {
        // 尝试处理相对URL或不完整URL，允许URL包含特殊字符
        return /^https?:\/\/.+\.(m3u8|mp4|webm|ogg|avi|mov|wmv)/i.test(url) || 
               /^https?:\/\/.+\/playlist\.m3u8/i.test(url);
    }
}

function isValidVideoUrl(url) {
    if (!isValidUrl(url)) {
        return false;
    }
    
    // 验证是否为视频格式，允许URL包含特殊字符
    const videoExtensions = ['.m3u8', '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ||
           /\/playlist\.m3u8/i.test(url);
}

// 验证导入的播放历史项格式
function isValidImportedItem(item) {
    if (!item || typeof item !== 'object') {
        return false;
    }
    
    // 必须包含url字段
    if (!item.url || typeof item.url !== 'string') {
        return false;
    }
    
    // 可选字段的类型验证
    if (item.title !== undefined && typeof item.title !== 'string') {
        return false;
    }
    
    if (item.time !== undefined && (typeof item.time !== 'number' || isNaN(item.time))) {
        return false;
    }
    
    if (item.duration !== undefined && (typeof item.duration !== 'number' || isNaN(item.duration))) {
        return false;
    }
    
    if (item.date !== undefined && typeof item.date !== 'string') {
        return false;
    }
    
    if (item.playCount !== undefined && (typeof item.playCount !== 'number' || isNaN(item.playCount))) {
        return false;
    }
    
    return true;
}

// ========== 3. 工具函数：国际化 ==========
function updateI18n(lang) {
    currentLang = lang;
    // 保存语言到localStorage
    localStorage.setItem('playerLang', lang);
    const langConfig = i18n[lang];
    
    // 确保元素存在后再更新
    if (el.pageTitle) el.pageTitle.textContent = langConfig.pageTitle;
    if (el.langLabel) el.langLabel.textContent = langConfig.langLabel;
    if (el.themeLabel) el.themeLabel.textContent = langConfig.themeLabel;
    if (el.speedLabel) el.speedLabel.textContent = langConfig.speedLabel;
    if (el.qualityLabel) el.qualityLabel.textContent = langConfig.qualityLabel;
    if (el.alignLabel) el.alignLabel.textContent = langConfig.alignLabel;
    if (el.loadPlayText) el.loadPlayText.textContent = langConfig.loadPlayBtn;
    
    // 更新按钮内容，避免使用innerHTML
    const updateButtonContent = (btn, iconClass, text) => {
        if (!btn) return;
        btn.innerHTML = `<i class="${iconClass}"></i> <span>${escapeHtml(text)}</span>`;
    };
    
    updateButtonContent(el.pauseBtn, 'fas fa-pause', langConfig.pauseBtn);
    updateButtonContent(el.fullscreenBtn, 'fas fa-expand', langConfig.fullscreenBtn);
    updateButtonContent(el.pipBtn, 'fas fa-expand-arrows-alt', langConfig.pipBtn);
    updateButtonContent(el.screenshotBtn, 'fas fa-camera', langConfig.screenshotBtn);
    updateButtonContent(el.shortcutBtn, 'fas fa-keyboard', langConfig.shortcutBtn);
    updateButtonContent(el.clearCacheBtn, 'fas fa-trash', langConfig.clearCacheBtn);
    updateButtonContent(el.historyBtn, 'fas fa-history', langConfig.historyBtn);
    
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
function showStatus(text, type, options = {}) {
    // 验证参数
    if (typeof text !== 'string') {
        console.error('showStatus: text must be a string');
        return;
    }
    
    if (!el.statusTip) {
        console.error('showStatus: statusTip element not found');
        return;
    }
    
    const {
        duration = 3000,  // 默认显示3秒
        keepVisible = false,  // 是否保持可见
        logLevel = type === 'error' ? 'error' : 'success'  // 日志级别
    } = options;
    
    // 更新状态提示
    el.statusTip.textContent = text;
    el.statusTip.className = `status-tip show ${type}`;
    
    // 记录日志
    addLog(text, logLevel);

    // 自动隐藏，除非指定keepVisible为true
    if (!keepVisible) {
        // 清除之前的定时器
        if (window.statusTipTimer) {
            clearTimeout(window.statusTipTimer);
        }
        
        // 设置新的定时器
        window.statusTipTimer = setTimeout(() => {
            el.statusTip.classList.remove('show');
        }, duration);
    }
}

// ========== 7. 工具函数：加载遮罩 ==========
function showLoading(text = i18n[currentLang].loadingText) {
    isLoading = true;
    
    if (el.loadingMask && el.loadingText) {
        el.loadingMask.classList.add('show');
        el.loadingText.textContent = text;
        
        // 显示状态提示，但不自动隐藏
        showStatus(text, 'loading', {
            keepVisible: true,
            logLevel: 'info'
        });
        
        addLog(`开始加载：${text}`, 'info');
    }
}

function hideLoading() {
    isLoading = false;
    
    if (el.loadingMask) {
        el.loadingMask.classList.remove('show');
    }
    
    if (el.statusTip) {
        el.statusTip.classList.remove('show');
    }
    
    addLog('加载完成，隐藏遮罩', 'info');
}

// ========== 8. 功能：缓存清理 ==========
function clearCache() {
    // 显示确认窗口
    const confirmMessage = i18n[currentLang].confirmClearCache || '确定要清理所有播放器设置缓存吗？这将删除您的现有设定，只保留播放记录。';
    const confirmed = confirm(confirmMessage);
    
    if (!confirmed) {
        // 用户取消，不执行清理
        addLog('用户取消了缓存清理操作', 'info');
        return;
    }
    
    // 清除除播放记录外的所有播放器设置缓存
    localStorage.removeItem('playerPreferredSpeed');
    localStorage.removeItem('playerTheme');
    localStorage.removeItem('playerLang');
    localStorage.removeItem('playerVolume');
    localStorage.removeItem('playerMuted');
    localStorage.removeItem('playerQuality');
    localStorage.removeItem('historySortMode');
    localStorage.removeItem('playerAlignment');
    localStorage.removeItem('helpModalShown');
    localStorage.removeItem('lastPlayedVideoUrl');
    // 清除输入框
    if (el.urlInput) {
        el.urlInput.value = '';
    }
    
    // 重置播放器状态
    el.speedSelect.value = '1';
    el.video.playbackRate = 1;
    el.langSelect.value = 'zh-CN';
    el.volumeSlider.value = 0.5;
    el.video.volume = 0.5;
    el.video.muted = false;
    updateVolumeIcon();
    
    // 重置语言
    updateI18n('zh-CN');
    
    // 直接重置对齐方式，避免函数作用域问题
    document.body.classList.remove('player-align-left', 'player-align-center', 'player-align-right');
    document.body.classList.add('player-align-center');
    
    // 重置对齐按钮状态
    if (el.alignLeftBtn) el.alignLeftBtn.classList.remove('active');
    if (el.alignCenterBtn) el.alignCenterBtn.classList.add('active');
    if (el.alignRightBtn) el.alignRightBtn.classList.remove('active');
    
    // 重置排序方式
    if (el.sortRecentBtn && el.sortHotBtn) {
        el.sortRecentBtn.classList.add('active');
        el.sortHotBtn.classList.remove('active');
    }
    
    showStatus(i18n[currentLang].statusSuccessClearCache, 'success');
    addLog('已清理本地缓存（所有播放器设置）', 'success');
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

    // 从localStorage读取保存的画质
    const savedQuality = localStorage.getItem('playerQuality');
    if (savedQuality) {
        el.qualitySelect.value = savedQuality;
        hlsInstance.currentLevel = savedQuality === '' ? -1 : Number(savedQuality);
    }

    el.qualitySelect.addEventListener('change', () => {
        const selectedLevel = el.qualitySelect.value;
        hlsInstance.currentLevel = selectedLevel === '' ? -1 : Number(selectedLevel);
        // 保存画质到localStorage
        localStorage.setItem('playerQuality', selectedLevel);
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
            // 只修改span元素的textContent，不替换整个按钮内容
            const span = el.pipBtn.querySelector('span');
            if (span) {
                span.textContent = currentLang === 'zh-CN' ? '画中画' : 'PiP';
            }
            showStatus(i18n[currentLang].statusSuccessExitPip, 'success');
        }).catch(err => {
            showStatus(i18n[currentLang].statusErrorPip.replace('{action}', currentLang === 'zh-CN' ? '退出' : 'Exit ').replace('{msg}', err.message), 'error');
        });
    } else {
        el.video.requestPictureInPicture().then(() => {
            // 只修改span元素的textContent，不替换整个按钮内容
            const span = el.pipBtn.querySelector('span');
            if (span) {
                span.textContent = currentLang === 'zh-CN' ? '退出画中画' : 'Exit PiP';
            }
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
        // 只修改span元素的textContent，不替换整个按钮内容
        const span = el.fullscreenBtn.querySelector('span');
        if (span) {
            span.textContent = currentLang === 'zh-CN' ? '退出全屏' : 'Exit Fullscreen';
        }
        showStatus(i18n[currentLang].statusSuccessFullscreen, 'success');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        // 只修改span元素的textContent，不替换整个按钮内容
        const span = el.fullscreenBtn.querySelector('span');
        if (span) {
            span.textContent = currentLang === 'zh-CN' ? '全屏' : 'Fullscreen';
        }
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
async function savePlayHistory(url, time = 0) {
    try {
        if (typeof url !== 'string') {
            throw new TypeError('URL必须是字符串类型');
        }
        
        if (!url) return;
        
        // 验证URL是否有效
        if (!isValidUrl(url)) {
            addLog(`无效的URL，跳过保存播放历史：${url}`, 'warn');
            return;
        }
        
        // 验证time参数类型
        if (typeof time !== 'number' || isNaN(time)) {
            throw new TypeError('播放时间必须是数字类型');
        }
        
        // 使用防抖机制，避免频繁写入
        if (saveHistoryTimer) {
            clearTimeout(saveHistoryTimer);
        }
        
        saveHistoryTimer = setTimeout(async () => {
            try {
                // 获取现有记录
                const existingItem = await playHistoryStorage.getRecord(url);
                
                // 准备记录数据
                const historyItem = {
                    url: url,
                    title: existingItem ? existingItem.title : (url.split('/').pop().split('?')[0] || '未命名视频'),
                    time: Math.round(time),
                    duration: Math.round(el.video.duration || existingItem?.duration || 0),
                    date: new Date().toISOString(),
                    playCount: (existingItem?.playCount || 0) + 1
                };
                
                // 保存到IndexedDB
                await playHistoryStorage.saveRecord(historyItem);
                addLog(`保存播放历史：${url}`, 'info');
                
                // 更新历史记录面板
                await renderPlayHistory();
            } catch (error) {
                console.error('保存播放历史失败:', error);
                addLog(`保存播放历史失败：${error.message}`, 'error');
            }
        }, SAVE_HISTORY_DELAY);
    } catch (error) {
        console.error('savePlayHistory 函数执行异常:', error);
        addLog(`保存播放历史异常：${error.message}`, 'error');
    }
}

// 获取播放历史列表
async function getPlayHistory(sortBy = 'date', sortOrder = 'desc') {
    try {
        return await playHistoryStorage.getAllRecords({ sortBy, sortOrder });
    } catch (error) {
        console.error('获取播放历史失败:', error);
        return [];
    }
}

// 清空播放历史
async function clearPlayHistory() {
    try {
        await playHistoryStorage.clearAllRecords();
        await renderPlayHistory();
        addLog('播放历史已清空', 'info');
        showStatus('播放历史已清空', 'success');
    } catch (error) {
        console.error('清空播放历史失败:', error);
        showStatus('清空播放历史失败', 'error');
    }
}

// 渲染播放历史面板
async function renderPlayHistory(sortMode = null) {
    // 获取当前排序方式
    const currentSortMode = sortMode || localStorage.getItem('historySortMode') || 'recent';
    
    // 保存排序方式到localStorage
    localStorage.setItem('historySortMode', currentSortMode);
    
    // 确定排序参数
    let sortBy, sortOrder;
    if (currentSortMode === 'hot') {
        // 按热度排序（播放次数多的排在前面）
        sortBy = 'playCount';
        sortOrder = 'desc';
    } else {
        // 按时间排序（最新的排在前面）
        sortBy = 'date';
        sortOrder = 'desc';
    }
    
    // 更新排序按钮的active状态
    if (el.sortRecentBtn && el.sortHotBtn) {
        el.sortRecentBtn.classList.toggle('active', currentSortMode === 'recent');
        el.sortHotBtn.classList.toggle('active', currentSortMode === 'hot');
    }
    
    // 使用异步方式获取播放历史
    const historyList = await getPlayHistory(sortBy, sortOrder);
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
        
        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();
        
        // 渲染历史记录
        historyList.forEach(item => {
            const historyItem = document.createElement('div');
            // 为当前播放的视频添加突出显示类
            const isCurrentPlaying = currentVideoUrl === item.url;
            historyItem.className = `history-item ${isCurrentPlaying ? 'current-playing' : ''}`;
            
            // 格式化日期，只显示年月日和时分
            const formattedDate = new Date(item.date).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // 计算播放进度百分比
            const progressPercentage = item.duration > 0 ? Math.round((item.time / item.duration) * 100) : 0;
            
            // 安全渲染HTML，对所有用户输入进行过滤
            historyItem.innerHTML = `
                <div class="history-item-content">
                    <div class="history-item-title-container">
                        <span class="history-item-title" data-url="${escapeHtml(item.url)}">${escapeHtml(item.title)}</span>
                        <button class="history-item-edit" title="编辑名称" data-url="${escapeHtml(item.url)}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="history-item-meta">
                        <span class="history-item-date">${formattedDate}</span>
                        ${item.duration > 0 ? `<span class="history-item-time">播放进度：${formatTime(item.time)} / ${formatTime(item.duration)} (${progressPercentage}%)</span>` : ''}
                        <span class="history-item-playcount"><i class="fas fa-fire" style="color: #ff9800; margin-right: 4px;"></i>${item.playCount || 1}次播放</span>
                    </div>
                    <div class="history-item-url" title="${escapeHtml(item.url)}">${escapeHtml(item.url.length > 50 ? `${item.url.substring(0, 50)}...` : item.url)}</div>
                </div>
                <div class="history-item-actions">
                    <button class="history-item-play" title="播放" data-url="${escapeHtml(item.url)}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="history-item-delete" title="删除" data-url="${escapeHtml(item.url)}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            fragment.appendChild(historyItem);
        });
        
        // 一次性将所有元素添加到DOM中
        historyBody.appendChild(fragment);
    }
    
    // 无论列表是否为空，都添加事件监听器
    addHistoryItemListeners();
}

// 为历史记录项添加事件监听器
function addHistoryItemListeners() {
    // 使用事件委托替代单个元素的事件监听器
    const historyBody = el.historyBody;
    
    // 移除之前的事件监听器（防止重复添加）
    historyBody.removeEventListener('click', historyItemClickHandler);
    
    // 添加事件委托
    historyBody.addEventListener('click', historyItemClickHandler);
}

// 历史记录项点击事件处理函数
function historyItemClickHandler(e) {
    const target = e.target;
    
    // 处理播放按钮点击
    if (target.closest('.history-item-play')) {
        const url = target.closest('.history-item-play').dataset.url;
        el.urlInput.value = url;
        loadVideo(url);
        // 关闭播放列表
        if (el.historyBody) {
            el.historyBody.classList.remove('show');
        }
        // 关闭整个侧边栏
        if (el.sidebar) {
            el.sidebar.classList.remove('show');
        }
    }
    
    // 处理删除按钮点击
    else if (target.closest('.history-item-delete')) {
        const url = target.closest('.history-item-delete').dataset.url;
        deleteHistoryItem(url);
    }
    
    // 处理编辑按钮点击
    else if (target.closest('.history-item-edit')) {
        const url = target.closest('.history-item-edit').dataset.url;
        editHistoryItem(url);
    }
}

// 编辑历史记录项名称
async function editHistoryItem(url) {
    try {
        const item = await playHistoryStorage.getRecord(url);
        if (!item) return;
        
        const newTitle = prompt('请输入新的名称：', item.title);
        if (newTitle !== null && newTitle.trim() !== '') {
            item.title = newTitle.trim();
            // 保存更新后的历史记录
            await playHistoryStorage.saveRecord(item);
            await renderPlayHistory();
            addLog(`编辑播放历史名称：${url} -> ${newTitle}`, 'info');
        }
    } catch (error) {
        console.error('编辑播放历史失败:', error);
        showStatus('编辑播放历史失败', 'error');
    }
}

// 导出播放历史
async function exportPlayHistory() {
    try {
        const historyList = await getPlayHistory();
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
    } catch (error) {
        console.error('导出播放历史失败:', error);
        showStatus('导出播放历史失败', 'error');
    }
}

// 导入播放历史
async function importPlayHistory(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedHistory = JSON.parse(e.target.result);
            if (!Array.isArray(importedHistory)) {
                throw new Error('导入的文件格式不正确');
            }
            
            // 处理导入的历史记录
            let importedCount = 0;
            let skippedCount = 0;
            
            for (const importedItem of importedHistory) {
                // 验证导入项的基本结构
                if (!isValidImportedItem(importedItem)) {
                    skippedCount++;
                    continue;
                }
                
                // 验证URL是否有效
                if (!isValidUrl(importedItem.url)) {
                    skippedCount++;
                    continue;
                }
                
                // 获取现有记录
                const existingItem = await playHistoryStorage.getRecord(importedItem.url);
                
                // 准备合并后的记录
                const mergedItem = {
                    url: importedItem.url,
                    title: existingItem ? existingItem.title : (importedItem.title || importedItem.url.split('/').pop().split('?')[0] || '未命名视频'),
                    time: existingItem ? existingItem.time : (importedItem.time || 0),
                    duration: existingItem ? existingItem.duration : (importedItem.duration || 0),
                    date: existingItem ? existingItem.date : (importedItem.date || new Date().toISOString()),
                    playCount: (existingItem?.playCount || 0) + (importedItem.playCount || 1)
                };
                
                // 保存到IndexedDB
                await playHistoryStorage.saveRecord(mergedItem);
                importedCount++;
            }
            
            // 更新界面
            await renderPlayHistory();
            
            let message = `播放历史导入成功，共导入 ${importedCount} 条记录`;
            if (skippedCount > 0) {
                message += `，跳过 ${skippedCount} 条无效记录`;
            }
            
            addLog(message, 'info');
            showStatus(message, 'success');
        } catch (error) {
            addLog(`播放历史导入失败：${error.message}`, 'error');
            showStatus(`播放历史导入失败：${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// 删除单个历史记录项
async function deleteHistoryItem(url) {
    try {
        await playHistoryStorage.deleteRecord(url);
        await renderPlayHistory();
        addLog(`删除播放历史：${url}`, 'info');
    } catch (error) {
        console.error('删除播放历史失败:', error);
        showStatus('删除播放历史失败', 'error');
    }
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
async function getPlayPosition(url) {
    try {
        // 播放历史功能已移除，直接返回0
        return 0;
    } catch (error) {
        console.error('获取播放位置失败:', error);
        return 0;
    }
}

// 加载视频
async function loadVideo(url, restorePosition = false) {
    try {
        if (typeof url !== 'string') {
            throw new TypeError('URL必须是字符串类型');
        }
        
        if (!url || !url.trim()) {
            showStatus(i18n[currentLang].statusErrorUrl, 'error');
            return;
        }

        const trimmedUrl = url.trim();
        
        // 验证URL是否合法
        if (!isValidVideoUrl(trimmedUrl)) {
            showStatus('错误：请输入有效的视频URL（支持m3u8、mp4、webm、ogg、avi、mov、wmv格式）', 'error');
            addLog(`无效的视频URL：${trimmedUrl}`, 'error');
            return;
        }

    currentVideoUrl = trimmedUrl;
    // 保存最新播放的视频URL到localStorage
    localStorage.setItem('lastPlayedVideoUrl', trimmedUrl);
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

    // 使用includes而不是endsWith，允许URL包含特殊字符
    if (url.toLowerCase().includes('.m3u8')) {
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

                hls.on(Hls.Events.MANIFEST_PARSED, async () => {
                    hideLoading();
                    initQualitySelector(hls);
                    if (restorePosition) {
                                const savedTime = await getPlayPosition(url);
                                if (savedTime > 0) el.video.currentTime = savedTime;
                            }
                            showStatus(i18n[currentLang].statusSuccessLoad, 'success');
                            el.fullscreenBtn.disabled = false;
                            el.pipBtn.disabled = !('pictureInPictureEnabled' in document);
                            el.screenshotBtn.disabled = false;
                            // 记录播放历史
                            await savePlayHistory(url);
                            // 自动播放
                            el.video.play().catch(err => {
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
                el.video.addEventListener('loadedmetadata', async () => {
                    hideLoading();
                    if (restorePosition) {
                        const savedTime = await getPlayPosition(url);
                        if (savedTime > 0) el.video.currentTime = savedTime;
                    }
                    showStatus(i18n[currentLang].statusSuccessLoadNative, 'success');
                    el.fullscreenBtn.disabled = false;
                    el.pipBtn.disabled = !('pictureInPictureEnabled' in document);
                    el.screenshotBtn.disabled = false;
                    // 记录播放历史
                    await savePlayHistory(url);
                    // 自动播放
                    el.video.play().catch(err => {
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
    el.video.addEventListener('loadedmetadata', async () => {
        hideLoading();
        if (restorePosition) {
            const savedTime = await getPlayPosition(url);
            if (savedTime > 0) el.video.currentTime = savedTime;
        }
        showStatus(i18n[currentLang].statusSuccessLoad, 'success');
        el.fullscreenBtn.disabled = false;
        el.pipBtn.disabled = !('pictureInPictureEnabled' in document);
        el.screenshotBtn.disabled = false;
        // 记录播放历史
        await savePlayHistory(url);
        // 自动播放
                    el.video.play().catch(err => {
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
    } catch (error) {
        hideLoading();
        const errorMsg = `视频加载异常：${error.message || '未知错误'}`;
        showStatus(errorMsg, 'error');
        addLog(`视频加载异常：${error.message || '未知错误'}`, 'error');
        console.error('loadVideo 函数执行异常:', error);
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

// 控制居中播放按钮的显示和隐藏
function toggleCenterPlayBtn() {
    if (el.centerPlayBtn) {
        if (el.video.paused || el.video.ended) {
            el.centerPlayBtn.classList.remove('hide');
        } else {
            el.centerPlayBtn.classList.add('hide');
        }
    }
}

// ========== 12. 事件绑定 ==========
function bindEvents() {
    // 视频播放事件
    el.video.addEventListener('play', () => {
        // 更新播放按钮显示状态
        toggleCenterPlayBtn();
        showStatus(i18n[currentLang].statusSuccessPlay, 'success');
    });

    // 视频暂停事件
    el.video.addEventListener('pause', () => {
        savePlayPosition(currentVideoUrl, el.video.currentTime);
        // 更新播放按钮显示状态
        toggleCenterPlayBtn();
        showStatus(i18n[currentLang].statusSuccessPause, 'success');
    });

    // 视频结束事件
    el.video.addEventListener('ended', () => {
        savePlayPosition(currentVideoUrl, 0);
        // 更新播放按钮显示状态
        toggleCenterPlayBtn();
        showStatus(i18n[currentLang].statusSuccessEnd, 'success');
    });

    // 居中播放按钮点击事件
    el.centerPlayBtn.addEventListener('click', () => {
        if (isLoading) return;
        
        // 总是从输入框获取URL，确保播放最新输入的链接
        const inputUrl = el.urlInput.value.trim();
        
        if (!inputUrl) {
            // 输入框为空，显示错误提示
            showStatus(i18n[currentLang].statusErrorUrl, 'error');
        } else if (currentVideoUrl !== inputUrl) {
            // 输入的URL与当前播放的URL不同，加载新视频
            loadVideo(inputUrl);
        } else if (el.video.paused || el.video.ended) {
            // 输入的URL与当前播放的URL相同，且视频已暂停或结束，播放视频
            el.video.play().catch(err => {
                showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
            });
        } else {
            // 输入的URL与当前播放的URL相同，且视频正在播放，暂停视频
            el.video.pause();
        }
    });

    // 全屏
    el.fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
        const span = el.fullscreenBtn.querySelector('span');
        if (span) {
            span.textContent = document.fullscreenElement ? 
                (currentLang === 'zh-CN' ? '退出全屏' : 'Exit Fullscreen') : 
                (currentLang === 'zh-CN' ? '全屏' : 'Fullscreen');
        }
    });
    document.addEventListener('webkitfullscreenchange', () => {
        const span = el.fullscreenBtn.querySelector('span');
        if (span) {
            span.textContent = document.webkitFullscreenElement ? 
                (currentLang === 'zh-CN' ? '退出全屏' : 'Exit Fullscreen') : 
                (currentLang === 'zh-CN' ? '全屏' : 'Fullscreen');
        }
    });

    // 画中画
    el.pipBtn.addEventListener('click', togglePictureInPicture);
    el.video.addEventListener('enterpictureinpicture', () => {
        const span = el.pipBtn.querySelector('span');
        if (span) {
            span.textContent = currentLang === 'zh-CN' ? '退出画中画' : 'Exit PiP';
        }
    });
    el.video.addEventListener('leavepictureinpicture', () => {
        const span = el.pipBtn.querySelector('span');
        if (span) {
            span.textContent = currentLang === 'zh-CN' ? '画中画' : 'PiP';
        }
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
        // 保存音量到localStorage
        localStorage.setItem('playerVolume', el.volumeSlider.value);
        localStorage.setItem('playerMuted', el.video.muted);
        updateVolumeIcon();
    });
    
    // 音量图标点击切换静音
    el.volumeIcon.addEventListener('click', () => {
        el.video.muted = !el.video.muted;
        if (el.video.muted) {
            el.volumeSlider.value = 0;
        } else {
            el.volumeSlider.value = localStorage.getItem('playerVolume') || 0.5;
            el.video.volume = el.volumeSlider.value;
        }
        // 保存音量状态到localStorage
        localStorage.setItem('playerVolume', el.volumeSlider.value);
        localStorage.setItem('playerMuted', el.video.muted);
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
        // 更新播放按钮显示状态
        toggleCenterPlayBtn();
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
        if (e.key === 'Enter') {
            const url = el.urlInput.value.trim();
            if (url) {
                loadVideo(url);
            } else {
                showStatus(i18n[currentLang].statusErrorUrl, 'error');
            }
        }
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
    
    // 获得焦点时显示清除图标（如果有内容）
    el.urlInput.addEventListener('focus', updateUrlClearBtnVisibility);
    
    // 失去焦点时，如果输入框为空则隐藏清除图标
    el.urlInput.addEventListener('blur', updateUrlClearBtnVisibility);

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
    
    // 帮助弹窗
    if (el.helpBtn && el.helpModal && el.helpClose) {
        // 显示帮助弹窗
        el.helpBtn.addEventListener('click', () => {
            el.helpModal.classList.add('show');
            addLog('显示帮助弹窗', 'info');
        });
        
        // 关闭帮助弹窗 - 点击关闭按钮
        el.helpClose.addEventListener('click', closeHelpModal);
        
        // 点击弹窗外部关闭
        el.helpModal.addEventListener('click', (e) => {
            if (e.target === el.helpModal) {
                closeHelpModal();
            }
        });
        
        // 按Esc键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && el.helpModal.classList.contains('show')) {
                closeHelpModal();
            }
        });
    }

    // 侧边栏切换功能
    if (el.sidebarToggle && el.sidebar) {
        el.sidebarToggle.addEventListener('click', async () => {
            el.sidebar.classList.toggle('show');
            // 确保历史记录列表显示
            if (el.sidebar.classList.contains('show') && el.historyBody) {
                el.historyBody.classList.add('show');
            }
            // 渲染播放历史列表
            await renderPlayHistory();
            addLog('切换侧边栏显示状态', 'info');
        });
    }
    
    // 历史记录标题栏事件
    if (el.historyHeader) {
        el.historyHeader.addEventListener('click', () => {
            if (el.historyBody) {
                el.historyBody.classList.toggle('show');
            }
        });
    }
    
    // 清空播放历史
    if (el.historyClear) {
        el.historyClear.addEventListener('click', clearPlayHistory);
    }
    
    // 历史记录导入导出
    if (el.historyExport) {
        el.historyExport.addEventListener('click', exportPlayHistory);
    }
    
    if (el.historyImport && el.historyImportInput) {
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
    }
    
    // 历史记录排序
    if (el.sortRecentBtn && el.sortHotBtn) {
        // 排序按钮事件
        el.sortRecentBtn.addEventListener('click', async () => {
            await renderPlayHistory('recent');
        });
        
        el.sortHotBtn.addEventListener('click', async () => {
            await renderPlayHistory('hot');
        });
    }
    
    // 初始化居中播放按钮状态
    toggleCenterPlayBtn();
    
    // 视频点击事件：点击视频暂停/播放
    el.video.addEventListener('click', () => {
        if (isLoading) return;
        
        if (el.video.paused || el.video.ended) {
            // 播放视频
            el.video.play().catch(err => {
                showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
            });
        } else {
            // 暂停视频
            el.video.pause();
        }
    });
    
    // 对齐控制
    function setPlayerAlignment(align) {
        // 移除所有对齐类
        document.body.classList.remove('player-align-left', 'player-align-center', 'player-align-right');
        // 添加新的对齐类
        document.body.classList.add(`player-align-${align}`);
        
        // 移除所有按钮的active类
        if (el.alignLeftBtn) el.alignLeftBtn.classList.remove('active');
        if (el.alignCenterBtn) el.alignCenterBtn.classList.remove('active');
        if (el.alignRightBtn) el.alignRightBtn.classList.remove('active');
        
        // 添加当前对齐按钮的active类
        if (align === 'left' && el.alignLeftBtn) {
            el.alignLeftBtn.classList.add('active');
        } else if (align === 'center' && el.alignCenterBtn) {
            el.alignCenterBtn.classList.add('active');
        } else if (align === 'right' && el.alignRightBtn) {
            el.alignRightBtn.classList.add('active');
        }
        
        // 保存到localStorage
        localStorage.setItem('playerAlignment', align);
        addLog(`播放器对齐方式已切换至 ${align === 'left' ? '左对齐' : align === 'center' ? '居中对齐' : '右对齐'}`, 'info');
    }
    
    // 对齐按钮事件
    if (el.alignLeftBtn) {
        el.alignLeftBtn.addEventListener('click', () => {
            setPlayerAlignment('left');
        });
    }
    
    if (el.alignCenterBtn) {
        el.alignCenterBtn.addEventListener('click', () => {
            setPlayerAlignment('center');
        });
    }
    
    if (el.alignRightBtn) {
        el.alignRightBtn.addEventListener('click', () => {
            setPlayerAlignment('right');
        });
    }
    
    // 加载保存的对齐方式
    const savedAlignment = localStorage.getItem('playerAlignment') || 'center';
    setPlayerAlignment(savedAlignment);

    // 页面关闭
    window.addEventListener('beforeunload', () => {
        if (currentVideoUrl) {
            savePlayPosition(currentVideoUrl, el.video.currentTime);
            // 页面关闭时立即保存播放历史，不使用防抖
            savePlayHistory(currentVideoUrl, el.video.currentTime);
        }
        savePlaybackSpeed(el.video.playbackRate);
        addLog('页面即将关闭，保存播放状态', 'info');
    });
    
    // 视频结束时保存播放历史
    if (el.video) {
        el.video.addEventListener('ended', () => {
            if (currentVideoUrl) {
                savePlayHistory(currentVideoUrl, el.video.duration);
            }
        });
    }
}

// ========== 13. 初始化 ==========
window.onload = async () => {
    // 初始化日志面板
    addLog('播放器开始初始化', 'info');

    // 加载保存的主题
    const savedTheme = localStorage.getItem('playerTheme') || 'light';
    el.themeSelect.value = savedTheme;
    updateTheme(savedTheme);

    // 初始化国际化
    if (el.langSelect) {
        el.langSelect.value = currentLang;
    }
    updateI18n(currentLang);

    // 初始化倍速
    const savedSpeed = getSavedPlaybackSpeed();
    el.speedSelect.value = savedSpeed;
    el.video.playbackRate = savedSpeed;

    // 初始化音量
    const savedVolume = localStorage.getItem('playerVolume');
    const savedMuted = localStorage.getItem('playerMuted') === 'true';
    if (savedVolume) {
        el.volumeSlider.value = savedVolume;
        el.video.volume = savedVolume;
    } else {
        // 默认音量0.5
        el.volumeSlider.value = 0.5;
        el.video.volume = 0.5;
    }
    el.video.muted = savedMuted;
    updateVolumeIcon();

    // 初始化快捷键
    initShortcutKeys();

    // 初始化移动端触摸事件
    initTouchEvents();

    // 绑定所有事件
    bindEvents();

    // 处理 URL 参数，支持协议处理程序和 /play 路径
    const urlParams = new URLSearchParams(window.location.search);
    const protocolUrl = urlParams.get('url');
    let videoUrl = '';
    
    // 处理 /play 路径，提取视频 URL
    const pathname = window.location.pathname;
    if (pathname === '/play') {
        // 从查询参数中获取 URL
        if (protocolUrl) {
            videoUrl = protocolUrl;
            el.urlInput.value = videoUrl;
        } else {
            // 如果没有查询参数，使用默认示例链接
            videoUrl = el.urlInput.value.trim();
        }
    } else if (protocolUrl) {
        // 处理从协议处理程序传入的 URL
        // 如果 URL 包含协议前缀 web+video://，则提取真实 URL
        if (protocolUrl.startsWith('web+video://')) {
            // 提取真实 URL，移除协议前缀
            videoUrl = protocolUrl.replace(/^web\+video:\/\//, 'https://');
        } else {
            videoUrl = protocolUrl;
        }
        
        addLog(`从协议处理程序获取到视频 URL: ${videoUrl}`, 'info');
        el.urlInput.value = videoUrl;
    } else {
        // 自动加载示例链接
        videoUrl = el.urlInput.value.trim();
    }
    
    if (videoUrl) {
        const savedTime = await getPlayPosition(videoUrl);
        loadVideo(videoUrl, savedTime > 0);
    }

    // 检查是否需要自动显示帮助弹窗
    const helpModalShown = localStorage.getItem('helpModalShown');
    if (!helpModalShown && el.helpModal) {
        // 首次打开，自动显示帮助弹窗
        setTimeout(() => {
            el.helpModal.classList.add('show');
            addLog('自动显示帮助弹窗', 'info');
        }, 1000); // 延迟1秒显示，确保页面完全加载
    }
    
    // 恢复上次播放的视频URL到输入框，如果没有则使用默认地址
    const defaultUrl = 'https://rt-glb.rttv.com/dvr/rtnews/playlist_4500Kb.m3u8';
    const lastPlayedUrl = localStorage.getItem('lastPlayedVideoUrl');
    if (lastPlayedUrl && el.urlInput) {
        el.urlInput.value = lastPlayedUrl;
        addLog(`已恢复上次播放的视频URL：${lastPlayedUrl}`, 'info');
    } else if (el.urlInput) {
        // 没有最新播放记录，使用默认地址
        el.urlInput.value = defaultUrl;
        addLog(`使用默认视频URL：${defaultUrl}`, 'info');
    }
    
    addLog('播放器初始化完成', 'success');
};

// 关闭帮助弹窗时记录到缓存
function closeHelpModal() {
    if (el.helpModal) {
        el.helpModal.classList.remove('show');
        // 记录到缓存，标记弹窗已显示
        localStorage.setItem('helpModalShown', 'true');
        addLog('关闭帮助弹窗并记录到缓存', 'info');
    }
}
