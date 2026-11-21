/* 分享卡「俏皮话」配图生成器
 *
 * 文案里会出现「挪动了一条鲸鱼」「搬走了一台钢琴」这种类比物，
 * 海报上给它配一张小插画。风格跟运动图标（tools/gen-icons.js）保持一致：
 * 暖奶油底 + 深色细描边 + 少量红点缀，透明背景，直接画在渐变海报上。
 *
 * 用法：node tools/gen-quip.js
 *   → tools/svg/quip-<key>.svg（可编辑源）
 *   → images/quip-<key>.png（192×192 透明 PNG）
 *   → tools/.tmp/quip-sheet.png（总览图，用来肉眼检查）
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const SVG_DIR = path.join(__dirname, 'svg')
const TMP = path.join(__dirname, '.tmp')
const PNG_DIR = path.join(ROOT, 'images')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].filter(function (p) { return fs.existsSync(p) })[0]

const SIZE = 192

/* DeepSeek 的鲸鱼标志（官方 mark，单条路径，24×24 视窗）。
 * 鲸鱼那一格用它替换原来手绘的卡通鲸 —— 提到「挪动了一条鲸鱼」时，
 * 配上的就是这只大家都认识的鲸。
 * 标志本身是实心剪影，不再套奶油底 + 描边，直接用品牌蓝 #4D6BFE。 */
const DEEPSEEK_WHALE = 'M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45'

/* 每个条目就是一段 SVG body，统一 96×96 画布 */
const QUIPS = {
  /* 鲸：DeepSeek 标志（原来那只手绘鲸被替换）—— 24×24 视窗放大后居中留白 */
  whale: `
    <g transform="translate(6.2 6.3) scale(3.477)"><path class="d" d="${DEEPSEEK_WHALE}"/></g>
  `,

  /* 大象：身体 + 大耳（在头后面）+ 圆头 + 象鼻 + 四条腿 */
  elephant: `
    <path class="f" d="M42 32h24c8 0 13 7 13 16v14c0 5-3 8-8 8H50c-6 0-10-4-10-10z"/>
    <path class="f" d="M36 68h10v14H36zM52 68h10v14H52zM66 68h10v14H66z"/>
    <path class="f" d="M38 26a14 15 0 0 1 14 15v9a14 15 0 0 1-28 0v-9a14 15 0 0 1 14-15z"/>
    <path class="f" d="M20 24a15 15 0 0 1 15 15v10a15 15 0 0 1-30 0V39a15 15 0 0 1 15-15z"/>
    <path class="f" d="M14 48c-5 6-7 14-6 21 0 4 8 5 8 1 0-8 2-13 6-17z"/>
    <path class="l" d="M17 61c4-2 9-2 12 0"/>
    <circle class="i" cx="17" cy="36" r="2.4"/>
    <path class="r" d="M20 56c4 2 6 6 7 10"/>
  `,

  /* 小汽车：车身 + 车顶 + 两轮 */
  car: `
    <path class="f" d="M10 62V50c0-3 2-5 5-6l7-12c1-2 3-3 5-3h24c3 0 5 1 7 3l8 12c4 1 7 3 7 6v12c0 2-1 3-3 3H13c-2 0-3-1-3-3z"/>
    <path class="l" d="M26 33h12v13H20zM44 33h9l8 13H44z"/>
    <circle class="f" cx="28" cy="66" r="8"/>
    <circle class="i" cx="28" cy="66" r="3"/>
    <circle class="f" cx="68" cy="66" r="8"/>
    <circle class="i" cx="68" cy="66" r="3"/>
    <path class="r" d="M12 45h7"/>
  `,

  /* 钢琴：立式琴身 + 琴键 + 琴盖 */
  piano: `
    <path class="f" d="M16 24h64v44H16z"/>
    <path class="f" d="M12 24c0-4 3-6 7-6h58c4 0 7 2 7 6v8H12z"/>
    <path class="f" d="M18 56h60v14H18z"/>
    <path class="l" d="M26 56v10M32 56v10M38 56v10M44 56v10M50 56v10M56 56v10M62 56v10M68 56v10"/>
    <path class="l" d="M29 38h38"/>
    <path class="r" d="M62 44h10v6H62z"/>
    <path class="l" d="M22 70v10M74 70v10"/>
  `,

  /* 冰箱：柜体 + 门缝 + 把手 */
  fridge: `
    <path class="f" d="M32 12h32c3 0 5 2 5 5v62c0 3-2 5-5 5H32c-3 0-5-2-5-5V17c0-3 2-5 5-5z"/>
    <path class="l" d="M27 40h42"/>
    <path class="l" d="M36 26v8M36 48v14"/>
    <path class="r" d="M60 22h6v10h-6z"/>
    <path class="l" d="M33 84h30"/>
  `,

  /* 桶装水：桶身 + 瓶颈 + 桶盖 + 水面 */
  bottle: `
    <path class="f" d="M36 30h24l6 34c1 6-3 10-9 10H39c-6 0-10-4-9-10z"/>
    <path class="f" d="M40 16h16v14H40z"/>
    <path class="f" d="M42 10h12v6H42z"/>
    <path class="l" d="M34 56c6 4 22 4 28 0"/>
    <path class="l" d="M38 66c6 3 14 3 20 0"/>
    <path class="r" d="M42 12h12"/>
  `,

  /* 牛：正面牛头（好认、笔画少） */
  cow: `
    <path class="f" d="M30 34c0-8 8-14 18-14s18 6 18 14v20c0 12-8 20-18 20s-18-8-18-20z"/>
    <path class="f" d="M20 32c-5-3-8-8-8-13 6-1 12 2 15 7z"/>
    <path class="f" d="M76 32c5-3 8-8 8-13-6-1-12 2-15 7z"/>
    <path class="f" d="M30 60c0-5 8-8 18-8s18 3 18 8v6c0 6-8 10-18 10s-18-4-18-10z"/>
    <circle class="i" cx="39" cy="44" r="2.6"/>
    <circle class="i" cx="57" cy="44" r="2.6"/>
    <path class="i" d="M43 64h4M53 64h4"/>
    <path class="r" d="M24 24c2-5 6-8 11-8M72 24c-2-5-6-8-11-8"/>
  `,

  /* 火车：车头 + 烟囱 + 车轮 + 铁轨 */
  train: `
    <path class="f" d="M14 30h22v30H14z"/>
    <path class="f" d="M36 40h34c4 0 7 3 7 7v13H36z"/>
    <path class="f" d="M52 26h12v14H52z"/>
    <path class="l" d="M20 38h10v10H20z"/>
    <path class="f" d="M62 22h10v18H62z"/>
    <circle class="f" cx="26" cy="64" r="8"/>
    <circle class="i" cx="26" cy="64" r="3"/>
    <circle class="f" cx="48" cy="64" r="8"/>
    <circle class="i" cx="48" cy="64" r="3"/>
    <circle class="f" cx="68" cy="64" r="8"/>
    <circle class="i" cx="68" cy="64" r="3"/>
    <path class="l" d="M10 74h76"/>
    <path class="r" d="M67 14c-3-4-1-8 2-10"/>
  `
}

