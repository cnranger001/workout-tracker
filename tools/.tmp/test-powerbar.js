/* 临时自测：验证「臂力棒」升级为内置项的迁移逻辑（不参与小程序打包）
 * 用法：node tools/.tmp/test-powerbar.js
 */
const path = require('path')

/* ---- 极简 wx 桩：内存 storage + 几个用到的 API ---- */
const mem = {}
global.wx = {
  getStorageSync: function (k) { return k in mem ? JSON.parse(JSON.stringify(mem[k])) : '' },
  setStorageSync: function (k, v) { mem[k] = JSON.parse(JSON.stringify(v)) },
  removeStorageSync: function (k) { delete mem[k] },
  getStorageInfoSync: function () { return { keys: Object.keys(mem) } }
}

const S = require(path.join(__dirname, '..', '..', 'utils', 'store.js'))
const EX = 'workout_exercises_v1'
const REC = 'workout_records_v1'
const GOAL = 'workout_goals_v1'
const REPS = 'workout_reps_v1'
const LW = 'workout_last_weight_v1'
const BEST = 'workout_best_weight_v1'
const DEFAULT_GROUP_ID = 'g_default'

function reset(seed) {
  Object.keys(mem).forEach(function (k) { delete mem[k] })
  Object.keys(seed || {}).forEach(function (k) { mem[k] = seed[k] })
}

let fails = 0
function ok(cond, msg) {
  if (cond) console.log('  ✓ ' + msg)
  else { fails++; console.log('  ✗ ' + msg) }
}

/* ---------- 1. 全新安装 ---------- */
console.log('1) 全新安装')
reset()
let list = S.getAllExercises()
const pb = list.filter(function (e) { return e.key === 'powerbar' })[0]
ok(!!pb, '内置项里有 powerbar')
ok(pb && pb.name === '臂力棒', '名称是「臂力棒」')
ok(pb && pb.builtin === true, 'builtin = true（不可删除）')
ok(pb && pb.iconPath === '/images/ex-powerbar.png', '图标路径正确')
ok(pb && pb.goal === 20, '默认每日目标 20 次')
ok(pb && pb.defaultWeight === 40, '默认负重 40kg')
ok(pb && pb.bwPercent === 0, '自重比例 0%')
const del = S.removeExercise('powerbar')
ok(!del.ok, '尝试删除被拒绝：' + (del.reason || ''))
ok(S.getPresets().every(function (p) { return p.name !== '臂力棒' }), '推荐项目里不再出现臂力棒')

/* 倒蹬机：全新安装时的内置状态 */
const lp = list.filter(function (e) { return e.key === 'legpress' })[0]
ok(!!lp, '内置项里有 legpress')
ok(lp && lp.name === '倒蹬机' && lp.builtin === true, '名称「倒蹬机」、builtin = true')
ok(lp && lp.iconPath === '/images/ex-legpress.png', '沿用现有倒蹬机图标')
ok(lp && lp.goal === 40 && lp.bwPercent === 0, '默认目标 40 次、自重 0%（座椅承重）')
ok(!S.removeExercise('legpress').ok, '倒蹬机不可删除')
ok(S.getPresets().some(function (p) { return p.name === '倒蹬' }), '「倒蹬」仍作为独立推荐项目保留')

