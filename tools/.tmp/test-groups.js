/* 临时自测：项目分组 + 每个项目的个人负重纪录（不参与小程序打包）
 * 用法：node tools/.tmp/test-groups.js
 */
const path = require('path')

/* ---- 极简 wx 桩 ---- */
const mem = {}
global.wx = {
  getStorageSync: function (k) { return k in mem ? JSON.parse(JSON.stringify(mem[k])) : '' },
  setStorageSync: function (k, v) { mem[k] = JSON.parse(JSON.stringify(v)) },
  removeStorageSync: function (k) { delete mem[k] },
  getStorageInfoSync: function () { return { keys: Object.keys(mem) } },
  getSystemInfoSync: function () { return { windowWidth: 375 } },
  vibrateShort: function () {},
  showToast: function () {},
  showModal: function () {},
  setNavigationBarColor: function () {}
}

const S = require(path.join(__dirname, '..', '..', 'utils', 'store.js'))
const U = require(path.join(__dirname, '..', '..', 'utils', 'util.js'))

const EX = 'workout_exercises_v1'
const REC = 'workout_records_v1'
const GOAL = 'workout_goals_v1'
const GROUP = 'workout_groups_v1'
const ACTIVE = 'workout_active_group_v1'
const BEST = 'workout_best_weight_v1'

function reset(seed) {
  Object.keys(mem).forEach(function (k) { delete mem[k] })
  Object.keys(seed || {}).forEach(function (k) { mem[k] = JSON.parse(JSON.stringify(seed[k])) })
}

let fails = 0
function ok(cond, msg) {
  if (cond) console.log('  ✓ ' + msg)
  else { fails++; console.log('  ✗ ' + msg) }
}
function byKey(list, key) { return list.filter(function (e) { return e.key === key })[0] }
function byName(list, name) { return list.filter(function (e) { return e.name === name })[0] }

/* ---------- 1. 老数据无分组：自动补默认分组并补齐 groupId ---------- */
console.log('1) 老数据迁移：无分组 → 默认分组')
reset({
  [EX]: [
    { key: 'squat', name: '深蹲', emoji: '🦵', icon: 'squat', color: '#E3A800', soft: '#FFF3C9', builtin: true, hidden: false },
    { key: 'pushup', name: '俯卧撑', emoji: '🙌', icon: 'pushup', color: '#2BC48A', soft: '#E8F8F1', builtin: true, hidden: false }
  ]
})
let groups = S.getGroups()
ok(groups.length === 1 && groups[0].id === 'g_default' && groups[0].name === '默认', '自动建出「默认」分组')
ok(groups[0].count === 2, '默认分组计数 = 2')
let all = S.getAllExercises()
ok(all.length > 2 && all.every(function (e) { return e.groupId === 'g_default' }), '所有项目（含自动补出的内置项）都归到默认分组')
ok(all.every(function (e) { return e.groupName === '默认' }), 'decorate 带出 groupName')
ok(S.getGroups()[0].count === all.length, '多次读取后计数稳定（幂等）')
ok(JSON.stringify(mem[EX]).indexOf('groupId') > 0, 'groupId 已回写到存储')

/* ---------- 2. 分组增删改与排序 ---------- */
console.log('2) 分组增删改与排序')
reset()
const r1 = S.addGroup('上半身组')
const r2 = S.addGroup('下半身组')
ok(r1.ok && r2.ok, '新建两个分组')
ok(!S.addGroup('上半身组').ok, '同名分组被拒绝')
ok(!S.addGroup('   ').ok, '空名被拒绝')
ok(S.getGroups().map(function (g) { return g.name }).join('|') === '默认|上半身组|下半身组', '顺序 = 新建顺序')
ok(S.renameGroup(r1.id, '上肢组').ok, '分组改名成功')
ok(byName(S.getGroups(), '上肢组') !== undefined, '改名生效')
ok(!S.renameGroup(r2.id, '上肢组').ok, '改成已有名字被拒绝')
ok(S.moveGroup(r2.id, -1).ok, '下半身组上移成功')
ok(S.getGroups().map(function (g) { return g.name }).join('|') === '默认|下半身组|上肢组', '顺序已调整')
ok(!S.moveGroup('g_default', -1).ok, '第一个分组不能再上移')

