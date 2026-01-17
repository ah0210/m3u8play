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

function copyIcons() {
  const sourceIconsDir = path.join(sourceDir, 'src', 'icons');
  const destIconsDir = path.join(distDir, 'icons');
  
  if (!fs.existsSync(sourceIconsDir)) {
    console.log('Source icons directory not found, skipping...');
    return;
  }
  
  if (!fs.existsSync(destIconsDir)) {
    fs.mkdirSync(destIconsDir, { recursive: true });
  }
  
  const iconFiles = fs.readdirSync(sourceIconsDir);
  iconFiles.forEach(file => {
    if (file.endsWith('.png') || file.endsWith('.svg')) {
      const sourcePath = path.join(sourceIconsDir, file);
      const destPath = path.join(destIconsDir, file);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied icon: ${file}`);
    }
  });
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

function fixHTMLManifest() {
  const htmlPath = path.join(distDir, 'index.html');
  let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.log('Assets directory not found, skipping HTML manifest fix...');
    return;
  }
  
  // 查找 manifest 文件（动态匹配哈希值）
  const assetFiles = fs.readdirSync(assetsDir);
  const manifestFile = assetFiles.find(file => file.startsWith('manifest.') && file.endsWith('.json'));
  
  if (!manifestFile) {
    console.log('Manifest file not found, skipping HTML manifest fix...');
    return;
  }
  
  // 替换 manifest 路径
  htmlContent = htmlContent.replace(
    /href="\/assets\/manifest\.[^"]+\.json"/,
    `href="/assets/${manifestFile}"`
  );
  
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log('Fixed HTML: Updated manifest path');
}

function fixManifest() {
  const assetsDir = path.join(distDir, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.log('Assets directory not found, skipping manifest fix...');
    return;
  }
  
  // 查找 manifest 文件（动态匹配哈希值）
  const assetFiles = fs.readdirSync(assetsDir);
  const manifestFile = assetFiles.find(file => file.startsWith('manifest.') && file.endsWith('.json'));
  
  if (!manifestFile) {
    console.log('Manifest file not found, skipping...');
    return;
  }
  
  const manifestPath = path.join(assetsDir, manifestFile);
  const iconsDir = path.join(distDir, 'icons');
  
  if (!fs.existsSync(iconsDir)) {
    console.log('Icons directory not found, skipping manifest fix...');
    return;
  }
  
  const iconFiles = fs.readdirSync(iconsDir);
  let manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  let manifest = JSON.parse(manifestContent);
  
  // 更新图标路径
  manifest.icons = manifest.icons.map(icon => {
    const size = icon.sizes;
    const purpose = icon.purpose || 'any';
    
    // 查找匹配的图标文件
    let matchingFile = null;
    if (purpose === 'maskable') {
      matchingFile = iconFiles.find(file => file.includes('maskable') && file.includes(size));
    } else {
      matchingFile = iconFiles.find(file => file.includes(size) && !file.includes('maskable'));
    }
    
    if (matchingFile) {
      return {
        ...icon,
        src: `/icons/${matchingFile}`
      };
    }
    
    return icon;
  });
  
  // 更新快捷方式图标
  if (manifest.shortcuts) {
    manifest.shortcuts = manifest.shortcuts.map(shortcut => {
      if (shortcut.icons) {
        shortcut.icons = shortcut.icons.map(icon => {
          const size = icon.sizes;
          
          const matchingFile = iconFiles.find(file => file.includes(size));
          
          if (matchingFile) {
            return {
              ...icon,
              src: `/icons/${matchingFile}`
            };
          }
          
          return icon;
        });
      }
      return shortcut;
    });
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('Fixed manifest: Updated icon paths');
}

function fixHTMLIcons() {
  const htmlPath = path.join(distDir, 'index.html');
  let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  
  const iconsDir = path.join(distDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    console.log('Icons directory not found, skipping HTML icon fix...');
    return;
  }
  
  const iconFiles = fs.readdirSync(iconsDir);
  
  // 替换图标链接
  htmlContent = htmlContent.replace(/href="\/icons\/icon-192x192\.[^"]+"/g, (match) => {
    const matchingFile = iconFiles.find(file => file.includes('192x192') && !file.includes('maskable'));
    if (matchingFile) {
      return `href="/icons/${matchingFile}"`;
    }
    return match;
  });
  
  htmlContent = htmlContent.replace(/href="\/icons\/icon-maskable-192x192\.[^"]+"/g, (match) => {
    const matchingFile = iconFiles.find(file => file.includes('maskable') && file.includes('192x192'));
    if (matchingFile) {
      return `href="/icons/${matchingFile}"`;
    }
    return match;
  });
  
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log('Fixed HTML: Updated icon paths');
}

console.log('Copying additional files to dist directory...');

filesToCopy.forEach(file => {
  try {
    copyFile(file.src, file.dest);
  } catch (error) {
    console.error(`Error copying ${file.src}:`, error.message);
  }
});

console.log('Copying icons...');
copyIcons();

console.log('Fixing HTML file...');
fixHTML();

console.log('Fixing HTML manifest...');
fixHTMLManifest();

console.log('Fixing HTML icons...');
fixHTMLIcons();

console.log('Fixing manifest file...');
fixManifest();

console.log('Copy operation completed!');
