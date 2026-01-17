// 动态加载 hls.js，仅在需要时加载
let Hls = null;
let hlsLoaded = false;

// 确保i18n可用
if (typeof window.i18n === 'undefined') {
    console.error('i18n is not defined');
}

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
    playlistBtn: document.getElementById('playlist-btn'),
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
    playlistModal: document.getElementById('playlist-modal'),
    playlistClose: document.getElementById('playlist-close'),
    playlistModalTitle: document.getElementById('playlistModalTitle'),
    playlistFileBtn: document.getElementById('playlist-file-btn'),
    playlistFileBtnText: document.getElementById('playlistFileBtnText'),
    playlistFileInput: document.getElementById('playlist-file-input'),
    playlistImportBtn: document.getElementById('playlist-import-btn'),
    playlistImportBtnText: document.getElementById('playlistImportBtnText'),
    playlistClearBtn: document.getElementById('playlist-clear-btn'),
    playlistClearBtnText: document.getElementById('playlistClearBtnText'),
    playlistTextarea: document.getElementById('playlist-textarea'),
    playlistList: document.getElementById('playlist-list'),
    playlistEmpty: document.getElementById('playlist-empty'),
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
    sidebarToggle: document.getElementById('sidebar-toggle'),
    historySidebarToggle: document.getElementById('history-sidebar-toggle')
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

function getPlayHistoryStorage() {
    return window.playHistoryStorage || null;
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

const PLAYLIST_STORAGE_KEY = 'playerPlaylist_v1';

function getPlaylistState() {
    try {
        const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
        if (!raw) {
            return { version: 1, epgUrls: [], items: [] };
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { version: 1, epgUrls: [], items: [] };
        }
        const epgUrls = Array.isArray(parsed.epgUrls) ? parsed.epgUrls.filter(u => typeof u === 'string') : [];
        const items = Array.isArray(parsed.items) ? parsed.items.filter(it => it && typeof it === 'object') : [];
        return { version: 1, epgUrls, items };
    } catch {
        return { version: 1, epgUrls: [], items: [] };
    }
}

function savePlaylistState(state) {
    const next = {
        version: 1,
        epgUrls: Array.isArray(state?.epgUrls) ? state.epgUrls : [],
        items: Array.isArray(state?.items) ? state.items : []
    };
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(next));
}

function stripWrappingQuotes(text) {
    if (typeof text !== 'string') return '';
    const t = text.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return t.slice(1, -1).trim();
    }
    return t;
}

