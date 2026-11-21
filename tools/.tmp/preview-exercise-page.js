/* 临时预览：把「项目」页列表渲染成 HTML，用真实 wxss 样式看效果（不参与小程序打包）
 * 用法：node tools/.tmp/preview-exercise-page.js  → tools/.tmp/preview-exercise-page.html
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..')

function css(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/(-?\d*\.?\d+)rpx/g, '$1px')
}

const list = [
  { name: '深蹲', icon: 'squat', soft: '#FFF3C9', goal: 50, bw: 0, builtin: true, fav: true },
  { name: '引体向上', icon: 'pullup', soft: '#FFF3E6', goal: 20, bw: 90, builtin: true, fav: true },
  { name: '俯卧撑', icon: 'pushup', soft: '#E8F8F1', goal: 50, bw: 50, builtin: true, fav: false },
  { name: '山羊挺身', icon: 'backext', soft: '#FEF3E2', goal: 30, bw: 50, builtin: true, fav: false },
  { name: '臂力棒', icon: 'powerbar', soft: '#FDEBEB', goal: 20, bw: 0, builtin: true, fav: true, hot: true },
  { name: '坐/卧 弯腿举', icon: 'legcurl', soft: '#FDEAEE', goal: 30, bw: 0, builtin: true, fav: false, hot: true },
  { name: '倒蹬机', icon: 'legpress', soft: '#E4F6FA', goal: 40, bw: 0, builtin: true, fav: false, hot: true }
]

const rows = list.map(function (e) {
  return '<view class="ex-row' + (e.hot ? ' hot' : '') + '">' +
    '<view class="ex-ic" style="background:' + e.soft + '"><image class="ex-img" src="../../images/ex-' + e.icon + '.png"></image></view>' +
    '<view class="ex-bd"><view class="ex-nm">' + e.name +
    (e.builtin ? '<text class="tag">内置</text>' : '') +
    '</view><view class="ex-go">每日目标 ' + e.goal + ' 次 · 自重 ' + e.bw + '%</view></view>' +
    '<view class="ex-ar">›</view></view>'
}).join('')

const html = '<!doctype html><meta charset="utf-8"><style>' +
  '*{box-sizing:border-box}' +
  'html,body{margin:0;padding:0}' +
  css('app.wxss').replace(/page\s*\{/, 'body{') +
  css('pages/exercise/exercise.wxss') +
  /* 预览专用：把 view/image 当块级元素，模拟小程序渲染 */
  'view{display:block}image{display:block}text{display:inline}' +
  '.hot{outline:2px dashed #E5484D;outline-offset:-2px;border-radius:20px}' +
  '</style>' +
  '<body class="theme-lemon"><view class="page">' +
  '<view class="card"><view class="card-title">我的项目<text class="sub">' + list.length + ' / 24</text></view>' +
  '<view class="tip">打卡页按分组显示该组全部未隐藏项目。点项目可编辑目标、所属分组与自重比例。</view>' +
  rows + '</view>' +
  '<view class="foot-tip">内置项目不可删除（可改名或隐藏），连同自定义项目最多共 24 个</view>' +
  '</view></body>'

fs.writeFileSync(path.join(__dirname, 'preview-exercise-page.html'), html)
console.log('ok')