/* ---------- 2. 老用户：从推荐项目加过「臂力棒」，有历史记录 ---------- */
console.log('2) 老用户已有自定义「臂力棒」+ 记录')
reset({
  [EX]: [
    { key: 'squat', name: '深蹲', emoji: '🦵', icon: 'squat', color: '#E3A800', soft: '#FFF3C9', desc: '下肢 · 股四头肌', builtin: true },
    { key: 'c_abc', name: '臂力棒', emoji: '', icon: '', color: '#EF4444', soft: '#FDEBEB', desc: '上肢 · 胸肩三头', builtin: false, defaultWeight: 40 }
  ],
  [REC]: { '2026-11-10': [{ id: 'a1', type: 'c_abc', reps: 12, weight: 40, ts: 1 }] },
  [GOAL]: { c_abc: 25 }
})
list = S.getAllExercises()
const pb2 = list.filter(function (e) { return e.key === 'powerbar' })[0]
ok(!!pb2, '就地升级出 key=powerbar 的项目')
ok(pb2 && pb2.builtin === true, '升级后 builtin = true')
ok(pb2 && pb2.iconPath === '/images/ex-powerbar.png', '补上了专属图标')
ok(pb2 && pb2.goal === 25, '用户设过的每日目标 25 保留')
ok(pb2 && pb2.defaultWeight === 40, '默认负重保留')
const rec = S.getDay('2026-11-10')
ok(rec.length === 1 && rec[0].type === 'powerbar', '历史记录改挂到 powerbar')
ok(!S.getAllExercises().some(function (e) { return e.key === 'c_abc' }), '旧的 c_abc 已消失')
ok(list.filter(function (e) { return e.name === '臂力棒' }).length === 1, '没有留下重复条目')

/* ---------- 3. 幂等：再读两遍不应重复 ---------- */
console.log('3) 幂等性')
S.getAllExercises(); const l3 = S.getAllExercises()
ok(l3.filter(function (e) { return e.name === '臂力棒' }).length === 1, '多次读取只有一条臂力棒')
ok(l3.filter(function (e) { return e.key === 'powerbar' }).length === 1, 'powerbar 只有一条')

/* ---------- 4. 老用户从来没加过：自动补一条内置 ---------- */
console.log('4) 老用户没有这个项目')
reset({
  [EX]: [{ key: 'squat', name: '深蹲', emoji: '🦵', icon: 'squat', color: '#E3A800', soft: '#FFF3C9', desc: '下肢 · 股四头肌', builtin: true }]
})
list = S.getAllExercises()
const pb4 = list.filter(function (e) { return e.key === 'powerbar' })[0]
ok(!!pb4 && pb4.builtin && pb4.defaultWeight === 40, '自动补出内置臂力棒（含 40kg 默认负重）')
const n4 = S.getAllExercises().length
ok(S.getAllExercises().length === n4, '不会重复追加（再读一次仍是 ' + n4 + ' 条）')

/* ---------- 5. 变体名 / 副本合并 ---------- */
console.log('5) 变体名合并')
reset({
  [EX]: [
    { key: 'c_x', name: '臂力棒 40kg', emoji: '🪢', icon: '', color: '#EF4444', soft: '#FDEBEB', builtin: false, defaultWeight: 50 },
    { key: 'c_y', name: '臂力棒', emoji: '', icon: '', color: '#EF4444', soft: '#FDEBEB', builtin: false }
  ],
  [REC]: { '2026-11-11': [{ id: 'b1', type: 'c_x', reps: 15, weight: 50, ts: 1 }, { id: 'b2', type: 'c_y', reps: 10, weight: 40, ts: 2 }] }
})
list = S.getAllExercises()
ok(list.filter(function (e) { return e.name === '臂力棒' }).length === 1, '两条合并成一条')
ok(list.filter(function (e) { return e.key === 'powerbar' })[0].defaultWeight === 50, '保留被合并项里的默认负重 50')
const rec5 = S.getDay('2026-11-11')
ok(rec5.length === 2 && rec5.every(function (s) { return s.type === 'powerbar' }), '两天的记录都挂到 powerbar')

/* ---------- 6. 坐/卧 弯腿举是内置项；倒蹬机是独立新项目 ---------- */
console.log('6) 弯腿举内置项承接倒蹬机数据，倒蹬机重建为干净新项目')
reset()
list = S.getAllExercises()
ok(list.some(function (e) { return e.key === 'legcurl' && e.name === '坐/卧 弯腿举' && e.builtin }), '内置「坐/卧 弯腿举」存在')
ok(list.some(function (e) { return e.key === 'legpress' && e.name === '倒蹬机' && e.builtin }), '内置「倒蹬机」作为独立新项目存在')
ok(!S.getPresets().some(function (p) { return p.name === '坐/卧 弯腿举' }), '推荐项目里不再出现「坐/卧 弯腿举」')
ok(S.getPresets().some(function (p) { return p.name === '倒蹬' }), '推荐项目仍保留「倒蹬」')
ok(list.filter(function (e) { return e.key === 'legcurl' })[0].goal === 30, '弯腿举默认目标 30')
ok(list.filter(function (e) { return e.key === 'legpress' })[0].goal === 40, '倒蹬机默认目标 40')
ok(list.filter(function (e) { return e.key === 'legcurl' })[0].bwPercent === 0, '弯腿举不自重折算')
ok(list.filter(function (e) { return e.key === 'legpress' })[0].bwPercent === 0, '倒蹬机不自重折算')