function sanitizeM3uLine(line) {
    if (typeof line !== 'string') return '';
    return stripWrappingQuotes(line.replace(/`/g, '').trim());
}

function toPlayableUrl(rawUrl) {
    const cleaned = sanitizeM3uLine(rawUrl);
    if (!cleaned) return '';
    const dollarIndex = cleaned.indexOf('$');
    return (dollarIndex >= 0 ? cleaned.slice(0, dollarIndex) : cleaned).trim();
}

function parseM3U(text) {
    const normalized = typeof text === 'string' ? text.replace(/\r\n?/g, '\n') : '';
    const lines = normalized.split('\n');
    const items = [];
    const epgUrls = new Set();
    let pending = null;

    for (const rawLine of lines) {
        const line = sanitizeM3uLine(rawLine);
        if (!line) continue;

        if (line.startsWith('#EXTM3U')) {
            const urls = line.match(/https?:\/\/[^\s",]+/g) || [];
            urls.forEach(u => epgUrls.add(u));
            continue;
        }

        if (line.startsWith('#EXTINF')) {
            const attrs = {};
            line.replace(/([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => {
                attrs[k] = v;
                return '';
            });
            const commaIndex = line.lastIndexOf(',');
            const displayName = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : '';
            pending = { attrs, displayName };
            continue;
        }

        if (line.startsWith('#')) continue;

        const url = toPlayableUrl(line);
        if (!url) continue;

        const title = pending?.displayName || pending?.attrs?.['tvg-name'] || url;
        const item = {
            title,
            url,
            rawUrl: sanitizeM3uLine(line),
            group: pending?.attrs?.['group-title'] || '',
            logo: pending?.attrs?.['tvg-logo'] || '',
            tvgId: pending?.attrs?.['tvg-id'] || '',
            tvgName: pending?.attrs?.['tvg-name'] || ''
        };
        items.push(item);
        pending = null;
    }

    const deduped = [];
    const seen = new Set();
    for (const item of items) {
        if (!item?.url || typeof item.url !== 'string') continue;
        if (!isValidUrl(item.url)) continue;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        deduped.push(item);
    }

    return { epgUrls: Array.from(epgUrls), items: deduped };
}

function mergePlaylist(parsed) {
    const state = getPlaylistState();
    const existing = new Set(state.items.map(it => it?.url).filter(Boolean));

    for (const item of parsed.items || []) {
        if (!item?.url || existing.has(item.url)) continue;
        state.items.push(item);
        existing.add(item.url);
    }

    const epg = new Set(state.epgUrls);
    for (const u of parsed.epgUrls || []) {
        if (typeof u === 'string' && u) epg.add(u);
    }
    state.epgUrls = Array.from(epg);

    savePlaylistState(state);
    return state;
}

function clearPlaylist() {
    savePlaylistState({ version: 1, epgUrls: [], items: [] });
}

function renderPlaylist() {
    if (!el.playlistList || !el.playlistEmpty) return;
    const state = getPlaylistState();

    el.playlistList.innerHTML = '';

    if (!state.items.length) {
        el.playlistList.appendChild(el.playlistEmpty);
        el.playlistEmpty.style.display = 'block';
        return;
    }

    el.playlistEmpty.style.display = 'none';
    const fragment = document.createDocumentFragment();

    state.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'playlist-item';
        const title = escapeHtml(item.title || item.url);
        const urlText = escapeHtml(item.rawUrl || item.url);
        const urlForPlay = escapeHtml(item.url);
        const meta = item.group ? `<div class="playlist-item-meta">${escapeHtml(item.group)}</div>` : '';
        row.innerHTML = `
            <div class="playlist-item-content">
                <div class="playlist-item-title">${title}</div>
                ${meta}
                <div class="playlist-item-url" title="${urlText}">${urlText.length > 80 ? `${urlText.slice(0, 80)}...` : urlText}</div>
            </div>
            <div class="playlist-item-actions">
                <button class="playlist-item-play" title="播放" data-url="${urlForPlay}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
        fragment.appendChild(row);
    });

    el.playlistList.appendChild(fragment);
    addPlaylistListeners();
}

function playlistListClickHandler(e) {
    const target = e.target;
    const playBtn = target.closest('.playlist-item-play');
    if (!playBtn) return;

    const url = playBtn.dataset.url;
    if (!url) return;
    el.urlInput.value = url;
    loadVideo(url);
    closePlaylistModal();
}

function addPlaylistListeners() {
    if (!el.playlistList) return;
    el.playlistList.removeEventListener('click', playlistListClickHandler);
    el.playlistList.addEventListener('click', playlistListClickHandler);
}

function openPlaylistModal() {
    if (!el.playlistModal) return;
    el.playlistModal.classList.add('show');
    renderPlaylist();
}

function closePlaylistModal() {
    if (!el.playlistModal) return;
    el.playlistModal.classList.remove('show');
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error || new Error('read file failed'));
        reader.readAsText(file);
    });
}

function importM3uText(text) {
    const parsed = parseM3U(text);
    const prev = getPlaylistState();
    const prevCount = prev.items.length;
    const state = mergePlaylist(parsed);
    const addedCount = state.items.length - prevCount;

    renderPlaylist();

    const message = currentLang === 'zh-CN'
        ? `播放列表导入完成：新增 ${addedCount} 条，共 ${state.items.length} 条`
        : `Playlist imported: +${addedCount}, total ${state.items.length}`;
    showStatus(message, 'success');
}

function removeUrlFromPlaylist(url) {
    if (!url) return false;
    const state = getPlaylistState();
    const index = state.items.findIndex(it => it?.url === url);
    if (index < 0) return false;
    state.items.splice(index, 1);
    savePlaylistState(state);
    if (el.playlistModal?.classList.contains('show')) {
        renderPlaylist();
    }
    return true;
}

