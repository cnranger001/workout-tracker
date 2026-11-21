/* 校验统计页新增的项目累计吨数：逐项之和是否等于全历史总吨数 */
const path = require('path')
const ROOT = path.resolve(__dirname, '../..')
const mem = {}
global.wx = {
  getStorageSync: function (k) { return mem[k] === undefined ? '' : mem[k] },
  setStorageSync: function (k, v) { mem[k] = v },
  removeStorageSync: function (k) { delete mem[k] },
  getSystemInfoSync: function () { return { windowWidth: 375, platform: 'devtools' } },
  getStorageInfoSync: function () { return { keys: Object.keys(mem) } }
}

const S = require(path.join(ROOT, 'utils/store.js'))
const U = require(path.join(ROOT, 'utils/util.js'))

S.saveProfile({ weight: 70 })
S.addExercise('深蹲', '🏋️', '#E0663C', 'squat')
S.addExercise('臀推', '🍑', '#C7628F', 'hipbridge')
S.addExercise('引体向上', '💪', '#4A7FB5', 'pullup')

const map = S.getExerciseMap()
const byName = function (n) {
  return Object.keys(map).filter(function (k) { return map[k].name === n })[0]
}
const sq = byName('深蹲'), hp = byName('臀推'), pu = byName('引体向上')

const days = [0, 1, 2, 5, 9].map(function (off) { return U.addDays(U.today(), -off) })
days.forEach(function (d, i) {
  S.addSet(d, sq, 10 + i, 60)
  S.addSet(d, sq, 8, 80)
  S.addSet(d, hp, 12, 40)
  if (i % 2 === 0) S.addSet(d, pu, 8, 0)
})

const loads = S.totalWeightByType()
console.log('--- totalWeightByType ---')
Object.keys(loads).forEach(function (k) {
  const name = (S.getExerciseMap()[k] || {}).name || k
  const fl = U.formatLoad(loads[k])
  console.log([name, loads[k] + ' kg', fl.text + ' ' + fl.unit].join(' | '))
})
const sumByType = Object.keys(loads).reduce(function (a, k) { return a + loads[k] }, 0)
const sumByDay = S.getAllDates().reduce(function (a, d) { return a + S.totalWeightOfDay(d) }, 0)
console.log('逐项合计 =', Math.round(sumByType), '/ 逐日合计 =', Math.round(sumByDay),
  Math.round(sumByType) === Math.round(sumByDay) ? 'OK' : 'MISMATCH')
console.log('总吨数展示 =', U.formatLoad(Math.round(sumByType)).text + ' ' + U.formatLoad(Math.round(sumByType)).unit)

/* 吨位格式化边界 */
;[999, 1000, 1234, 12345, 128400].forEach(function (v) {
  const f = U.formatLoad(v)
  console.log('formatLoad(' + v + ') =', f.text + ' ' + f.unit)
})

/* 吨位分桶：日/周/月三种粒度的首尾、合计与边界 */
;['day', 'week', 'month'].forEach(function (g) {
  const bs = S.weightBuckets(g, 30)
  const kg = bs.reduce(function (a, b) { return a + b.kg }, 0)
  console.log('--- ' + g + ' ---')
  console.log('桶数', bs.length, '| 首桶', bs[0].start, '~', bs[0].end, bs[0].label,
    '| 末桶', bs[bs.length - 1].start, '~', bs[bs.length - 1].end, bs[bs.length - 1].label)
  console.log('合计', kg, 'kg |', (kg / 1000).toFixed(2), '吨')
})
/* 30 天日桶合计应等于全历史（本用例数据只在近 5 天内） */
const dayBuckets = S.weightBuckets('day', 30)
const total = S.getAllDates().reduce(function (a, d) { return a + S.totalWeightOfDay(d) }, 0)
console.log('day 桶合计 vs 全历史:', dayBuckets.reduce(function (a, b) { return a + b.kg }, 0), Math.round(total))