const STYLE = `
  .f { fill: #FFF4DD; stroke: #26231F; stroke-width: 3.4; stroke-linejoin: round; stroke-linecap: round; }
  .l { fill: none; stroke: #26231F; stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; }
  .i { fill: #26231F; }
  .r { fill: none; stroke: #F0443E; stroke-width: 2.6; stroke-linecap: round; }
  .d { fill: #4D6BFE; }
`

function svgOf(body) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="' + SIZE + '" height="' + SIZE + '">' +
    '<style>' + STYLE + '</style>' + body + '</svg>'
}

function pageOf(items, cell) {
  const cells = items.map(function (it) {
    return '<figure><img src="' + it.src + '" width="' + cell + '" height="' + cell + '">' +
      '<figcaption>' + it.key + '</figcaption></figure>'
  }).join('')
  return '<!doctype html><meta charset="utf-8"><style>' +
    'body{margin:0;padding:12px;background:#F7F5EC;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:8px}' +
    'figure{margin:0;text-align:center;background:#fff;border-radius:10px;padding:6px}' +
    'figcaption{color:#666;padding-top:2px}</style>' + cells
}

function main() {
  if (!fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR, { recursive: true })
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

  const keys = Object.keys(QUIPS)
  keys.forEach(function (k) {
    fs.writeFileSync(path.join(SVG_DIR, 'quip-' + k + '.svg'), svgOf(QUIPS[k]), 'utf8')
  })

  if (!CHROME) {
    console.log('没找到 Chrome，只生成了 SVG')
    return
  }

  keys.forEach(function (k) {
    const html = path.join(TMP, 'quip-' + k + '.html')
    const png = path.join(PNG_DIR, 'quip-' + k + '.png')
    fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>' + svgOf(QUIPS[k]), 'utf8')
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--default-background-color=00000000',
      '--window-size=' + SIZE + ',' + SIZE,
      '--screenshot=' + png,
      'file:///' + html.replace(/\\/g, '/')
    ], { stdio: 'ignore' })
    console.log('images/quip-' + k + '.png')
  })

  /* 总览图：方便一眼看全部造型 */
  const sheet = path.join(TMP, 'quip-sheet.html')
  fs.writeFileSync(sheet, pageOf(keys.map(function (k) {
    return { key: k, src: 'file:///' + path.join(PNG_DIR, 'quip-' + k + '.png').replace(/\\/g, '/') }
  }), 96), 'utf8')
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=560,540',
    '--screenshot=' + path.join(TMP, 'quip-sheet.png'),
    'file:///' + sheet.replace(/\\/g, '/')
  ], { stdio: 'ignore' })
  console.log('tools/.tmp/quip-sheet.png')
}

main()
