/**
 * IndexedDB存储封装，替代localStorage，优化播放记录存储性能
 */

class PlayHistoryStorage {
    constructor() {
        this.dbName = 'videoPlayerDB';
        this.storeName = 'playHistory';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * 打开或创建IndexedDB数据库
     * @returns {Promise<IDBDatabase>} 数据库实例
     */
    async openDB() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                
                // 创建对象存储，使用url作为主键
                if (!this.db.objectStoreNames.contains(this.storeName)) {
                    const store = this.db.createObjectStore(this.storeName, {
                        keyPath: 'url',
                        autoIncrement: false
                    });
                    
                    // 创建索引，加速查询
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('playCount', 'playCount', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB打开失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * 保存或更新播放记录
     * @param {Object} record 播放记录
     * @returns {Promise<void>}
     */
    async saveRecord(record) {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.put(record);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        } catch (error) {
            console.error('保存播放记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有播放记录
     * @param {Object} options 排序和分页选项
     * @returns {Promise<Array>} 播放记录数组
     */
    async getAllRecords(options = {}) {
        const { sortBy = 'date', sortOrder = 'desc', limit = 120 } = options;
        
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index(sortBy);
            
            return new Promise((resolve, reject) => {
                const records = [];
                // 将 asc/desc 转换为 IDBCursorDirection 有效值
            const cursorDirection = sortOrder === 'asc' ? 'next' : 'prev';
            const request = index.openCursor(null, cursorDirection);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && records.length < limit) {
                        records.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(records);
                    }
                };
                
                request.onerror = reject;
            });
        } catch (error) {
            console.error('获取播放记录失败:', error);
            return [];
        }
    }

    /**
     * 获取单个播放记录
     * @param {string} url 视频URL
     * @returns {Promise<Object|null>} 播放记录
     */
    async getRecord(url) {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.get(url);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = reject;
            });
        } catch (error) {
            console.error('获取单个播放记录失败:', error);
            return null;
        }
    }

    /**
     * 删除单个播放记录
     * @param {string} url 视频URL
     * @returns {Promise<void>}
     */
    async deleteRecord(url) {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.delete(url);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        } catch (error) {
            console.error('删除播放记录失败:', error);
            throw error;
        }
    }

    /**
     * 清空所有播放记录
     * @returns {Promise<void>}
     */
    async clearAllRecords() {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            
            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        } catch (error) {
            console.error('清空播放记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取记录数量
     * @returns {Promise<number>} 记录数量
     */
    async getRecordCount() {
        try {
            const db = await this.openDB();
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.count();
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = reject;
            });
        } catch (error) {
            console.error('获取记录数量失败:', error);
            return 0;
        }
    }
}

// 导出单例实例
const playHistoryStorage = new PlayHistoryStorage();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayHistoryStorage;
} else {
    window.playHistoryStorage = playHistoryStorage;
}