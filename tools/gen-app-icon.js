/*
 * 「力拔山兮」图标后处理：把 AI 生成的 1024 原图做成可上传的图标
 *
 *   tools/art/ai/*.png（生成稿，右下角带 AI 生成水印）
 *     → 补一块背景色盖掉水印
 *     → tools/art/app-icon-512.png / app-icon-144.png
 *     → tools/.tmp/icon-sizes.png（144/96/64/40 缩小后是否还认得出）
 *
 * 用法：node tools/gen-app-icon.js [原图路径]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '.tmp')
const ART = path.join(__dirname, 'art')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(function (p) { return fs.existsSync(p) })[0]

const SRC = process.argv[2] ||
  path.join(ART, 'ai', 'Flat_vector_app_icon__square_1_2026-11-03T23-35-23.png')

function fileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/')
}

function shot(html, w, h, out) {
  const p = path.join(TMP, 'icon-' + path.basename(out, '.png') + '.html')
  fs.writeFileSync(p, '<!doctype html><meta charset="utf-8">'
    + '<style>html,body{margin:0;background:transparent;overflow:hidden;line-height:0}</style>' + html, 'utf8')
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    '--virtual-time-budget=3000',
    '--window-size=' + w + ',' + h,
    '--screenshot=' + out,
    fileUrl(p)
  ], { stdio: 'ignore' })
}

/* 画布脚本：patch=true 时先用上方背景补掉右下角水印 */
function canvasPage(src, size, patch) {
  const patchCode = patch
    ? "var sx = 880, sy = 780, sw = 144, sh = 86;\n"
      + "ctx.drawImage(im, sx, sy, sw, sh, 878, 942, 146, 82);"
    : ''
  return '<canvas id="c" width="' + size + '" height="' + size + '"></canvas>'
    + '<script>var im = new Image();'
    + 'im.onload = function () {'
    + 'var cv = document.getElementById("c"), ctx = cv.getContext("2d");'
    + 'ctx.drawImage(im, 0, 0, ' + size + ', ' + size + ');'
    + (patch ? patchCode : '')
    + 'document.title = "ready";'
    + '};im.src = "' + fileUrl(src) + '";</script>'
}

function main() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

  /* 1024 带补丁的母版 */
  const master = path.join(TMP, 'icon-master-1024.png')
  shot(canvasPage(SRC, 1024, true), 1024, 1024, master)

  shot(canvasPage(master, 512, false), 512, 512, path.join(ART, 'app-icon-512.png'))
  shot(canvasPage(master, 144, false), 144, 144, path.join(ART, 'app-icon-144.png'))
  console.log('tools/art/app-icon-512.png')
  console.log('tools/art/app-icon-144.png')

  /* 多尺寸总览 */
  const sizes = [144, 96, 64, 40]
  const cells = sizes.map(function (s) {
    return '<figure><img src="' + fileUrl(path.join(ART, 'app-icon-512.png')) + '"'
      + ' width="' + s + '" height="' + s + '" style="border-radius:' + Math.round(s * 0.22) + 'px">'
      + '<figcaption>' + s + '</figcaption></figure>'
  }).join('')
  shot('<!doctype html><meta charset="utf-8"><style>'
    + 'html,body{margin:0;background:#FFFFFF;font:11px sans-serif;color:#888}'
    + 'body{display:flex;align-items:flex-end;gap:14px;padding:14px;line-height:1.4}'
    + 'figure{margin:0;text-align:center}figcaption{padding-top:4px}</style>' + cells,
  400, 200, path.join(TMP, 'icon-sizes.png'))
  console.log('tools/.tmp/icon-sizes.png')
}

main()