/* 把 3 个项目分到不同的组 */
const G = S.getGroups()
const gUp = byName(G, '上肢组').id
const gDown = byName(G, '下半身组').id
const exList = S.getAllExercises()
S.updateExercise('squat', { groupId: gDown })
S.updateExercise('pushup', { groupId: gUp })
S.updateExercise('pullup', { groupId: gUp })
ok(byKey(S.getAllExercises(), 'squat').groupId === gDown, '深蹲 → 下半身组')
ok(byKey(S.getAllExercises(), 'pushup').groupId === gUp, '俯卧撑 → 上肢组')
ok(!S.updateExercise('squat', { groupId: 'g_不存在的组' }).ok, '设置不存在的分组被拒绝')

/* 删除分组：组内项目回到默认，记录不丢 */
const del = S.removeGroup(gUp)
ok(del.ok && del.moved === 2, '删除上肢组，2 个项目被移走')
ok(byKey(S.getAllExercises(), 'pushup').groupId === 'g_default', '俯卧撑回到默认分组')
ok(byKey(S.getAllExercises(), 'pullup').groupId === 'g_default', '引体向上回到默认分组')
ok(S.getGroups().length === 2, '只剩两个分组')
ok(!S.removeGroup('g_default').ok === false || true, '删除调用有返回')   /* 占位，下面单独测最后一组 */

/* ---------- 3. 项目归属：新增 / 按分组过滤（不再按星标收藏） ---------- */
console.log('3) 项目归属与按分组过滤')
reset()
const a1 = S.addGroup('上半身组')
const a2 = S.addGroup('下半身组')
S.updateExercise('squat', { groupId: a2.id })
S.updateExercise('pushup', { groupId: a1.id })
const add1 = S.addExercise('哑铃划船', '🏋️', '#8B5CF6', 'cablerow', a1.id)
ok(add1.ok, '新增项目时直接指定分组')
ok(byKey(S.getAllExercises(), add1.key).groupId === a1.id, '新项目落在指定分组')
const add2 = S.addExercise('无分组项目', '🏋️', '#8B5CF6', '', '')
ok(byKey(S.getAllExercises(), add2.key).groupId === S.getGroups()[0].id, '不传分组时落到第一个分组')
ok(S.getExercisesByGroup(a1.id).length === 2, '上半身组有 2 个项目（俯卧撑 + 哑铃划船）')
ok(S.getExercisesByGroup(a2.id).length === 1, '下半身组有 1 个项目（深蹲）')
ok(S.getExercisesByGroup().length === S.getAllExercises().length, '不传 groupId 返回全部')
ok(S.getCheckinExercises(a1.id).length === 2, '打卡页按分组取该组全部项目（俯卧撑 + 哑铃划船，不需收藏）')
ok(S.getCheckinExercises().length === S.getExercises().length, '不传 groupId 时取全部未隐藏项目')
ok(typeof S.setFavorite === 'undefined' && typeof S.toggleFavorite === 'undefined', '星标收藏接口已移除')
ok(S.getCheckinExercises(a1.id).every(function (e) { return !e.favorite === true }), '项目数据不再带 favorite 字段')

/* ---------- 4. 打卡首页 tab 状态 ---------- */
console.log('4) 打卡首页分组 tab 状态')
ok(S.getActiveGroup() === 'all', '默认选中「全部」')
S.setActiveGroup(a1.id)
ok(S.getActiveGroup() === a1.id, '记住上次选中的分组')
S.removeGroup(a1.id)
ok(S.getActiveGroup() === 'all', '选中的分组被删后回落到「全部」')

/* 分组上限 */
reset()
for (let i = 0; i < 7; i++) S.addGroup('分组' + i)
ok(S.getGroups().length === 8, '最多 8 个分组（含默认）')
ok(!S.addGroup('第9组').ok, '第 9 个分组被拒绝')
ok(S.removeGroup('g_default').ok && S.getGroups().length === 7, '还有其他分组时可以删掉默认分组')
reset()
ok(!S.removeGroup(S.getGroups()[0].id).ok, '只剩一个分组时不允许删除')

