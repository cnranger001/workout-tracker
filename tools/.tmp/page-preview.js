/**
 * 一次性预览（不进小程序包）：渲染删掉「近 7 天分布」「近 30 天总次数趋势」之后的统计页
 * 把 stats.js 里 drawLoad() 的源码原样抽到浏览器里，用真实 canvas 跑
 *   node tools/.tmp/page-preview.js
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const TMP = __dirname
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const src = fs.readFileSync(path.join(ROOT, 'pages/stats/stats.js'), 'utf8')
const start = src.indexOf('drawLoad() {')
const end = src.indexOf('\n  goToday() {')
if (start < 0 || end < 0) throw new Error('drawLoad 抽取失败')
const fnLoad = 'function drawLoad() '
  + src.slice(start + 'drawLoad() '.length, end).trim().replace(/,$/, '')

/* ---------- 造数据 ---------- */
const loadSeries = []
for (let i = 0; i < 30; i++) {
  const d = new Date(Date.UTC(2026, 10, 4) - (29 - i) * 86400000)
  const kg = (i * 7) % 5 === 0 ? 0 : 2800 + ((i * 1370) % 4300)
  loadSeries.push({ label: (d.getUTCMonth() + 1) + '/' + d.getUTCDate(), kg: kg })
}
const loadMax = Math.max.apply(null, loadSeries.map(function (s) { return s.kg }))
const loadSum = loadSeries.reduce(function (a, s) { return a + s.kg }, 0)

const byType = [
  { name: '深蹲', color: '#E4572E', total: 28, best: 24, load: 6800, loadText: '6.8', loadUnit: '吨', pct: 100 },
  { name: '臀推', color: '#FFC300', total: 14, best: 20, load: 2400, loadText: '2.4', loadUnit: '吨', pct: 50 },
  { name: '髋外展', color: '#7A5CC4', total: 12, best: 18, load: 720, loadText: '720', loadUnit: 'kg', pct: 43 },
  { name: '引体向上', color: '#4A7FB5', total: 11, best: 8, load: 1512, loadText: '1.512', loadUnit: '吨', pct: 39 }
]

const grid = [['53', '累计次数'], ['6', '打卡天数'], ['3', '连续天数'], ['17', '本周次数'], ['9', '日均次数'], ['23', '单日最高']]
  .map(function (g, i) {
    return '<div class="grid-cell"><div class="grid-num' + (i === 2 ? ' hl' : (i === 5 ? ' sm' : ''))
      + '">' + g[0] + '</div><div class="grid-label">' + g[1] + '</div></div>'
  }).join('')

