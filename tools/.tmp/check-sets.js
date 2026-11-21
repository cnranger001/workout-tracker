/* 用内存假 wx + vm 跑 share 页的数据链路：每行是否带总组数、分享链接能否往返 */
const path = require('path')
const fs = require('fs')
const vm = require('vm')
const ROOT = path.resolve(__dirname, '../..')
const mem = {}

const wx = {
  getStorageSync: function (k) { return mem[k] === undefined ? '' : mem[k] },
  setStorageSync: function (k, v) { mem[k] = v },
  removeStorageSync: function (k) { delete mem[k] },
  getSystemInfoSync: function () { return { windowWidth: 375, windowHeight: 812, platform: 'devtools' } },
  getStorageInfoSync: function () { return { keys: Object.keys(mem) } }
}
global.wx = wx

const S = require(path.join(ROOT, 'utils/store.js'))
const U = require(path.join(ROOT, 'utils/util.js'))

S.addExercise('深蹲', '🏋️', '#E0663C', 'squat')
S.addExercise('臀推', '🍑', '#C7628F', 'hipbridge')
S.addExercise('引体向上', '💪', '#4A7FB5', 'pullup')

const map = S.getExerciseMap()
const byName = function (n) {
  return Object.keys(map).filter(function (k) { return map[k].name === n })[0]
}
const d = U.today()
const sq = byName('深蹲'), hp = byName('臀推'), pu = byName('引体向上')

S.addSet(d, sq, 10, 60)
S.addSet(d, sq, 10, 60)
S.addSet(d, sq, 8, 70)
S.addSet(d, hp, 12, 40)
S.addSet(d, hp, 12, 40)
S.addSet(d, pu, 8, 0)

/* 把 share.js 里内部函数挂出来跑，避免复制一份逻辑 */
const src = fs.readFileSync(path.join(ROOT, 'pages/share/share.js'), 'utf8')
  + '\nmodule.exports = { snapshot: snapshot, buildQuery: buildQuery, parseQuery: parseQuery };'

const sandbox = {
  module: { exports: {} },
  console: console,
  wx: wx,
  Page: function () {},
  getApp: function () { return {} },
  require: function (p) { return require(path.resolve(path.join(ROOT, 'pages/share'), p)) }
}
sandbox.global = sandbox
vm.createContext(sandbox)
vm.runInContext(src, sandbox)
const share = sandbox.module.exports

const snap = share.snapshot(d)
console.log('--- rows（组数 | 次数 | 训练量）---')
snap.rows.forEach(function (r) {
  console.log([r.name, r.setsText + ' 组', r.totalText + ' 次', r.loadText + ' kg'].join(' | '))
})
const sumSets = snap.rows.reduce(function (a, r) { return a + r.sets }, 0)
console.log('行内组数合计 =', sumSets, '/ 顶部总组数 =', snap.stat.groups, sumSets === snap.stat.groups ? 'OK' : 'MISMATCH')

const q = share.buildQuery(snap.stat, snap.rows)
const toObj = function (str) {
  const o = {}
  str.split('&').forEach(function (kv) {
    const i = kv.indexOf('=')
    o[kv.slice(0, i)] = kv.slice(i + 1)
  })
  return o
}
console.log('--- 链接（解码后）---')
console.log(decodeURIComponent(q.replace(/&cp=[^&]*/, '')).slice(0, 200))

const back = share.parseQuery(toObj(q))
console.log('--- 链接回读 ---')
back.rows.forEach(function (r) {
  console.log([r.name, r.setsText + ' 组', r.totalText + ' 次', r.loadText + ' kg'].join(' | '))
})

/* 老链接：砍掉第 9 段，应退化为「没有组数」，且不显示 0 组 */
const legacyObj = toObj(q)
legacyObj.it = decodeURIComponent(legacyObj.it).split('!').map(function (seg) {
  return seg.split('~').slice(0, 8).join('~')
}).join('!')
const old = share.parseQuery(legacyObj)
console.log('--- 老链接（8 段）---')
old.rows.forEach(function (r) {
  console.log([r.name, 'sets=' + r.sets, r.setsText + ' 组', r.totalText + ' 次'].join(' | '))
})
