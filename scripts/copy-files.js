const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..');
const distDir = path.join(__dirname, '..', 'dist');

const filesToCopy = [
  { src: 'src/play-history-2026-01-17.m3u', dest: 'play-history-2026-01-17.m3u' },
  { src: '_redirects', dest: '_redirects' },
  { src: 'README.md', dest: 'README.md' }
];

function copyFile(src, dest) {
  const sourcePath = path.join(sourceDir, src);
  const destPath = path.join(distDir, dest);
  
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Copied: ${src} -> ${dest}`);
}

function fixHTML() {
  const htmlPath = path.join(distDir, 'index.html');
  let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  // 查找 storage.js 和 i18n.js 文件
  const jsDir = path.join(distDir, 'js');
  const jsFiles = fs.readdirSync(jsDir);
  const storageFile = jsFiles.find(file => file.startsWith('storage.'));
  const i18nFile = jsFiles.find(file => file.startsWith('i18n.'));
  
  if (storageFile && i18nFile) {
    const storageScriptTag = `<script src="/js/${storageFile}"></script>`;
    const i18nScriptTag = `<script src="/js/${i18nFile}"></script>`;
    
    // 移除已存在的 script 标签
    htmlContent = htmlContent.replace(/<script src="\/js\/(storage|i18n)\.[^"]+"><\/script>\s*/g, '');
    
    // 移除 modulepreload 标签
    htmlContent = htmlContent.replace(/<link rel="modulepreload"[^>]*>\s*/g, '');
    
    // 在 main.js 之前添加 storage 和 i18n script 标签
    const mainScriptMatch = htmlContent.match(/<script type="module"[^>]*src="\/js\/main\.[^"]+">/);
    if (mainScriptMatch) {
      htmlContent = htmlContent.replace(
        mainScriptMatch[0],
        `${storageScriptTag}\n      ${i18nScriptTag}\n      ${mainScriptMatch[0]}`
      );
    }
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log(`Fixed HTML: Added storage and i18n script tags before main.js`);
  }
}

console.log('Copying additional files to dist directory...');

filesToCopy.forEach(file => {
  try {
    copyFile(file.src, file.dest);
  } catch (error) {
    console.error(`Error copying ${file.src}:`, error.message);
  }
});

console.log('Fixing HTML file...');
fixHTML();

console.log('Copy operation completed!');
