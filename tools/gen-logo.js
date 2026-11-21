/*
 * 「力拔山兮」小程序图标生成器
 *
 * 语出项羽《垓下歌》「力拔山兮气盖世」——取「力士举山」这一动作做图形：
 * 深色力士（宽肩、双臂上举、双腿撑地）把一座奶油色山峦托过头顶。
 * 配色沿用 App 主题：柠檬黄底 + 墨黑力士 + 奶油山体，三色，小尺寸也能认。
 *
 * 用法：node tools/gen-logo.js
 *   → tools/svg/app-icon.svg        可编辑源
 *   → tools/art/app-icon-512.png    上传后台用（正方形，无圆角，微信自己裁）
 *   → tools/art/app-icon-144.png    列表页实际显示尺寸
 *   → tools/.tmp/icon-sizes.png     多尺寸总览，检查缩小后是否还认得出
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '.tmp')
const ART = path.join(__dirname, 'art')
const SVG_DIR = path.join(__dirname, 'svg')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(function (p) { return fs.existsSync(p) })[0]

const INK = '#2B2416'
const CREAM = '#FFF6DC'

/* 山：三峰顶 + 被连根拔起的碎石山底（底边锯齿轮廓，避免读成「托着一块桌板」） */
const MOUNTAIN = 'M92 216 L158 130 L200 178 L260 80 L318 170 L370 126 L420 216'
  + ' L392 242 L356 216 L310 244 L262 214 L214 244 L168 216 L132 240 Z'

function svgOf(size) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="' + size + '" height="' + size + '">'
    + '<defs>'
    + '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#FFD84D"/>'
    + '<stop offset="1" stop-color="#FFC300"/>'
    + '</linearGradient>'
    + '</defs>'

    + '<rect width="512" height="512" fill="url(#bg)"/>'

    /* 整组以重心对齐画布中心，再整体放大撑满 */
    + '<g transform="translate(256 256) scale(0.99) translate(-256 -287)">'

    /* 山体：奶油填充 + 墨色描边 */
    + '<path d="' + MOUNTAIN + '" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="15" stroke-linejoin="round" stroke-linecap="round"/>'

    /* 力士：整体墨黑剪影，双掌托住山根 */
    + '<g fill="' + INK + '" stroke="' + INK + '" stroke-linecap="round" stroke-linejoin="round">'
    /* 双臂：从厚肩斜上举到山脚碎石两侧 */
    + '<path d="M198 358 L146 250" fill="none" stroke-width="34"/>'
    + '<path d="M314 358 L366 250" fill="none" stroke-width="34"/>'
    /* 手掌：包住山底两端 */
    + '<circle cx="140" cy="242" r="25" stroke-width="0"/>'
    + '<circle cx="372" cy="242" r="25" stroke-width="0"/>'
    /* 躯干：没有脖子，头直接坐在斜方肌上，显出厚背 */
    + '<path d="M186 352 Q256 318 326 352 L298 406 Q256 418 214 406 Z" stroke-width="0"/>'
    + '<circle cx="256" cy="308" r="29" stroke-width="0"/>'
    /* 双腿：大腿粗、小腿略细，分开站 */
    + '<path d="M228 402 L214 446" fill="none" stroke-width="40"/>'
    + '<path d="M284 402 L298 446" fill="none" stroke-width="40"/>'
    + '<path d="M214 442 L206 470" fill="none" stroke-width="32"/>'
    + '<path d="M298 442 L306 470" fill="none" stroke-width="32"/>'
    /* 脚 */
    + '<rect x="176" y="464" width="56" height="22" rx="11" stroke-width="0"/>'
    + '<rect x="280" y="464" width="56" height="22" rx="11" stroke-width="0"/>'
    + '</g>'

    + '</g>'
    + '</svg>'
}

function shot(htmlContent, w, h, out) {
  const p = path.join(TMP, path.basename(out, '.png') + '.html')
  fs.writeFileSync(p, '<!doctype html><meta charset="utf-8">'
    + '<style>html,body{margin:0;background:transparent;overflow:hidden}</style>' + htmlContent, 'utf8')
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000',
    '--window-size=' + w + ',' + h,
    '--screenshot=' + out,
    'file:///' + p.replace(/\\/g, '/')
  ], { stdio: 'ignore' })
}

function main() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })
  if (!fs.existsSync(ART)) fs.mkdirSync(ART, { recursive: true })
  if (!fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR, { recursive: true })

  const svg = svgOf(512)
  fs.writeFileSync(path.join(SVG_DIR, 'app-icon.svg'), svg, 'utf8')

  shot(svg, 512, 512, path.join(ART, 'app-icon-512.png'))
  shot(svgOf(144), 144, 144, path.join(ART, 'app-icon-144.png'))
  console.log('tools/art/app-icon-512.png')
  console.log('tools/art/app-icon-144.png')

  /* 多尺寸总览：144 / 96 / 64 / 40 横向排，检查缩小后的辨识度 */
  const sizes = [144, 96, 64, 40]
  const cells = sizes.map(function (s) {
    return '<figure><img src="' + ('file:///' + path.join(ART, 'app-icon-512.png').replace(/\\/g, '/')) +
      '" width="' + s + '" height="' + s + '" style="border-radius:' + Math.round(s * 0.22) + 'px">' +
      '<figcaption>' + s + '</figcaption></figure>'
  }).join('')
  shot('<!doctype html><meta charset="utf-8"><style>' +
    'html,body{margin:0;background:#FFFFFF;font:11px sans-serif;color:#888}' +
    'body{display:flex;align-items:flex-end;gap:14px;padding:14px}' +
    'figure{margin:0;text-align:center}figcaption{padding-top:4px}</style>' + cells,
  400, 200, path.join(TMP, 'icon-sizes.png'))
  console.log('tools/.tmp/icon-sizes.png')
}

main()
