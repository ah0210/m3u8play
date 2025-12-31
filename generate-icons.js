const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 确保 icons 目录存在
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// 读取原始 SVG 文件
const svgContent = fs.readFileSync(path.join(iconsDir, 'icon.svg'), 'utf8');

// 定义需要生成的图标尺寸
const iconSizes = [
    { width: 96, height: 96, filename: 'icon-96x96.png' },
    { width: 192, height: 192, filename: 'icon-192x192.png' },
    { width: 192, height: 192, filename: 'icon-maskable-192x192.png' },
    { width: 512, height: 512, filename: 'icon-512x512.png' },
    { width: 512, height: 512, filename: 'icon-maskable-512x512.png' }
];

// 生成图标
async function generateIcons() {
    console.log('开始生成图标...');
    
    for (const size of iconSizes) {
        try {
            // 对于可遮罩图标，使用不同的处理方式
            let processedSvg = svgContent;
            if (size.filename.includes('maskable')) {
                // 可遮罩图标需要调整圆角
                processedSvg = svgContent.replace('rx="128"', 'rx="64"');
            }
            
            // 转换 SVG 为 PNG
            await sharp(Buffer.from(processedSvg))
                .resize(size.width, size.height)
                .png()
                .toFile(path.join(iconsDir, size.filename));
            
            console.log(`✅ 生成成功: ${size.filename}`);
        } catch (error) {
            console.error(`❌ 生成失败: ${size.filename}`, error.message);
        }
    }
    
    console.log('\n🎉 所有图标生成完成！');
    console.log('生成的图标位于 icons 目录下。');
}

// 检查 sharp 库是否安装
async function checkAndGenerate() {
    try {
        require('sharp');
        generateIcons();
    } catch (error) {
        console.log('正在安装 sharp 库...');
        const { execSync } = require('child_process');
        execSync('npm install sharp --save-dev', { stdio: 'inherit' });
        console.log('sharp 库安装完成，开始生成图标...');
        generateIcons();
    }
}

checkAndGenerate();