/* 被误升级过的老数据：倒蹬机（实为弯腿举）的全部数据搬到内置弯腿举，倒蹬机清空 */
reset({
  [EX]: [
    { key: 'squat', name: '深蹲', emoji: '🦵', icon: 'squat', color: '#E3A800', soft: '#FFF3C9', desc: '下肢 · 股四头肌', builtin: true },
    { key: 'legpress', name: '倒蹬机', emoji: '', icon: 'legcurl', color: '#F2637B', soft: '#FDEAEE', desc: '下肢 · 腘绳肌', builtin: true, groupId: DEFAULT_GROUP_ID }
  ],
  [REC]: { '2026-11-13': [{ id: 'c1', type: 'legpress', reps: 15, weight: 40, ts: 1 }] },
  [GOAL]: { legpress: 30 },
  [REPS]: { legpress: 15 },
  [LW]: { legpress: 40 },
  [BEST]: { legpress: 55 }
})
list = S.getAllExercises()
const lc6 = list.filter(function (e) { return e.key === 'legcurl' })[0]
const lp6 = list.filter(function (e) { return e.key === 'legpress' })[0]
ok(!!lc6 && lc6.builtin && lc6.name === '坐/卧 弯腿举', '内置弯腿举建成')
ok(lc6 && lc6.color === '#F2637B' && lc6.desc === '下肢 · 腘绳肌', '弯腿举保留原配色与部位')
ok(!!lp6 && lp6.builtin && lp6.name === '倒蹬机', '倒蹬机作为干净内置项仍在')
ok(S.getDay('2026-11-13').some(function (s) { return s.type === 'legcurl' && s.weight === 40 }), '打卡记录搬到 legcurl')
ok(!S.getDay('2026-11-13').some(function (s) { return s.type === 'legpress' }), '倒蹬机不再背着旧记录')
ok(S.getGoals().legcurl === 30 && S.getGoals().legpress === 40, '每日目标搬到 legcurl(30)，倒蹬机回落默认(40)')
ok((mem[REPS] || {}).legcurl === 15 && mem[REPS].legpress === undefined, '上次次数搬到 legcurl')
ok(S.getLastWeight('legcurl') === 40 && S.getLastWeight('legpress') === 0, '记住的负重搬到 legcurl')
ok(S.getBestWeight('legcurl') === 55 && S.getBestWeight('legpress') === 0, '个人负重纪录搬到 legcurl')
const cnt6 = list.length
S.getAllExercises(); S.getAllExercises()
ok(S.getAllExercises().length === cnt6 && S.getAllExercises().filter(function (e) { return e.key === 'legcurl' }).length === 1, '修复幂等：反复读取不重复')

/* 修复后用户真正练倒蹬机，数据不再被搬走 */
S.addSet('2026-11-14', 'legpress', 30, 100)
S.getAllExercises()
ok(S.getDay('2026-11-14').some(function (s) { return s.type === 'legpress' }), '全新记录在倒蹬机上保持原样')

/* ---------- 7. 训练量口径：阻力 × 次数，不掺体重 ---------- */
console.log('7) 训练量估算')
reset()
S.updateProfile && S.updateProfile({ weight: 70 })
const ex = S.getExerciseMap()['powerbar']
const load = S.estimateSetLoad({ reps: 10, weight: 40 }, ex, 70)
ok(load === 400, '40kg × 10 次 = 400（不算体重），实际 ' + load)

console.log(fails === 0 ? '\n全部通过 ✅' : '\n失败 ' + fails + ' 项 ❌')
process.exit(fails === 0 ? 0 : 1)