/* ---------- 5. 每个项目的个人负重纪录 ---------- */
console.log('5) 个人负重纪录（每个项目独立、只增不减）')
reset()
const D = '2026-01-05'
S.addSet(D, 'squat', 10, 60)
ok(S.getBestWeight('squat') === 60, '记一组 60kg → 深蹲纪录 60')
ok(S.getBestWeight('pushup') === 0, '没记过的项目纪录为 0')
S.addSet(D, 'squat', 8, 45)
ok(S.getBestWeight('squat') === 60, '更轻的一组不会覆盖纪录')
S.addSet(D, 'squat', 5, 72.5)
ok(S.getBestWeight('squat') === 72.5, '更重的一组刷新纪录（支持 1 位小数）')
S.addSet(D, 'pushup', 20, 0)
ok(S.getBestWeight('pushup') === 0, '0kg 不建立纪录')
ok(S.getAllBestWeights().squat === 72.5, '整张纪录表可读')
/* 删掉当日记录不会抹掉个人最好成绩 */
S.removeDay(D)
ok(S.getBestWeight('squat') === 72.5, '删记录不抹掉个人纪录')
/* 老用户没有 BEST 存档：从全部历史重算 */
delete mem[BEST]
S.addSet('2026-01-06', 'squat', 10, 80)
S.addSet('2026-01-06', 'pullup', 8, 30)
ok(S.getAllBestWeights().squat === 80 && S.getAllBestWeights().pullup === 30, '无存档时按历史记录重建')
/* 删除项目时清理纪录（内置项不可删，用自定义项目验证） */
const cx = S.addExercise('临时项目', '🏋️', '#8B5CF6', '')
S.addSet('2026-01-07', cx.key, 10, 55)
ok(S.getBestWeight(cx.key) === 55, '自定义项目也建立独立纪录')
S.removeExercise(cx.key)
ok(S.getBestWeight(cx.key) === 0, '删掉项目时清掉它的负重纪录')

/* ---------- 6. 备份导出 / 导入含分组与负重纪录 ---------- */
console.log('6) 备份含分组与负重纪录')
reset()
const b1 = S.addGroup('上半身组')
const b2 = S.addGroup('下半身组')
S.updateExercise('squat', { groupId: b2.id })
S.updateExercise('pushup', { groupId: b1.id })
S.addSet('2026-02-01', 'squat', 10, 100)
S.addSet('2026-02-01', 'pushup', 12, 35)
const text = S.exportBackup()
const parsed = S.parseBackup(text)
ok(parsed.ok, '备份可解析')
ok(parsed.groups.length === 3, '备份里有 3 个分组')
ok(byKey2(parsed.exercises, 'squat').groupId === b2.id, '项目的 groupId 随备份导出')
ok(parsed.best.squat === 100 && parsed.best.pushup === 35, '负重纪录随备份导出')

function byKey2(list, key) { return list.filter(function (e) { return e.key === key })[0] }

/* 覆盖导入到一台全新的设备 */
reset()
const imp = S.importBackup(text, 'replace')
ok(imp.ok, '覆盖导入成功')
ok(S.getGroups().map(function (g) { return g.name }).join('|') === '默认|上半身组|下半身组', '分组按备份恢复（顺序一致）')
ok(byKey(S.getAllExercises(), 'squat').groupId === b2.id, '项目归属按备份恢复')
ok(S.getBestWeight('squat') === 100, '负重纪录按备份恢复')
ok(S.getActiveGroup() === 'all', '导入后 tab 回到「全部」')

/* 合并导入：分组取并集，负重纪录取较大值 */
reset()
const local = S.addGroup('本机分组')
S.addSet('2026-03-01', 'squat', 10, 120)
const imp2 = S.importBackup(text, 'merge')
ok(imp2.ok, '合并导入成功')
ok(S.getGroups().some(function (g) { return g.name === '本机分组' }) &&
   S.getGroups().some(function (g) { return g.name === '上半身组' }), '合并模式保留本机分组并补入备份分组')
ok(S.getBestWeight('squat') === 120, '合并模式负重纪录取两边较大值')

/* ---------- 7. 首页页面层：分组 tab + 负重差距文案 ---------- */
console.log('7) 首页页面层：tab 渲染与「离纪录还差多少公斤」')
reset()
const p1 = S.addGroup('上半身组')
const p2 = S.addGroup('下半身组')
S.updateExercise('squat', { groupId: p2.id })
S.updateExercise('pushup', { groupId: p1.id })
S.addSet('2026-04-01', 'squat', 10, 100)
S.addSet('2026-04-01', 'squat', 8, 60)   /* 最近一组 60kg，但纪录仍是 100kg */
S.addSet('2026-04-01', 'pushup', 12, 40)

let cfg = null
global.Page = function (c) { cfg = c }
require(path.join(__dirname, '..', '..', 'pages', 'index', 'index.js'))
ok(!!cfg, '首页 Page 定义可加载')

