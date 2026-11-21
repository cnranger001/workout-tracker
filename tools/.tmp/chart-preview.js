/**
 * 一次性预览（不进小程序包）：把 stats.js 里 drawLoad() 的源码原样抽出来，
 * 在浏览器里用真实 canvas 跑日K / 周K / 月K 三种粒度。
 *   node tools/.tmp/chart-preview.js
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
const fn = 'function drawLoad() '
  + src.slice(start + 'drawLoad() '.length, end).trim().replace(/,$/, '')

/* ---------- 造三种粒度的数据 ---------- */
function mk(count, fnLabel, gen, forcePeakAt) {
  const out = []
  for (let i = 0; i < count; i++) {
    out.push({ label: fnLabel(i), kg: gen(i) })
  }
  if (forcePeakAt != null) out[forcePeakAt].kg = 99999
  const max = Math.max.apply(null, out.map(function (s) { return s.kg }).concat([1]))
  const sum = out.reduce(function (a, s) { return a + s.kg }, 0)
  const fl = sum >= 1000 ? (sum / 1000).toFixed(1) + ' 吨' : sum + ' kg'
  return { series: out, max: max, sumText: fl, unit: max >= 1000 ? '吨' : 'kg' }
}

function dayLabel(i) {
  const d = new Date(Date.UTC(2026, 10, 4) - (29 - i) * 86400000)
  return (d.getUTCMonth() + 1) + '/' + d.getUTCDate()
}
function weekLabel(i) {
  const d = new Date(Date.UTC(2026, 10, 2) - (29 - i) * 7 * 86400000)
  return (d.getUTCMonth() + 1) + '/' + d.getUTCDate()
}
function monthLabel(i) {
  const d = new Date(Date.UTC(2026, 10, 1))
  d.setUTCMonth(d.getUTCMonth() - (29 - i))
  const yy = String(d.getUTCFullYear()).slice(2)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return yy + '/' + mm
}

const daySet = mk(30, dayLabel, function (i) { return (i * 7) % 5 === 0 ? 0 : 2800 + ((i * 1370) % 4300) })
const weekSet = mk(30, weekLabel, function (i) { return (i * 3) % 7 === 0 ? 0 : 9000 + ((i * 4300) % 16000) }, 1)
const monthSet = mk(30, monthLabel, function (i) { return 42000 + ((i * 9100) % 38000) }, 29)

function card(title, rangeText, set, active) {
  const tabs = [['day', '日K'], ['week', '周K'], ['month', '月K']].map(function (t) {
    return '<div class="ktab' + (t[0] === active ? ' on' : '') + '">' + t[1] + '</div>'
  }).join('')
  return '<div class="card">'
    + '<div class="card-title">' + title + '<span class="sub">' + rangeText + ' · 合计 ' + set.sumText + '</span></div>'
    + '<div class="ktabs">' + tabs + '</div>'
    + '<canvas class="chart" data-set="' + JSON.stringify(set).replace(/"/g, '&quot;') + '"></canvas>'
    + '</div>'
}

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #EFEDE6; }
  body { padding: 8px; font-family: -apple-system, "PingFang SC", sans-serif; color: #2B2416; }
  .card { background: #fff; border-radius: 14px; padding: 14px; width: 359px; margin-bottom: 10px; }
  .card-title { font-size: 15px; font-weight: 600; }
  .card-title .sub { font-size: 12px; font-weight: 400; color: #A69F8E; margin-left: 6px; }
  .ktabs { display: flex; margin: 8px 0 5px; }
  .ktab { padding: 4px 12px; margin-right: 6px; border-radius: 999px; background: rgba(43,36,22,0.05);
          color: #A69F8E; font-size: 12px; line-height: 1.2; }
  .ktab.on { background: #FFC300; color: #3A2F00; font-weight: 600; }
  .chart { display: block; width: 100%; height: 125px; }
</style></head>
<body>
  ${card('吨位走势', '近 30 天', daySet, 'day')}
  ${card('吨位走势', '近 30 周', weekSet, 'week')}
  ${card('吨位走势', '近 30 月', monthSet, 'month')}
<script>
  const TH = { line: 'rgba(43,36,22,0.10)', arrow: '#A69F8E', brand: '#FFC300', brandDeep: '#E0A100' };
  const T = { current: function () { return TH; } };
  const U = { today: function () { return '2026-11-04'; } };

  ${fn}

  function drawInto(cv, set) {
    const dpr = 2;
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    drawLoad.call({
      data: { loadSeries: set.series, maxLoad: set.max, loadAxisUnit: set.unit },
      getCanvas: function (id, cb) { cb(ctx, w, h); }
    });
  }

  /* 等所有卡片和 drawLoad 都就绪后再逐张绘制，避免脚本先于函数定义执行 */
  document.querySelectorAll('canvas.chart').forEach(function (cv) {
    drawInto(cv, JSON.parse(cv.getAttribute('data-set')));
  });
</script>
</body></html>`

const htmlPath = path.join(TMP, 'chart-load.html')
fs.writeFileSync(htmlPath, html)

const shot = path.join(TMP, 'stats-load-k.png')
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--virtual-time-budget=2500',
  '--window-size=375,560',
  '--screenshot=' + shot,
  'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'inherit' })

console.log('ok ->', shot)