function autoRemovePlaylistUrlOnError(url) {
    const removed = removeUrlFromPlaylist(url);
    if (!removed) return;
    showStatus(
        currentLang === 'zh-CN' ? '播放失败，已从导入列表移除该地址' : 'Playback failed, removed from imported list',
        'error'
    );
}

async function exportPlayHistoryAsM3U() {
    const playHistoryStorage = getPlayHistoryStorage();
    if (!playHistoryStorage) {
        showStatus(currentLang === 'zh-CN' ? '播放历史不可用，无法导出' : 'Play history unavailable', 'error');
        return;
    }

    const historyList = await playHistoryStorage.getAllRecords({ sortBy: 'date', sortOrder: 'desc', limit: 10000 });
    if (!historyList.length) {
        showStatus(currentLang === 'zh-CN' ? '播放历史为空，无法导出' : 'Play history is empty', 'error');
        return;
    }

    const lines = ['#EXTM3U'];
    for (const item of historyList) {
        const title = item?.title ? String(item.title) : String(item?.url || '');
        const url = item?.url ? String(item.url) : '';
        if (!url) continue;
        lines.push(`#EXTINF:-1,${title}`);
        lines.push(url);
    }

    const text = lines.join('\n') + '\n';
    const blob = new Blob([text], { type: 'audio/x-mpegurl;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `play-history-${new Date().toISOString().slice(0, 10)}.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    showStatus(currentLang === 'zh-CN' ? '已导出播放历史为 M3U' : 'Exported play history as M3U', 'success');
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
    updateButtonContent(el.playlistBtn, 'fas fa-list', langConfig.playlistBtn);
    
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
    if (el.playlistModalTitle) el.playlistModalTitle.textContent = langConfig.playlistModalTitle;
    if (el.playlistFileBtnText) el.playlistFileBtnText.textContent = langConfig.playlistFileBtn;
    if (el.playlistImportBtnText) el.playlistImportBtnText.textContent = langConfig.playlistImportBtn;
    if (el.playlistClearBtnText) el.playlistClearBtnText.textContent = langConfig.playlistClearBtn;
    if (el.playlistTextarea) el.playlistTextarea.placeholder = langConfig.playlistTextareaPlaceholder;
    if (el.playlistEmpty) el.playlistEmpty.textContent = langConfig.playlistEmpty;

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
                    showStatus(i18n[currentLang].statusSuccessPlay, 'success');
                }).catch(err => {
                    showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
                });
            } else {
                el.video.pause();
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
                const playHistoryStorage = getPlayHistoryStorage();
                if (!playHistoryStorage) return;

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
        const playHistoryStorage = getPlayHistoryStorage();
        if (!playHistoryStorage) return [];
        return await playHistoryStorage.getAllRecords({ sortBy, sortOrder });
    } catch (error) {
        console.error('获取播放历史失败:', error);
        return [];
    }
}

