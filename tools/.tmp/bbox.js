/* 量 quip-whale.png 的透明留白（一次性检查用） */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const img = 'file:///' + path.join(ROOT, 'images/quip-whale.png').replace(/\\/g, '/')

const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#F7F5EC;font:14px monospace}canvas{display:block}</style>
<canvas id="c" width="192" height="230"></canvas>
<script>
var cv = document.getElementById('c'), ctx = cv.getContext('2d');
var im = new Image();
im.onload = function () {
  ctx.drawImage(im, 0, 0);
  var d = ctx.getImageData(0, 0, 192, 192).data;
  var x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (var y = 0; y < 192; y++) for (var x = 0; x < 192; x++) {
    if (d[(y * 192 + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  ctx.strokeStyle = '#E11'; ctx.lineWidth = 1;
  ctx.strokeRect(x0 + .5, y0 + .5, x1 - x0, y1 - y0);
  ctx.fillStyle = '#111'; ctx.font = '13px monospace';
  ctx.fillText('bbox ' + x0 + ',' + y0 + ' - ' + x1 + ',' + y1, 6, 210);
  ctx.fillText('w ' + (x1 - x0 + 1) + '  h ' + (y1 - y0 + 1), 6, 226);
};
im.src = '${img}';
</script>`

const p = path.join(__dirname, 'bbox.html')
fs.writeFileSync(p, html)
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--virtual-time-budget=2000', '--window-size=192,230',
  '--screenshot=' + path.join(__dirname, 'bbox.png'),
  'file:///' + p.replace(/\\/g, '/')
], { stdio: 'ignore' })
console.log('ok')
