/**
 * 一次性预览脚本（不进小程序包）：把 app.wxss / stats.wxss 里「项目累计」用到的规则
 * 按 750rpx=375px 换算，用 HTML 复刻这块卡片，再 headless Chrome 截图。
 *   node tools/.tmp/stats-preview.js
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const TMP = __dirname
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

function pick(file, from, to) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const a = s.indexOf(from)
  const b = to ? s.indexOf(to, a) : s.length
  return s.slice(a, b < 0 ? s.length : b)
}

let css = pick('app.wxss', '.card {', '/* ---------- 空状态')
  + pick('pages/stats/stats.wxss', '.type-row {', '.foot-tip')

/* rpx -> px（375 设计宽，1rpx = 0.5px） */
css = css.replace(/(-?\d*\.?\d+)rpx/g, function (_, n) {
  return (parseFloat(n) * 0.5).toFixed(2).replace(/\.00$/, '') + 'px'
})

const vars = {
  '--text-1': '#2B2416',
  '--text-2': '#55514A',
  '--text-3': '#A69F8E',
  '--line': 'rgba(43,36,22,0.10)',
  '--fill': 'rgba(43,36,22,0.05)',
  '--card': '#FFFFFF'
}
Object.keys(vars).forEach(function (k) {
  css = css.split('var(' + k + ')').join(vars[k])
})

const rows = [
  { name: '深蹲', icon: 'squat', total: 128, pct: 100, load: '6.8', unit: '吨', color: '#E0663C', best: 24 },
  { name: '保加利亚蹲', icon: 'bulgarian', total: 96, pct: 75, load: '1.512', unit: '吨', color: '#3F8F6E', best: 18 },
  { name: '引体向上', icon: 'pullup', total: 64, pct: 50, load: '480', unit: 'kg', color: '#4A7FB5', best: 12 },
  { name: '平板支撑', icon: 'pushup', total: 40, pct: 31, load: '0', unit: 'kg', color: '#7E6BC4', best: 0 }
]

const rowHtml = rows.map(function (r) {
  const ic = fs.existsSync(path.join(ROOT, 'images/ex-' + r.icon + '.png'))
    ? '<img class="type-icon-img" src="../../images/ex-' + r.icon + '.png">'
    : '<span class="type-icon">🏋️</span>'
  const load = r.load !== '0'
    ? '<span class="type-load">' + r.load + ' ' + r.unit + '</span><span class="type-dot"> · </span>'
    : ''
  return '<div class="type-row">' + ic
    + '<div class="type-body">'
    + '<div class="type-top"><span class="type-name">' + r.name + '</span>'
    + '<span class="type-num" style="color:' + r.color + '">' + r.total + ' 次</span></div>'
    + '<div class="type-bar"><div class="type-fill" style="width:' + r.pct + '%;background:' + r.color + '"></div></div>'
    + '<div class="type-sub">' + load + '<span>单组最高 ' + r.best + ' 次</span></div>'
    + '</div></div>'
}).join('')

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #EFEDE6; }
  body { padding: 8px; font-family: -apple-system, "PingFang SC", sans-serif; color: #2B2416; }
  /* 固定 375 宽，避免预览窗口宽度影响块内换行判断 */
  .card { width: 359px; }
  ${css}
</style></head>
<body>
  <div class="card">
    <div class="card-title">项目累计<span class="sub">共 10.712 吨</span></div>
    ${rowHtml}
  </div>
</body></html>`

const htmlPath = path.join(TMP, 'stats-card.html')
fs.writeFileSync(htmlPath, html)

const shot = path.join(TMP, 'stats-card.png')
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--force-device-scale-factor=2',
  '--virtual-time-budget=2000',
  '--window-size=375,430',
  '--screenshot=' + shot,
  'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'inherit' })

console.log('ok ->', shot)