// 清空播放历史
async function clearPlayHistory() {
    try {
        const playHistoryStorage = getPlayHistoryStorage();
        if (!playHistoryStorage) return;
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
        const playHistoryStorage = getPlayHistoryStorage();
        if (!playHistoryStorage) return;
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
            const playHistoryStorage = getPlayHistoryStorage();
            if (!playHistoryStorage) return;

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
        const playHistoryStorage = getPlayHistoryStorage();
        if (!playHistoryStorage) return;
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
                                autoRemovePlaylistUrlOnError(currentUrl);
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
                    autoRemovePlaylistUrlOnError(currentVideoUrl);
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
        autoRemovePlaylistUrlOnError(currentVideoUrl);
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

// ========== 11. 播放列表功能 ==========
// 导出播放列表
function exportPlaylist(playlistId) {
    // 这里需要实现从IndexedDB导出播放列表的功能
    const playlist = {
        id: playlistId,
        name: playlistId === 'default' ? '默认播放列表' : playlistId,
        history: []
    };
    
    const dataStr = JSON.stringify(playlist, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `播放列表_${playlist.name}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog(`导出播放列表：${playlist.name}`, 'success');
}

// 导入播放列表
function importPlaylist(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedPlaylist = JSON.parse(e.target.result);
            const playlistSelect = document.getElementById('playlist-select');
            
            // 支持两种格式：播放列表对象或播放历史数组
            if (importedPlaylist.id && importedPlaylist.name) {
                // 播放列表对象格式
                const option = document.createElement('option');
                option.value = importedPlaylist.id;
                option.textContent = importedPlaylist.name;
                playlistSelect.appendChild(option);
                
                // 保存到localStorage
                const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
                playlists.push({ id: importedPlaylist.id, name: importedPlaylist.name });
                localStorage.setItem('playlists', JSON.stringify(playlists));
                
                // 保存播放列表详细数据到IndexedDB
                savePlaylistToIndexedDB(importedPlaylist.id, importedPlaylist);
                
                addLog(`导入播放列表：${importedPlaylist.name}`, 'success');
            } else if (Array.isArray(importedPlaylist)) {
                // 播放历史数组格式
                const newPlaylistId = `imported_${Date.now()}`;
                const newPlaylistName = `导入的播放列表_${new Date().toISOString().slice(0, 10)}`;
                
                const option = document.createElement('option');
                option.value = newPlaylistId;
                option.textContent = newPlaylistName;
                playlistSelect.appendChild(option);
                
                // 保存到localStorage
                const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
                playlists.push({ id: newPlaylistId, name: newPlaylistName });
                localStorage.setItem('playlists', JSON.stringify(playlists));
                
                // 保存播放列表详细数据到IndexedDB
                savePlaylistToIndexedDB(newPlaylistId, importedPlaylist);
                
                addLog(`导入播放历史：${importedPlaylist.length}条记录，已创建新播放列表：${newPlaylistName}`, 'success');
            } else {
                throw new Error('导入的文件格式不正确');
            }
        } catch (error) {
            showStatus(`导入播放列表失败：${error.message}`, 'error');
            addLog(`导入播放列表失败：${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// 加载播放列表
async function loadPlaylist(playlistId) {
    const historyBody = document.getElementById('history-body');
    const historyEmpty = document.getElementById('history-empty');
    
    if (playlistId === 'default') {
        // 如果是默认播放列表，显示播放历史记录
        await renderPlayHistory();
        addLog(`切换到默认播放列表`, 'info');
        return;
    }
    
    // 否则从IndexedDB加载播放列表
    historyBody.innerHTML = '';
    
    const playHistory = await loadPlaylistFromIndexedDB(playlistId);
    
    if (playHistory.length === 0) {
        // 如果没有播放历史，显示"暂无播放历史"
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'history-empty';
        emptyDiv.textContent = '暂无播放历史';
        historyBody.appendChild(emptyDiv);
    } else {
        // 渲染播放历史
        playHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-title">${item.title || item.url}</div>
                <div class="history-item-time">${new Date(item.lastPlayed).toLocaleString()}</div>
                <button class="history-item-play" data-url="${item.url}">播放</button>
            `;
            historyBody.appendChild(historyItem);
        });
        
        // 添加播放按钮事件
        const playButtons = document.querySelectorAll('.history-item-play');
        playButtons.forEach(button => {
            button.addEventListener('click', () => {
                const url = button.getAttribute('data-url');
                loadVideo(url);
            });
        });
    }
    
    addLog(`加载播放列表：${playlistId}`, 'info');
}

// 保存播放列表到IndexedDB
function savePlaylistToIndexedDB(playlistId, playHistory) {
    // 这里需要实现将播放列表保存到IndexedDB的功能
    // 首先打开IndexedDB数据库
    const request = indexedDB.open('PlaylistDB', 1);
    
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建播放列表对象仓库
        if (!db.objectStoreNames.contains('playlists')) {
            db.createObjectStore('playlists', { keyPath: 'id' });
        }
    };
    
    request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction('playlists', 'readwrite');
        const store = transaction.objectStore('playlists');
        
        // 保存播放列表
        store.put({ id: playlistId, history: playHistory });
        
        transaction.oncomplete = () => {
            db.close();
            addLog(`保存播放列表到IndexedDB：${playlistId}`, 'success');
        };
        
        transaction.onerror = (event) => {
            addLog(`保存播放列表到IndexedDB失败：${event.target.error}`, 'error');
        };
    };
    
    request.onerror = (event) => {
        addLog(`打开IndexedDB失败：${event.target.error}`, 'error');
    };
}

// 从IndexedDB加载播放列表
async function loadPlaylistFromIndexedDB(playlistId) {
    // 这里需要实现从IndexedDB加载播放列表的功能
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PlaylistDB', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 创建播放列表对象仓库
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('playlists', 'readonly');
            const store = transaction.objectStore('playlists');
            
            // 加载播放列表
            const getRequest = store.get(playlistId);
            
            getRequest.onsuccess = (event) => {
                const playlist = event.target.result;
                const playHistory = playlist ? playlist.history : [];
                resolve(playHistory);
                db.close();
            };
            
            getRequest.onerror = (event) => {
                reject(event.target.error);
                db.close();
            };
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// ========== 12. 快捷键（适配国际化） ==========
function initShortcutKeys() {
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === el.urlInput) return;

        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                if (el.video.paused && !isLoading) {
                    // 播放视频
                    el.video.play().then(() => {
                        showStatus(i18n[currentLang].statusSuccessPlay, 'success');
                    }).catch(err => {
                        showStatus(i18n[currentLang].statusErrorUnknown.replace('{msg}', err.message), 'error');
                    });
                } else {
                    el.video.pause();
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

    // 快捷键功能已取消
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

    if (el.playlistBtn && el.playlistModal && el.playlistClose) {
        el.playlistBtn.addEventListener('click', () => {
            openPlaylistModal();
            addLog('打开播放列表', 'info');
        });

        el.playlistClose.addEventListener('click', closePlaylistModal);

        el.playlistModal.addEventListener('click', (e) => {
            if (e.target === el.playlistModal) {
                closePlaylistModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && el.playlistModal.classList.contains('show')) {
                closePlaylistModal();
            }
        });

        if (el.playlistFileBtn && el.playlistFileInput) {
            el.playlistFileBtn.addEventListener('click', () => {
                el.playlistFileInput.click();
            });

            el.playlistFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await readFileAsText(file);
                    if (el.playlistTextarea) {
                        el.playlistTextarea.value = text;
                    }
                    importM3uText(text);
                } catch (err) {
                    const msg = err?.message || String(err);
                    showStatus(currentLang === 'zh-CN' ? `读取文件失败：${msg}` : `Failed to read file: ${msg}`, 'error');
                } finally {
                    e.target.value = '';
                }
            });
        }

        if (el.playlistImportBtn && el.playlistTextarea) {
            el.playlistImportBtn.addEventListener('click', () => {
                const text = el.playlistTextarea.value || '';
                if (!text.trim()) {
                    showStatus(currentLang === 'zh-CN' ? '请先粘贴 M3U 内容' : 'Please paste M3U content first', 'error');
                    return;
                }
                importM3uText(text);
            });
        }

        if (el.playlistClearBtn) {
            el.playlistClearBtn.addEventListener('click', () => {
                clearPlaylist();
                renderPlaylist();
                showStatus(currentLang === 'zh-CN' ? '播放列表已清空' : 'Playlist cleared', 'success');
            });
        }
    }

    // 侧边栏切换功能
    if (el.historySidebarToggle && el.sidebar) {
        el.historySidebarToggle.addEventListener('click', async () => {
            el.sidebar.classList.toggle('hidden');
            // 确保历史记录列表显示
            if (!el.sidebar.classList.contains('hidden') && el.historyBody) {
                el.historyBody.classList.add('show');
            }
            // 渲染播放历史列表
            await renderPlayHistory();
            addLog('切换侧边栏显示状态', 'info');
        });
    }
    

    

    
    // 历史记录导入导出
    if (el.historyExport) {
        el.historyExport.addEventListener('click', exportPlayHistory);
    }
    
    // 播放列表导入导出
    const playlistImportBtn = document.getElementById('playlist-import');
    const playlistExportBtn = document.getElementById('playlist-export');
    const playlistSelect = document.getElementById('playlist-select');
    
    if (playlistImportBtn) {
        playlistImportBtn.addEventListener('click', () => {
            openPlaylistModal();
        });
    }
    
    if (playlistExportBtn) {
        playlistExportBtn.addEventListener('click', async () => {
            await exportPlayHistoryAsM3U();
        });
    }
    
    if (playlistSelect) {
        playlistSelect.addEventListener('change', async () => {
            const playlistId = playlistSelect.value;
            await loadPlaylist(playlistId);
            addLog(`切换到播放列表：${playlistId}`, 'info');
        });
    }
    
    // 调整手柄功能
    const resizeHandle = document.getElementById('resize-handle');
    const sidebar = document.getElementById('sidebar');
    const playerArea = document.querySelector('.player-area');
    
    if (resizeHandle && sidebar && playerArea) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.body.classList.add('resizing');
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const newWidth = startWidth + deltaX;
            
            // 限制最小宽度
            if (newWidth < 200) return;
            
            // 限制最大宽度
            if (newWidth > window.innerWidth / 2) return;
            
            sidebar.style.width = `${newWidth}px`;
            playerArea.style.width = `${window.innerWidth - newWidth - 5}px`;
            resizeHandle.style.left = `${newWidth}px`;
            playerArea.style.marginLeft = `${newWidth + 5}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.classList.remove('resizing');
        });
    }
    
    // 初始化播放列表
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    
    playlists.forEach(playlist => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = playlist.name;
        playlistSelect.appendChild(option);
    });
    
    // 初始化播放历史列表
    renderPlayHistory();
    
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
    
    // 加载播放历史记录列表
    await renderPlayHistory();
    // 确保历史记录列表显示
    if (el.historyBody) {
        el.historyBody.classList.add('show');
    }
    
    // 检查播放历史记录是否为空，如果为空则自动导入默认播放历史文件
    const playHistoryStorage = getPlayHistoryStorage();
    if (playHistoryStorage) {
        const historyList = await playHistoryStorage.getAllRecords();
        if (historyList.length === 0) {
            const hasAutoImported = localStorage.getItem('hasAutoImported');
            if (!hasAutoImported) {
                await autoImportDefaultPlaylist();
            }
        }
    }
    
    addLog('播放器初始化完成', 'success');
};

// 自动导入默认播放历史文件
async function autoImportDefaultPlaylist() {
    try {
        const response = await fetch('/play-history-2026-01-17.m3u');
        if (!response.ok) {
            throw new Error('文件不存在或无法访问');
        }
        
        const content = await response.text();
        const lines = content.split('\n');
        const playHistory = [];
        let currentTitle = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const parts = line.split(',');
                if (parts.length > 1) {
                    currentTitle = parts.slice(1).join(',').trim();
                }
            } else if (line && !line.startsWith('#')) {
                if (currentTitle && line) {
                    playHistory.push({
                        url: line,
                        title: currentTitle,
                        date: new Date().toISOString(),
                        time: 0,
                        duration: 0,
                        playCount: 1
                    });
                    currentTitle = '';
                }
            }
        }
        
        if (playHistory.length === 0) {
            throw new Error('没有找到有效的播放历史记录');
        }
        
        const playlistSelect = document.getElementById('playlist-select');
        const newPlaylistId = `auto_imported_${Date.now()}`;
        const newPlaylistName = `自动导入的播放列表_${new Date().toISOString().slice(0, 10)}`;
        
        const option = document.createElement('option');
        option.value = newPlaylistId;
        option.textContent = newPlaylistName;
        playlistSelect.appendChild(option);
        
        const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
        playlists.push({ id: newPlaylistId, name: newPlaylistName });
        localStorage.setItem('playlists', JSON.stringify(playlists));
        
        savePlaylistToIndexedDB(newPlaylistId, playHistory);
        
        addLog(`自动导入播放历史：${playHistory.length}条记录，已创建新播放列表：${newPlaylistName}`, 'success');
        localStorage.setItem('hasAutoImported', 'true');
    } catch (error) {
        addLog(`自动导入播放历史失败：${error.message}`, 'info');
    }
}

// 关闭帮助弹窗时记录到缓存
function closeHelpModal() {
    if (el.helpModal) {
        el.helpModal.classList.remove('show');
        // 记录到缓存，标记弹窗已显示
        localStorage.setItem('helpModalShown', 'true');
        addLog('关闭帮助弹窗并记录到缓存', 'info');
    }
}