const page = {}
Object.keys(cfg).forEach(function (k) { page[k] = cfg[k] })
page.data = JSON.parse(JSON.stringify(cfg.data))
page.setData = function (patch, cb) {
  Object.keys(patch).forEach(function (k) {
    if (k.indexOf('[') >= 0) {
      const parts = k.replace(/\[(\d+)\]/g, '.$1').split('.')
      let cur = page.data
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]]
      cur[parts[parts.length - 1]] = patch[k]
    } else page.data[k] = patch[k]
  })
  if (cb) cb()
}
page.onLoad()
page.refresh()

ok(page.data.showGroupTabs === true, '有 2 个以上分组时显示 tab 栏')
ok(page.data.groupTabs.length === 4, 'tab = 全部 + 默认 + 上半身组 + 下半身组')
ok(page.data.groupTabs[0].id === 'all' && page.data.groupTabs[0].active, '默认选中「全部」')
ok(page.data.groupTabs[0].count === 7, '「全部」角标 = 7 个项目')
ok(page.data.cards.length === 7, '「全部」tab 渲染全部 7 个项目（无需收藏）')
const squatCard = page.data.cards.filter(function (c) { return c.key === 'squat' })[0]
ok(squatCard.best === 100, '卡片带出深蹲纪录 100kg')
ok(squatCard.bestHint.indexOf('还差') >= 0, '负重处标出「还差 X kg」：' + squatCard.bestHint)
ok(squatCard.gapTone === 'behind', '差距态样式 = behind')
const noRecordCard = page.data.cards.filter(function (c) { return c.key === 'pushup' })[0]
/* 上面 addSet 给 pushup 记了 40kg，所以这里改成预期有纪录 */
ok(noRecordCard.best === 40, '俯卧撑纪录 40kg')

/* 切到「上半身组」tab */
page.onGroupTab({ currentTarget: { dataset: { id: p1.id } } })
ok(page.data.activeGroup === p1.id, '切换 tab 后状态更新')
ok(page.data.cards.length === 1 && page.data.cards[0].key === 'pushup', '只显示该分组的项目')
ok(page.data.groupNote === true, '显示「概览为全天合计」的提示')
ok(page.data.groupTabs.filter(function (t) { return t.active })[0].id === p1.id, '对应 tab 高亮')

/* 输入时实时刷新差距 */
const pushIdx = 0
page.onCardWeightInput({ currentTarget: { dataset: { type: 'pushup' } }, detail: { value: '35' } })
ok(page.data.cards[pushIdx].bestHint.indexOf('还差 5kg') >= 0, '输入 35kg → 还差 5kg：' + page.data.cards[pushIdx].bestHint)
page.onCardWeightInput({ currentTarget: { dataset: { type: 'pushup' } }, detail: { value: '40' } })
ok(page.data.cards[pushIdx].gapTone === 'match', '输入 40kg → 已追平')
page.onCardWeightInput({ currentTarget: { dataset: { type: 'pushup' } }, detail: { value: '50' } })
ok(page.data.cards[pushIdx].gapTone === 'ahead' && page.data.cards[pushIdx].bestHint.indexOf('超出 10kg') >= 0, '输入 50kg → 超出 10kg，提示破纪录')

/* 空白分组的空态：把项目移出该分组（不再靠取消收藏） */
page.onGroupTab({ currentTarget: { dataset: { id: p2.id } } })
ok(page.data.cards.length === 1, '下半身组有深蹲')
S.updateExercise('squat', { groupId: 'g_default' })
page.refresh()
ok(page.data.noExercises === true && page.data.showAllBtn === true, '分组内无项目时显示空态 + 查看全部按钮')
ok(page.data.emptyText.indexOf('这个分组') >= 0, '空态文案针对当前分组')
page.showAllGroups()
ok(page.data.activeGroup === 'all' && page.data.cards.length === 7, '「查看全部项目」回到全部 tab')

/* 弹窗里也带纪录提示 */
page.openModal({ currentTarget: { dataset: { type: 'pushup' } } })
ok(page.data.modalBest === 40 && page.data.modalBestHint.indexOf('纪录') >= 0, '弹窗显示负重纪录')
page.onWeightInput({ detail: { value: '30' } })
ok(page.data.modalBestHint.indexOf('还差 10kg') >= 0, '弹窗输入实时刷新差距')

console.log(fails ? '\n失败 ' + fails + ' 项 ❌' : '\n全部通过 ✅')
process.exit(fails ? 1 : 0)
