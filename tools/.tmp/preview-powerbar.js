/* 临时预览：把几个图标并排渲染，用来比对风格（不参与小程序打包） */
const fs = require('fs')
const path = require('path')
const SVG = path.join(__dirname, '..', 'svg')
const read = function (k) { return fs.readFileSync(path.join(SVG, k + '.svg'), 'utf8') }

const cells = ['powerbar', 'backext', 'curl', 'pushup', 'ohp', 'lateral'].map(function (k) {
  return '<div class="cell"><div class="big">' + read(k) + '</div><div class="k">' + k + '</div>' +
    '<div class="chip">' + read(k) + '</div></div>'
}).join('')

fs.writeFileSync(path.join(__dirname, 'preview-powerbar.html'),
  '<!doctype html><meta charset="utf-8"><style>' +
  'body{margin:0;background:#FAF8EF;font:12px/1.4 -apple-system,system-ui,sans-serif;color:#3A2F00;' +
  'display:flex;gap:14px;padding:16px;align-items:flex-start}' +
  '.cell{text-align:center}' +
  '.big svg{width:180px;height:180px;display:block;background:#fff;border-radius:26px}' +
  '.chip{width:78px;height:78px;border-radius:20px;background:#FFF3C9;display:flex;align-items:center;justify-content:center;margin:6px auto}' +
  '.chip svg{width:54px;height:54px;display:block}' +
  '.k{margin-top:4px;color:#8A8378}</style>' + cells)

console.log('preview written')
