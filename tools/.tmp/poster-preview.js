/**
 * 一次性预览脚本（不进小程序包）：
 * 把 utils/* + pages/share/share.js 用极简 CommonJS 载入浏览器，
 * 用真实 canvas 2D 跑 paint()，再用 headless Chrome 截图。
 *   node tools/.tmp/poster-preview.js
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const TMP = __dirname
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

/* 文件相对路径 -> 极简模块注册 */
const MODULES = {
  'utils/theme.js': read('utils/theme.js'),
  'utils/util.js': read('utils/util.js'),
  'utils/store.js': read('utils/store.js'),
  'utils/caption.js': read('utils/caption.js'),
  'pages/share/share.js': read('pages/share/share.js')
}

function resolveKey(fromKey, spec) {
  const dir = fromKey.split('/').slice(0, -1).join('/')
  const parts = (dir ? dir + '/' : '').concat(spec).split('/')
  const out = []
  parts.forEach(function (p) {
    if (p === '.' || p === '') return
    if (p === '..') out.pop()
    else out.push(p)
  })
  return out.join('/')
}

const registry = Object.keys(MODULES).map(function (key) {
  return JSON.stringify(key) + ': function (module, exports, require) {\n' + MODULES[key] + '\n}'
}).join(',\n')

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#e9e7e0}canvas{display:block}</style>
</head><body>
<canvas id="c" width="800" height="1100"></canvas>
<script>
window.wx = {
  getStorageSync: function (k) { return '' },
  setStorageSync: function () {},
  getWindowInfo: function () { return { pixelRatio: 1 } },
  getSystemInfoSync: function () { return { pixelRatio: 1 } },
  createSelectorQuery: function () { return { in: function () { return this }, select: function () { return this }, fields: function () { return this }, exec: function () {} } }
};
window.getApp = function () { return { globalData: { cloudReady: false } } };
window.Page = function (o) { window.__page = o };
</script>
<script>
var __modules = {
${registry}
};
var __cache = {};
function __require(key) {
  if (__cache[key]) return __cache[key].exports;
  var m = { exports: {} };
  __cache[key] = m;
  var mod = __modules[key];
  if (!mod) throw new Error('missing module ' + key);
  mod(m, m.exports, function (spec) { return __require(__resolve(key, spec)) });
  return m.exports;
}
function __resolve(fromKey, spec) {
  var dir = fromKey.split('/').slice(0, -1).join('/');
  var parts = (dir ? dir + '/' : '').concat(spec).split('/');
  var out = [];
  parts.forEach(function (p) {
    if (p === '.' || p === '') return;
    if (p === '..') out.pop(); else out.push(p);
  });
  return out.join('/');
}
window.__require = __require;
__require('pages/share/share.js');
window.__U = __require('utils/util.js');
</script>
<script>
(function () {
  var U = window.__U;
  var page = window.__page;

  var ROWS = [
    { key: 'squat', name: '深蹲', muscle: '股四头肌·臀大肌', color: '#E0663C', total: 24, totalText: '24', sets: 8, setsText: '8', load: 2160, loadText: '2,160' },
    { key: 'hipbridge', name: '臀推', muscle: '臀大肌', color: '#C7628F', total: 20, totalText: '20', sets: 6, setsText: '6', load: 1800, loadText: '1,800' },
    { key: 'abduct', name: '髋外展', muscle: '臀中肌', color: '#7E6BC4', total: 18, totalText: '18', sets: 5, setsText: '5', load: 720, loadText: '720' },
    { key: 'bulgarian', name: '保加利亚蹲', muscle: '股四头肌·腘绳肌·臀大肌', color: '#3F8F6E', total: 16, totalText: '16', sets: 4, setsText: '4', load: 480, loadText: '480' },
    { key: 'pullup', name: '引体向上', muscle: '背阔肌·肱二头肌', color: '#4A7FB5', total: 15, totalText: '15', sets: 5, setsText: '5', load: 0, loadText: '0' }
  ];
  var today = U.today();
  var dayWeight = 5160;
  var fl = U.formatLoad(dayWeight);

  var STAT = {
    nick: '阿峰',
    date: today,
    dateText: U.prettyDate(today),
    week: U.weekName(today),
    heroLabel: '当日总重量',
    subLabel: '当日总次数',
    heroNum: 78,
    today: 78,
    dayWeight: dayWeight,
    dayWeightText: fl.text,
    dayWeightUnit: fl.unit,
    groups: 15,
    caption: '今天相当于挪动了一条蓝鲸，收工吧！',
    streak: 12,
    days: 88
  };

  /* 假头像：渐变底 + 首字，只为看清圆形裁切与大小 */
  function fakeAvatar(size) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d');
    var grad = g.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4C8DFF');
    grad.addColorStop(1, '#8B5CF6');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#FFFFFF';
    g.font = 'bold ' + Math.round(size * 0.42) + 'px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('峰', size / 2, size / 2 + size * 0.02);
    return cv;
  }

  function loadImg(src) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(img) };
      img.onerror = function () { res(null) };
      img.src = src;
    });
  }

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');

  Promise.all([loadImg('../../images/quip-whale.png')]).then(function (imgs) {
    var inst = Object.create(page);
    inst.data = { stat: STAT, rows: ROWS };
    page.paint.call(inst, ctx, { code: null, avatar: fakeAvatar(160), quip: imgs[0] });

    /* 第二张：24 字长文案，验证折行不溢出、不越界 */
    var long = '今天相当于挪动了三条座头鲸，这就是稳稳的幸福！';
    var c2 = document.createElement('canvas');
    c2.width = 800; c2.height = 1100;
    var inst2 = Object.create(page);
    inst2.data = { stat: Object.assign({}, STAT, { caption: long }), rows: ROWS };
    page.paint.call(inst2, c2.getContext('2d'), { code: null, avatar: fakeAvatar(160), quip: imgs[0] });

    /* 背景之外是透明区：量出海报真实高度，方便看比例 */
    function visibleH(cv) {
      /* 只扫最右一列：左下角的装饰圆会画到海报高度之外，整屏扫会量偏 */
      var col = cv.getContext('2d').getImageData(799, 0, 1, cv.height).data;
      for (var y = cv.height - 1; y >= 0; y--) {
        if (col[y * 4 + 3] > 0) return y + 1;
      }
      return 0;
    }

    var h1 = visibleH(canvas);
    var h2 = visibleH(c2);
    console.log('poster height', h1, h2);

    /* 两张裁到实际高度，上下拼到同一个画布上，一张图看全 */
    var out = document.createElement('canvas');
    out.width = 800;
    out.height = h1 + 16 + h2;
    var oc = out.getContext('2d');
    oc.drawImage(canvas, 0, 0, 800, h1, 0, 0, 800, h1);
    oc.drawImage(c2, 0, 0, 800, h2, 0, 16 + h1, 800, h2);

    document.body.innerHTML = '';
    document.body.appendChild(out);
    document.title = 'h1=' + h1 + ' h2=' + h2;
  });
})();
</script>
</body></html>`

const htmlPath = path.join(TMP, 'poster.html')
fs.writeFileSync(htmlPath, html)

const shot = path.join(TMP, 'share-poster-whale.png')
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--virtual-time-budget=4000',
  '--window-size=816,1900',
  '--screenshot=' + shot,
  'file:///' + htmlPath.replace(/\\/g, '/')
], { stdio: 'inherit' })

console.log('ok ->', shot)
