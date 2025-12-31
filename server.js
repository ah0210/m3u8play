#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// PID 文件路径
const pidFile = path.join(__dirname, '.server.pid');

// 检查命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'start';

if (command === 'stop') {
    // 停止服务
    stopServer();
} else {
    // 启动服务
    startServer();
}

function startServer() {
    // 检查是否已经在运行
    if (fs.existsSync(pidFile)) {
        const existingPid = parseInt(fs.readFileSync(pidFile, 'utf8'));
        try {
            // 检查进程是否存在
            process.kill(existingPid, 0);
            console.log('\x1b[33m⚠️  服务器已经在运行中 (PID: %s)\x1b[0m', existingPid);
            console.log('\x1b[32m🚀  访问地址: http://localhost:3000\x1b[0m');
            process.exit(0);
        } catch (e) {
            // 进程不存在，删除旧的PID文件
            fs.unlinkSync(pidFile);
        }
    }

    console.log('\x1b[34m📦  启动本地服务器...\x1b[0m');
    
    // 简化启动逻辑，使用cmd.exe /c或shell执行serve命令
    // 这样可以确保在所有平台上都能正确运行
    let server;
    
    // 使用更可靠的方式启动serve，兼容Windows和Unix系统
    
    // 检查是否存在本地serve
    const servePath = path.join(__dirname, 'node_modules', '.bin', 'serve');
    const serveCmdPath = path.join(__dirname, 'node_modules', '.bin', 'serve.cmd');
    const hasLocalServe = fs.existsSync(servePath) || fs.existsSync(serveCmdPath);
    
    if (hasLocalServe) {
        // 使用本地serve
        const cmd = process.platform === 'win32' ? 'cmd.exe' : process.execPath;
        const args = process.platform === 'win32' ? 
            ['/c', 'npx', 'serve', '-s', '.', '-l', '3000', '--single'] : 
            [servePath, '-s', '.', '-l', '3000', '--single'];
        
        server = spawn(cmd, args, {
            cwd: __dirname,
            stdio: ['inherit', 'inherit', 'inherit'],
            shell: false
        });
    } else {
        // 降级使用npx serve
        const cmd = process.platform === 'win32' ? 'cmd.exe' : process.execPath;
        const args = process.platform === 'win32' ? 
            ['/c', 'npx', 'serve', '-s', '.', '-l', '3000', '--single'] : 
            ['-e', 'npx', 'serve', '-s', '.', '-l', '3000', '--single'];
        
        server = spawn(cmd, args, {
            cwd: __dirname,
            stdio: ['inherit', 'inherit', 'inherit'],
            shell: false
        });
    }
    
    // 保存当前Node.js进程的PID到文件
    // 注意：这是当前脚本的PID，不是serve进程的PID
    fs.writeFileSync(pidFile, process.pid.toString());
    console.log('\x1b[32m✅  服务器已成功启动 (PID: %s)\x1b[0m', process.pid);
    console.log('\x1b[32m🚀  访问地址: http://localhost:3000\x1b[0m');
    console.log('\x1b[32m📖  停止服务器: npm run stop\x1b[0m');
    
    // 处理serve进程退出
    server.on('close', (code) => {
        console.log('\x1b[33m📤  服务器已关闭 (退出码: %s)\x1b[0m', code);
        // 删除PID文件
        if (fs.existsSync(pidFile)) {
            fs.unlinkSync(pidFile);
        }
        // 退出当前脚本
        process.exit(code);
    });
    
    // 处理信号
    process.on('SIGINT', () => {
        stopServer();
    });
    
    process.on('SIGTERM', () => {
        stopServer();
    });
}

function stopServer() {
    // 首先检查PID文件
    if (!fs.existsSync(pidFile)) {
        console.log('\x1b[33m⚠️  服务器没有在运行\x1b[0m');
        process.exit(0);
    }
    
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
    
    // 尝试发送SIGTERM信号给主进程
    try {
        process.kill(pid, 'SIGTERM');
        console.log('\x1b[32m✅  已发送停止信号给服务器进程 (PID: %s)\x1b[0m', pid);
    } catch (e) {
        // 如果主进程已经不存在，忽略错误
        if (e.code !== 'ESRCH') {
            console.log('\x1b[33m⚠️  发送停止信号失败: %s\x1b[0m', e.message);
        }
    }
    
    // 删除PID文件
    try {
        fs.unlinkSync(pidFile);
        console.log('\x1b[32m✅  已清理PID文件\x1b[0m');
    } catch (e) {
        console.error('\x1b[31m[Error] 清理PID文件失败: %s\x1b[0m', e.message);
    }
    
    // Windows系统特殊处理
    if (process.platform === 'win32') {
        // 使用更可靠的方式终止所有node进程
        // 仅终止与当前项目相关的node进程
        const currentDir = __dirname.replace(/\\/g, '').toLowerCase();
        
        // 延迟执行，确保主进程有时间处理SIGTERM信号
        setTimeout(() => {
            // 使用tasklist和findstr查找相关进程，避免wmic的复杂输出
            exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', (err, stdout) => {
                if (!err) {
                    // 解析CSV输出
                    const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');
                    
                    lines.forEach(line => {
                        try {
                            // 简单解析CSV，提取PID和命令行
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                const processPid = parts[1].replace(/"/g, '');
                                
                                // 只处理数字PID
                                if (/^\d+$/.test(processPid)) {
                                    // 尝试终止进程，但忽略所有错误
                                    exec(`taskkill /F /PID ${processPid}`, (killErr) => {
                                        // 不输出任何错误，保持终端清洁
                                    });
                                }
                            }
                        } catch (parseErr) {
                            // 忽略解析错误
                        }
                    });
                    
                    console.log('\x1b[32m✅  服务器清理完成\x1b[0m');
                } else {
                    console.log('\x1b[32m✅  服务器清理完成\x1b[0m');
                }
            });
        }, 500);
    } else {
        // Unix系统：使用pkill终止所有相关进程
        exec('pkill -f "node ./server.js"', (err) => {
            if (err && err.code !== 1) {
                console.error('\x1b[31m[Error] %s\x1b[0m', err.message);
            }
        });
        
        exec('pkill -f "serve -s . -l 3000"', (err) => {
            if (err && err.code !== 1) {
                console.error('\x1b[31m[Error] %s\x1b[0m', err.message);
            }
        });
        
        console.log('\x1b[32m✅  服务器清理完成\x1b[0m');
    }
}