const typeRows = byType.map(function (b) {
  return '<div class="type-row"><div class="type-icon-img"></div><div class="type-body">'
    + '<div class="type-top"><span class="type-name">' + b.name + '</span>'
    + '<span class="type-num" style="color:' + b.color + '">' + b.total + ' 次</span></div>'
    + '<div class="type-bar"><div class="type-fill" style="width:' + b.pct + '%;background:' + b.color + '"></div></div>'
    + '<div class="type-sub"><span class="type-load">' + b.loadText + ' ' + b.loadUnit + '</span>'
    + '<span class="type-dot"> · </span><span>单组最高 ' + b.best + ' 次</span></div>'
    + '</div></div>'
}).join('')

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #EFEDE6; }
  body { padding: 8px; font-family: -apple-system, "PingFang SC", sans-serif; color: #2B2416; }
  .grid { display: flex; flex-wrap: wrap; background: #fff; border-radius: 10px; padding: 6px 0; margin-bottom: 12px;
          width: 359px; box-shadow: 0 2px 10px rgba(31,27,12,0.04); }
  .grid-cell { width: 33.33%; text-align: center; padding: 12px 0; }
  .grid-num { font-size: 21px; font-weight: 700; }
  .grid-num.hl { color: #FF9F43; }
  .grid-num.sm { font-size: 18px; }
  .grid-label { font-size: 11px; color: #A69F8E; margin-top: 2px; }
  .card { background: #fff; border-radius: 10px; padding: 14px; width: 359px; margin-bottom: 12px; }
  .card-title { font-size: 15px; font-weight: 600; }
  .card-title .sub { font-size: 12px; font-weight: 400; color: #A69F8E; margin-left: 6px; }
  .chart { display: block; width: 100%; }
  .chart-load { height: 125px; }
  .ktabs { display: flex; margin: -2px 0 5px; }
  .ktab { padding: 4px 12px; margin-right: 6px; border-radius: 999px; background: rgba(43,36,22,0.05);
          color: #A69F8E; font-size: 12px; line-height: 1.2; }
  .ktab.on { background: #FFC300; color: #3A2F00; font-weight: 600; }
  .type-row { display: flex; align-items: flex-start; margin-bottom: 14px; }
  .type-icon-img { width: 22px; height: 22px; margin-right: 9px; margin-top: 2px; background: #EEE7D2; border-radius: 6px; flex: none; }
  .type-body { flex: 1; }
  .type-top { display: flex; align-items: baseline; justify-content: space-between; }
  .type-name { font-size: 14px; font-weight: 600; }
  .type-num { font-size: 15px; font-weight: 700; }
  .type-bar { height: 5px; background: rgba(43,36,22,0.08); border-radius: 3px; overflow: hidden; margin: 6px 0 4px; }
  .type-fill { height: 100%; border-radius: 3px; }
  .type-sub { font-size: 11px; color: #A69F8E; }
  .type-load { font-size: 11px; font-weight: 600; color: #6B665C; }
  .type-dot { color: #C6C0AF; }
  .share-entry { display: flex; align-items: center; background: #fff; border-radius: 10px; padding: 14px;
                 width: 359px; margin-bottom: 12px; }
  .share-entry-ic { font-size: 20px; margin-right: 10px; }
  .share-entry-bd { flex: 1; }
  .share-entry-t { font-size: 14px; font-weight: 600; }
  .share-entry-d { font-size: 11px; color: #A69F8E; margin-top: 2px; }
  .share-entry-ar { color: #C6C0AF; font-size: 18px; }
  .foot-tip { text-align: center; font-size: 11px; color: #C6C0AF; padding: 4px 0 10px; }
</style></head>
<body>
  <div class="grid">${grid}</div>

  <div class="card">
    <div class="card-title">吨位走势<span class="sub">近 30 天 · 合计 ${(loadSum / 1000).toFixed(1)} 吨</span></div>
    <div class="ktabs"><div class="ktab on">日K</div><div class="ktab">周K</div><div class="ktab">月K</div></div>
    <canvas class="chart chart-load" id="cl"></canvas>
  </div>

  <div class="card">
    <div class="card-title">项目累计<span class="sub">共 10.712 吨</span></div>
    ${typeRows}
  </div>

  <div class="share-entry">
    <div class="share-entry-ic">📣</div>
    <div class="share-entry-bd">
      <div class="share-entry-t">生成分享卡</div>
      <div class="share-entry-d">把单日成绩发到朋友圈</div>
    </div>
    <div class="share-entry-ar">›</div>
  </div>

  <div class="foot-tip">最佳纪录：2026-11-02 共 23 次</div>
<script>
  const TH = { line: 'rgba(43,36,22,0.10)', arrow: '#A69F8E', brand: '#FFC300', brandDeep: '#E0A100' };
  const T = { current: function () { return TH; } };
  const U = { today: function () { return '2026-11-04'; } };

  ${fnLoad}

  (function () {
    const cv = document.getElementById('cl');
    const dpr = 2, w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    drawLoad.call({
      data: ${JSON.stringify({ loadSeries: loadSeries, maxLoad: loadMax, loadAxisUnit: '吨' })},
      getCanvas: function (id, cb) { cb(ctx, w, h); }
    });
  })();
</script>
</body></html>`

const htmlPath = path.join(TMP, 'stats-page.html')
fs.writeFileSync(htmlPath, html)

const shot = path.join(TMP, 'stats-page.png')
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--virtual-time-budget=2500',
  '--window-size=375,650',
  '--screenshot=' + shot,
  'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'inherit' })

console.log('ok ->', shot)
