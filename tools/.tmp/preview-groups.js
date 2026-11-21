/* 临时预览：分组 tab + 负重纪录差距 + 项目页分组管理（不参与小程序打包）
 * 用法：node tools/.tmp/preview-groups.js
 */
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..')

function css(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/(-?\d*\.?\d+)rpx/g, '$1px')
}
const appCss = css('app.wxss').replace(/page\s*\{/, 'body{')
const BASE = '*{box-sizing:border-box}html,body{margin:0;padding:0}' +
  'view{display:block}image{display:block}text{display:inline}input{display:block}' +
  'body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}'

/* ---------------------- 打卡首页 ---------------------- */
const tabs = [
  { n: '全部', c: 4, on: false },
  { n: '上半身组', c: 2, on: true },
  { n: '下半身组', c: 1, on: false },
  { n: '核心组', c: 1, on: false }
]
const tabHtml = tabs.map(function (t) {
  return '<view class="group-tab' + (t.on ? ' on' : '') + '"><text>' + t.n + '</text>' +
    '<text class="group-tab-n">' + t.c + '</text></view>'
}).join('')

const cards = [
  { name: '俯卧撑', desc: '上肢 · 胸肩三头', icon: 'pushup', soft: '#E8F8F1', weight: '27.5', best: '纪录 40kg · 还差 12.5kg', tone: 'behind', reps: '12', sets: '3组 · 36次', load: '1,080', rank: '历史第 2 · 还差 320kg 进第 1' },
  { name: '臂力棒', desc: '上肢 · 胸肩三头', icon: 'powerbar', soft: '#FDEBEB', weight: '50', best: '纪录 50kg · 已追平', tone: 'match', reps: '10', sets: '2组 · 20次', load: '1,000', rank: '历史第 1 · 已是最高' },
  { name: '哑铃划船', desc: '背部 · 中背', icon: 'cablerow', soft: '#F1EBFE', weight: '60', best: '纪录 55kg · 超出 5kg', tone: 'ahead', reps: '10', sets: '1组 · 10次', load: '600', rank: '历史第 3 · 还差 240kg 进第 2' }
]
const cardHtml = cards.map(function (c) {
  return '<view class="ex-card">' +
    '<view class="ex-head">' +
      '<view class="ex-iconbox" style="background:' + c.soft + '"><image class="ex-icon-img" src="../../images/ex-' + c.icon + '.png"></image></view>' +
      '<view class="ex-bd">' +
        '<view class="ex-line"><text class="ex-name">' + c.name + '</text>' +
          '<view class="ex-line-stat"><text class="ex-load">' + c.load + 'kg</text><text class="ex-rank">' + c.rank + '</text></view>' +
        '</view>' +
        '<text class="ex-desc">' + c.desc + '</text>' +
        '<view class="weight-row">' +
          '<text class="best-hint ' + c.tone + '">' + c.best + '</text>' +
          '<text class="weight-label">负重</text>' +
          '<view class="weight-control"><input class="weight-input" value="' + c.weight + '"><text class="weight-unit">kg</text></view>' +
        '</view>' +
      '</view>' +
    '</view>' +
    '<view class="log-row">' +
      '<view class="wheel"><view class="wheel-window"></view><view class="wheel-center">' + c.reps + '</view>' +
        '<view class="wheel-fade left"></view><view class="wheel-fade right"></view></view>' +
      '<view class="ex-meta"><text class="ex-meta-t">' + c.sets + '</text><view class="ex-meta-ic"></view></view>' +
      '<view class="check-btn"><view class="check-ico"></view></view>' +
    '</view>' +
  '</view>'
}).join('')

const homeHtml = '<!doctype html><meta charset="utf-8"><style>' + BASE + appCss + css('pages/index/index.wxss') +
  /* 预览专用：拨轮静态化 + 输入框去边框 + 高亮新增部分 */
  '.wheel-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:40px;font-weight:700;color:#221F15;z-index:2}' +
  'input{border:0;background:transparent;outline:0;font-family:inherit}' +
  '.group-tabs{outline:2px dashed #E5484D;outline-offset:3px;border-radius:16px}' +
  '.best-hint{outline:1px dashed #E5484D;outline-offset:2px;border-radius:4px}' +
  '</style><body class="theme-lemon"><view class="page">' +
  '<view class="date-bar"><view class="date-arrow">‹</view><view class="date-main"><text class="date-text">6月12日 周五</text><text class="date-tag">今天</text></view><view class="date-arrow disabled">›</view></view>' +
  '<scroll-view class="group-tabs" style="display:block">' + tabHtml + '</scroll-view>' +
  '<view class="group-note">顶部概览为全天全部项目合计，下方只显示所选分组</view>' +
  '<view class="hero"><view class="hero-left"><view class="hero-label">当日总重量</view>' +
    '<view class="hero-num">2,680<text class="hero-unit">kg</text></view>' +
    '<view class="hero-weight"><text class="hero-weight-label">当日总次数</text><text class="hero-weight-num">66<text class="hero-weight-unit">次</text></text></view>' +
    '<view class="hero-sub">已完成 6 组 · 按体重 70kg 估算</view>' +
    '<view class="rank-tip">历史第 3 · 再做 320 kg 进第 2</view></view>' +
    '<view class="hero-right"><view class="hero-ring"><view class="ring-num"><text class="ring-pre">第</text>3</view></view></view></view>' +
  cardHtml +
  '<view class="foot-tip">数据保存在本机，换设备不会同步，记得定期备份</view>' +
  '</view></body>'

fs.writeFileSync(path.join(__dirname, 'preview-groups-home.html'), homeHtml)

/* ---------------------- 项目页 ---------------------- */
const groups = [
  { n: '默认', c: 3 },
  { n: '上半身组', c: 2 },
  { n: '下半身组', c: 1 },
  { n: '核心组', c: 1 }
]
const grpRows = groups.map(function (g, i) {
  return '<view class="grp-row"><view class="grp-idx">' + (i + 1) + '</view>' +
    '<view class="grp-bd"><text class="grp-nm">' + g.n + '</text><text class="grp-cnt">' + g.c + ' 个项目</text></view>' +
    '<view class="grp-ar">›</view></view>'
}).join('')
const filterChips = [{ n: '全部', on: false }].concat(groups.map(function (g, i) {
  return { n: g.n, on: i === 1 }
})).map(function (g) {
  return '<view class="grp-chip' + (g.on ? ' on' : '') + '"><text>' + g.n + '</text></view>'
}).join('')

const exList = [
  { name: '俯卧撑', icon: 'pushup', soft: '#E8F8F1', goal: 50, bw: 50, best: '40', group: '上半身组', builtin: true, fav: true },
  { name: '哑铃划船', icon: 'cablerow', soft: '#F1EBFE', goal: 30, bw: 0, best: '55', group: '上半身组', builtin: false, fav: true }
]
const exRows = exList.map(function (e) {
  return '<view class="ex-row">' +
    '<view class="ex-ic" style="background:' + e.soft + '"><image class="ex-img" src="../../images/ex-' + e.icon + '.png"></image></view>' +
    '<view class="ex-bd"><view class="ex-nm">' + e.name +
      (e.builtin ? '<text class="tag">内置</text>' : '') +
      '<text class="tag gray">' + e.group + '</text></view>' +
      '<view class="ex-go">每日目标 ' + e.goal + ' 次 · 自重 ' + e.bw + '% · 负重纪录 ' + e.best + 'kg</view></view>' +
    '<view class="ex-ar">›</view></view>'
}).join('')

const exHtml = '<!doctype html><meta charset="utf-8"><style>' + BASE + appCss + css('pages/exercise/exercise.wxss') +
  '.grp-row[data-new],.grp-filter[data-new]{outline:2px dashed #E5484D;outline-offset:2px;border-radius:8px}' +
  '</style><body class="theme-lemon"><view class="page">' +
  '<view class="card" data-new="1"><view class="card-title">项目分组<text class="sub">4 / 8</text></view>' +
    '<view class="tip">在「编辑项目」里给每个项目选所属分组；打卡首页会按这里显示为 tab，点分组可改名、调顺序或删除。</view>' +
    grpRows +
    '<view class="grp-add">+ 新建分组</view></view>' +
  '<view class="card"><view class="card-title">我的项目<text class="sub">7 / 24</text></view>' +
    '<view class="tip">打卡页按分组显示该组全部未隐藏项目。点项目可编辑目标、所属分组与自重比例。</view>' +
    '<view class="grp-filter" data-new="1">' + filterChips + '</view>' +
    '<view class="grp-shown">当前分组共 2 个项目</view>' +
    exRows + '</view>' +
  '<view class="btn btn-primary btn-block">+ 新增项目</view>' +
  '<view class="foot-tip">内置项目不可删除（可改名或隐藏），连同自定义项目最多共 24 个</view>' +
  '</view></body>'

fs.writeFileSync(path.join(__dirname, 'preview-groups-exercise.html'), exHtml)

/* ---------------------- 并排合页（iframe 各自独立样式，互不污染） ---------------------- */
const wrap = '<!doctype html><meta charset="utf-8"><style>' +
  'html,body{margin:0;padding:0;background:#EAE6DA;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}' +
  '.row{display:flex;gap:16px;padding:16px;align-items:flex-start}' +
  '.col{width:750px;flex:none}' +
  '.lbl{font-size:16px;font-weight:700;color:#55514A;margin:0 0 10px 2px;letter-spacing:1px}' +
  'iframe{width:750px;height:1560px;border:0;background:#fff;border-radius:20px;box-shadow:0 6px 24px rgba(0,0,0,.12)}' +
  '</style><div class="row">' +
  '<div class="col"><div class="lbl">打卡首页 · 分组 tab + 负重纪录差距</div><iframe src="preview-groups-home.html"></iframe></div>' +
  '<div class="col"><div class="lbl">项目页 · 分组管理 + 项目归属</div><iframe src="preview-groups-exercise.html"></iframe></div>' +
  '</div>'
fs.writeFileSync(path.join(__dirname, 'preview-groups.html'), wrap)
console.log('ok')
