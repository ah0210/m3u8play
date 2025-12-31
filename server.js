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
    
    // 检查是否安装了serve
    const servePath = path.join(__dirname, 'node_modules', '.bin', 'serve');
    const hasLocalServe = fs.existsSync(servePath);
    
    const serveCommand = hasLocalServe ? servePath : 'npx serve';
    const serveArgs = hasLocalServe ? ['-s', '.', '-l', '3000', '--single'] : ['-s', '.', '-l', '3000', '--single'];
    
    // 启动serve服务器
    const server = spawn(serveCommand, serveArgs, {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: !hasLocalServe // 使用shell执行npx命令
    });
    
    // 保存PID到文件
    fs.writeFileSync(pidFile, server.pid.toString());
    
    console.log('\x1b[32m✅  服务器已成功启动 (PID: %s)\x1b[0m', server.pid);
    console.log('\x1b[32m🚀  访问地址: http://localhost:3000\x1b[0m');
    console.log('\x1b[32m📖  停止服务器: npm run stop\x1b[0m');
    
    // 处理输出
    server.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
            console.log('\x1b[36m[Server] %s\x1b[0m', output);
        }
    });
    
    server.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
            console.error('\x1b[31m[Error] %s\x1b[0m', error);
        }
    });
    
    // 处理退出
    server.on('close', (code) => {
        console.log('\x1b[33m📤  服务器已关闭 (退出码: %s)\x1b[0m', code);
        // 删除PID文件
        if (fs.existsSync(pidFile)) {
            fs.unlinkSync(pidFile);
        }
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
    if (!fs.existsSync(pidFile)) {
        console.log('\x1b[33m⚠️  服务器没有在运行\x1b[0m');
        process.exit(0);
    }
    
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
    
    try {
        // 发送SIGTERM信号
        process.kill(pid, 'SIGTERM');
        console.log('\x1b[32m✅  服务器已成功停止 (PID: %s)\x1b[0m', pid);
        
        // 删除PID文件
        fs.unlinkSync(pidFile);
        
        // 清理可能的子进程
        if (process.platform === 'win32') {
            // Windows系统
            exec(`taskkill /F /PID ${pid} /T`, (err, stdout, stderr) => {
                if (err && !stderr.includes('找不到进程')) {
                    console.error('\x1b[31m[Error] %s\x1b[0m', stderr);
                }
            });
        } else {
            // Unix系统
            exec(`pkill -P ${pid}`, (err) => {
                if (err && err.code !== 1) { // 退出码1表示没有找到子进程
                    console.error('\x1b[31m[Error] %s\x1b[0m', err.message);
                }
            });
        }
    } catch (e) {
        console.log('\x1b[33m⚠️  停止服务器失败: %s\x1b[0m', e.message);
        // 删除无效的PID文件
        if (e.code === 'ESRCH') {
            fs.unlinkSync(pidFile);
            console.log('\x1b[33m⚠️  清理了无效的PID文件\x1b[0m');
        }
        process.exit(1);
    }
}
