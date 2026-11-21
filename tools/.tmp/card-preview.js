/**
 * 一次性预览脚本（不进小程序包）：把 WXSS 里的 .sp-* 规则按 750rpx=375px 换算，
 * 用真实 HTML 复刻朋友圈「单页模式」卡片，再 headless Chrome 截图。
 *   node tools/.tmp/card-preview.js
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const TMP = __dirname
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const wxss = fs.readFileSync(path.join(ROOT, 'pages/share/share.wxss'), 'utf8')

/* 只取单页模式那一段样式 */
const start = wxss.indexOf('.sp {')
let css = wxss.slice(start)

/* rpx -> px（375 设计宽，1rpx = 0.5px） */
css = css.replace(/(-?\d*\.?\d+)rpx/g, function (_, n) {
  return (parseFloat(n) * 0.5).toFixed(2).replace(/\.00$/, '') + 'px'
})

/* 主题变量（柠檬黄）直接写死，预览用 */
const vars = {
  '--brand': '#FFC300',
  '--brand-2': '#FFD84D',
  '--ink-85': 'rgba(58,47,0,0.85)',
  '--ink-62': 'rgba(58,47,0,0.62)',
  '--ink-55': 'rgba(58,47,0,0.55)',
  '--ink-45': 'rgba(58,47,0,0.45)',
  '--brand-shadow': 'rgba(224,161,0,0.18)'
}
Object.keys(vars).forEach(function (k) {
  css = css.split('var(' + k + ')').join(vars[k])
})

const rows = [
  { name: '深蹲', muscle: '股四头肌·臀大肌', totalText: '24', sets: 8, setsText: '8', loadText: '2,160', load: 2160 },
  { name: '臀推', muscle: '臀大肌', totalText: '20', sets: 6, setsText: '6', loadText: '1,800', load: 1800 },
  { name: '髋外展', muscle: '臀中肌', totalText: '18', sets: 5, setsText: '5', loadText: '720', load: 720 },
  { name: '保加利亚蹲', muscle: '股四头肌·腘绳肌·臀大肌', totalText: '16', sets: 4, setsText: '4', loadText: '480', load: 480 },
  { name: '引体向上', muscle: '背阔肌·肱二头肌', totalText: '15', sets: 5, setsText: '5', loadText: '0', load: 0 }
]

const rowHtml = rows.map(function (r) {
  return '<div class="sp-row">'
    + '<span class="sp-name">' + r.name + '</span>'
    + '<span class="sp-muscle">' + r.muscle + '</span>'
    + '<span class="sp-val' + (r.load > 0 ? '' : ' solo') + '">' + (r.sets > 0 ? r.setsText + ' 组 · ' : '') + r.totalText + ' 次</span>'
    + (r.load > 0 ? '<span class="sp-kg">' + r.loadText + ' kg</span>' : '')
    + '</div>'
}).join('')

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
html,body { margin: 0; padding: 0; background: #FAF8EF; font-family: system-ui, "Microsoft YaHei", sans-serif; }
.page { width: 375px; padding: 4px 12px 12px; box-sizing: border-box; }
${css}
</style></head><body>
<div class="page">
  <div class="sp">
    <div class="sp-card">
      <div class="sp-top">
        <div class="sp-brand">锻炼记录</div>
        <div class="sp-date">11月03日 周二</div>
      </div>
      <div class="sp-nick">阿峰</div>
      <div class="sp-hero">
        <div class="sp-hero-main">
          <div class="sp-hero-label">当日总重量</div>
          <div class="sp-hero-num">5.16<span class="sp-hero-unit">吨</span></div>
        </div>
        <div class="sp-weight">
          <div class="sp-weight-label">当日总次数</div>
          <div class="sp-weight-num">78<span class="sp-weight-unit">次</span></div>
          <div class="sp-weight-sub">15 组</div>
        </div>
      </div>
      <div class="sp-quip">
        <span class="sp-quip-t">今天相当于挪动了一条蓝鲸，收工吧！</span>
        <img class="sp-quip-img" src="../../images/quip-whale.png" />
      </div>
      <div class="sp-rows">${rowHtml}</div>
      <div class="sp-bottom">
        <div class="sp-box"><div class="sp-box-label">连续打卡</div><div class="sp-box-num">12<span class="sp-box-unit">天</span></div></div>
        <div class="sp-box"><div class="sp-box-label">打卡总天数</div><div class="sp-box-num">88<span class="sp-box-unit">天</span></div></div>
      </div>
      <div class="sp-foot">坚持就是胜利</div>
    </div>
  </div>
</div>
</body></html>`

const htmlPath = path.join(TMP, 'card.html')
fs.writeFileSync(htmlPath, html)

const shot = path.join(TMP, 'share-card-whale.png')
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--virtual-time-budget=3000',
  '--window-size=375,720',
  '--screenshot=' + shot,
  'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'inherit' })

console.log('ok ->', shot)
