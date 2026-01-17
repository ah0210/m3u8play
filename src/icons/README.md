# 应用图标说明

本目录包含播放器应用的图标文件。原始设计文件为 `icon.svg`，您可以使用此文件生成不同尺寸的 PNG 图标。

## 需要的图标尺寸

根据 `manifest.json` 配置，您需要生成以下尺寸的 PNG 图标：

1. `icon-192x192.png` (192x192 像素)
2. `icon-512x512.png` (512x512 像素)
3. `icon-maskable-192x192.png` (192x192 像素，用于自适应图标)
4. `icon-maskable-512x512.png` (512x512 像素，用于自适应图标)
5. `icon-96x96.png` (96x96 像素，用于快捷方式)

## 生成方法

您可以使用以下工具将 SVG 转换为 PNG：

### 在线工具
- [CloudConvert](https://cloudconvert.com/svg-to-png)
- [Convertio](https://convertio.co/svg-png/)
- [SVG to PNG Converter](https://svgtopng.com/)

### 本地工具
- **Inkscape** (免费开源):
  ```bash
  inkscape --export-type=png --export-width=192 --export-height=192 icon.svg --export-filename=icon-192x192.png
  inkscape --export-type=png --export-width=512 --export-height=512 icon.svg --export-filename=icon-512x512.png
  ```

- **ImageMagick** (免费开源):
  ```bash
  convert -resize 192x192 icon.svg icon-192x192.png
  convert -resize 512x512 icon.svg icon-512x512.png
  ```

### 针对自适应图标 (Maskable Icons)

对于 `maskable-*` 图标，建议确保图标内容位于安全区域内，避免边缘重要内容被裁剪。您可以：

1. 使用 [Maskable.app](https://maskable.app/editor) 工具调整和生成自适应图标
2. 确保图标主体内容位于中心区域，边缘留有适当边距
3. 可以为自适应图标创建不同的设计，确保在各种形状下都能良好显示

## 注意事项

- 所有 PNG 图标应使用透明背景
- 建议使用压缩工具优化 PNG 大小，如 [TinyPNG](https://tinypng.com/)
- 确保图标在各种背景下都能清晰可见
- 保持图标设计简洁明了，突出播放器特性

生成所有必要的 PNG 图标后，播放器应用即可正常使用所有 PWA 功能。