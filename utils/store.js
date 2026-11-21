const U = require('./util.js')

const RECORD_KEY = 'workout_records_v1'
const GOAL_KEY = 'workout_goals_v1'
const EXERCISE_KEY = 'workout_exercises_v1'
const REPS_KEY = 'workout_reps_v1'
const LAST_WEIGHT_KEY = 'workout_last_weight_v1'
const BEST_KEY = 'workout_best_weight_v1'      // 每个项目的个人最高负重（kg）
const GROUP_KEY = 'workout_groups_v1'          // 项目分组 [{id, name}]
const ACTIVE_GROUP_KEY = 'workout_active_group_v1'  // 打卡首页上次选中的分组，'all' = 全部
const PROFILE_KEY = 'workout_profile_v1'
const WEIGHT_KEY = 'workout_weight_v1'
const REPAIR_KEY = 'workout_repair_v1'

const DEFAULT_GROUP_ID = 'g_default'
const DEFAULT_GROUP_NAME = '默认'
const MAX_GROUPS = 8
const MAX_GROUP_NAME = 6

/* ==========================================================
   项目定义
   内置项：不可删除，只能改名 / 换图标 / 隐藏
   自定义项：可自由增删
   ========================================================== */

const BUILTIN = [
  { key: 'squat', name: '深蹲', emoji: '🦵', icon: 'squat', color: '#E3A800', soft: '#FFF3C9', desc: '下肢 · 股四头肌', goal: 50 },
  { key: 'pullup', name: '引体向上', emoji: '💪', icon: 'pullup', color: '#FF9F43', soft: '#FFF3E6', desc: '背部 · 肱二头肌', goal: 20 },
  { key: 'pushup', name: '俯卧撑', emoji: '🙌', icon: 'pushup', color: '#2BC48A', soft: '#E8F8F1', desc: '上肢 · 胸肩三头', goal: 50 },
  { key: 'backext', name: '山羊挺身', emoji: '🐐', icon: 'backext', color: '#F59E0B', soft: '#FEF3E2', desc: '核心 · 下背', goal: 30 },
  /* 臂力棒：弹簧阻力按 kg 标注，默认 40kg；不折算自重，训练量按阻力 × 次数 */
  { key: 'powerbar', name: '臂力棒', emoji: '🪢', icon: 'powerbar', color: '#EF4444', soft: '#FDEBEB', desc: '上肢 · 胸肩三头', goal: 20, defaultWeight: 40 },
  /* 坐/卧 弯腿举：俯卧/坐姿屈膝把配重拉向臀部，练腘绳肌；器械动作不自重折算 */
  { key: 'legcurl', name: '坐/卧 弯腿举', emoji: '🦵', icon: 'legcurl', color: '#F2637B', soft: '#FDEAEE', desc: '下肢 · 腘绳肌', goal: 30 },
  /* 倒蹬机：坐姿腿举，身体重量由座椅承担，只算器械配重（全新项目，无历史数据） */
  { key: 'legpress', name: '倒蹬机', emoji: '🦵', icon: 'legpress', color: '#06B6D4', soft: '#E4F6FA', desc: '下肢 · 股四头肌', goal: 40 }
]

/** 自定义项目可选图标 */
const EMOJIS = ['🦵', '💪', '🙌', '🏋️', '🤸', '🏃', '🚴', '🧘', '🥊', '🪢', '🔥', '⚡', '🎯', '🏊', '🪜', '🎽']

/**
 * 专属图标：本地 PNG（透明底），icon 字段存令牌，渲染时查这张表
 * 令牌会随备份导出，另一台设备上同一令牌指向同一个包内文件，直接可用
 * 全部为同一套器械说明牌风格：黑描边白躯干、黑色短裤、红色发力箭头
 * 顺序 = 项目页图标选择器的显示顺序（前 16 个对应参考图的 4×4 表单）
 */
const ICON_FILES = {
  pushup: '/images/ex-pushup.png',
  pullup: '/images/ex-pullup.png',
  dips: '/images/ex-dips.png',
  hangleg: '/images/ex-hangleg.png',
  squat: '/images/ex-squat.png',
  deadlift: '/images/ex-deadlift.png',
  benchpress: '/images/ex-benchpress.png',
  dbpress: '/images/ex-dbpress.png',
  pulldown: '/images/ex-pulldown.png',
  cablerow: '/images/ex-cablerow.png',
  legpress: '/images/ex-legpress.png',
  legext: '/images/ex-legext.png',
  legcurl: '/images/ex-legcurl.png',
  backext: '/images/ex-backext.png',
  curl: '/images/ex-curl.png',
  pushdown: '/images/ex-pushdown.png',
  bike: '/images/ex-bike.png',
  plank: '/images/ex-plank.png',
  bulgarian: '/images/ex-bulgarian.png',
  lateral: '/images/ex-lateral.png',
  hipbridge: '/images/ex-hipbridge.png',
  lunge: '/images/ex-lunge.png',
  run: '/images/ex-run.png',
  ohp: '/images/ex-ohp.png',
  invertedrow: '/images/ex-invertedrow.png',
  abduct: '/images/ex-abduct.png',
  adduct: '/images/ex-adduct.png',
  calf: '/images/ex-calf.png',
  legpresscalf: '/images/ex-legpresscalf.png',
  powerbar: '/images/ex-powerbar.png'
}

/** 老令牌 → 新令牌（杠铃划船的旧图标已换成坐姿绳索划船） */
const ICON_ALIAS = { row: 'cablerow' }

/** 图标令牌 → 中文名，选择器里做无障碍描述 */
const ICON_NAMES = {
  pushup: '俯卧撑', pullup: '引体向上', dips: '双杠臂屈伸', hangleg: '单杠提腿', squat: '深蹲', deadlift: '硬拉',
  benchpress: '卧推', dbpress: '坐姿哑铃推举', pulldown: '高位下拉', cablerow: '坐姿划船',
  legpress: '倒蹬', legext: '腿屈伸', legcurl: '腿弯举', backext: '山羊挺身',
  curl: '弯举', pushdown: '绳索下压', bike: '坐姿单车', plank: '平板支撑',
  bulgarian: '保加利亚深蹲', lateral: '侧平举', hipbridge: '臀推', lunge: '箭步蹲',
  run: '跑步', ohp: '站姿推举',
  invertedrow: '澳式引体', abduct: '髋外展', adduct: '髋内收', calf: '提踵', legpresscalf: '倒蹬机提踵',
  powerbar: '臂力棒'
}

/**
 * 图标令牌 → 训练部位。
 * 项目自己的描述（desc）为空时按图标兜底，保证打卡页每张卡都能标出练哪儿。
 * 文案格式与推荐项目一致：「部位 · 细分」
 */
const MUSCLE_BY_ICON = {
  pushup: '上肢 · 胸肩三头', pullup: '背部 · 肱二头肌', dips: '上肢 · 胸肩三头',
  hangleg: '核心 · 下腹', squat: '下肢 · 股四头肌', deadlift: '背部 · 后链',
  benchpress: '胸部 · 胸大肌', dbpress: '肩部 · 三角肌', pulldown: '背部 · 背阔肌',
  cablerow: '背部 · 中背', legpress: '下肢 · 股四头肌', legext: '下肢 · 股四头肌',
  legcurl: '下肢 · 腘绳肌', backext: '核心 · 下背', curl: '手臂 · 肱二头肌',
  pushdown: '手臂 · 肱三头肌', bike: '有氧 · 下肢', plank: '核心 · 腹部',
  bulgarian: '下肢 · 股四头肌·腘绳肌·臀大肌', lateral: '肩部 · 三角肌中束', hipbridge: '臀部 · 臀大肌',
  lunge: '下肢 · 臀腿', run: '有氧 · 全身', ohp: '肩部 · 三角肌',
  invertedrow: '背部 · 中背', abduct: '臀部 · 臀中肌', adduct: '大腿 · 内收肌',
  calf: '小腿 · 腓肠肌', legpresscalf: '小腿 · 比目鱼肌', powerbar: '上肢 · 胸肩三头'
}

/** 项目描述为空时，用图标推一个训练部位出来（拿不到就返回 ''） */
function muscleOf(iconToken) {
  return MUSCLE_BY_ICON[ICON_ALIAS[iconToken] || iconToken] || ''
}

/**
 * 训练部位文案纠错（一次性、幂等）
 * 老数据里有几条写的是动作方向或器械，不是目标肌肉，按旧文案整条替换成正确肌肉名
 */
const MUSCLE_FIXES = {
  '臀部 · 髋伸': '臀部 · 臀大肌',
  '臀部 · 髋外展肌': '臀部 · 臀中肌',
  '小腿 · 倒蹬机': '小腿 · 比目鱼肌',
  '下肢 · 单腿': '下肢 · 股四头肌·腘绳肌·臀大肌',
  '下肢 · 单腿（左）': '下肢 · 股四头肌·腘绳肌·臀大肌',
  '下肢 · 单腿（右）': '下肢 · 股四头肌·腘绳肌·臀大肌'
}

/** 推荐项目：在「项目」页一键添加（最后几个是参考图里原本没有的项目） */
const PRESETS = [
  /* 单腿动作拆成左右两条，方便分别记录两侧次数（名称上限 8 字，所以简称） */
  { name: '保加利亚左腿', icon: 'bulgarian', color: '#8B5CF6', desc: '下肢 · 股四头肌·腘绳肌·臀大肌', goal: 15 },
  { name: '保加利亚右腿', icon: 'bulgarian', color: '#8B5CF6', desc: '下肢 · 股四头肌·腘绳肌·臀大肌', goal: 15 },
  { name: '单杠提腿', icon: 'hangleg', color: '#E3A800', desc: '核心 · 下腹', goal: 20 },
  { name: '坐姿哑铃推举', icon: 'dbpress', color: '#FF9F43', desc: '肩部 · 三角肌', goal: 30 },
  { name: '坐姿绳索划船', icon: 'cablerow', color: '#2BC48A', desc: '背部 · 中背', goal: 40 },
  { name: '坐姿单车', icon: 'bike', color: '#EF4444', desc: '有氧 · 25 分钟', goal: 25 },
  { name: '澳式引体', icon: 'invertedrow', color: '#2BC48A', desc: '背部 · 中背', goal: 30 },
  { name: '髋外展', icon: 'abduct', color: '#8B5CF6', desc: '臀部 · 臀中肌', goal: 30 },
  { name: '髋内收', icon: 'adduct', color: '#06B6D4', desc: '大腿 · 内收肌', goal: 30 },
  { name: '坐姿腿屈伸', icon: 'legext', color: '#E3A800', desc: '下肢 · 股四头肌', goal: 30 },
  { name: '臀推', icon: 'hipbridge', color: '#F2637B', desc: '臀部 · 臀大肌', goal: 30 },
  { name: '站姿提踵', icon: 'calf', color: '#F59E0B', desc: '小腿 · 腓肠肌', goal: 30 },
  /* 倒蹬：原来的推荐项目，和内置的「倒蹬机」是两个独立项目，互不转换 */
  { name: '倒蹬', icon: 'legpress', color: '#06B6D4', desc: '下肢 · 腿举', goal: 40 },
  { name: '倒蹬机提踵', icon: 'legpresscalf', color: '#F59E0B', desc: '小腿 · 比目鱼肌', goal: 30 },
  /* 肩部复合推举：站姿把杠铃从锁骨推过头顶，重量偏大、次数偏少 */
  { name: '站姿杠铃推举', icon: 'ohp', color: '#FF9F43', desc: '肩部 · 三角肌', goal: 20 },
  /* 手臂孤立动作：肘固定在体侧，只有前臂绕肘关节屈曲，重量轻、次数多 */
  { name: '二头弯举', icon: 'curl', color: '#EF4444', desc: '手臂 · 肱二头肌', goal: 30 },
  /* 肩中束孤立动作：手臂在体侧向外抬到与肩平，轻重量多次数 */
  { name: '肩侧平举', icon: 'lateral', color: '#FF9F43', desc: '肩部 · 三角肌中束', goal: 30 }
]

/** 自定义项目可选配色（含对应浅色底） */
const PALETTE = [
  { color: '#E3A800', soft: '#FFF3C9' },
  { color: '#FF9F43', soft: '#FFF3E6' },
  { color: '#2BC48A', soft: '#E8F8F1' },
  { color: '#8B5CF6', soft: '#F1EBFE' },
  { color: '#F2637B', soft: '#FDEAEE' },
  { color: '#06B6D4', soft: '#E4F6FA' },
  { color: '#EF4444', soft: '#FDEBEB' },
  { color: '#F59E0B', soft: '#FEF3E2' }
]

const DEFAULT_CUSTOM_GOAL = 30
const MAX_EXERCISES = 24

/** 自定义自重比例上限（100% 全身重）；滑杆与校验都用它 */
const MAX_BW_RATIO = 1

/* ------------------------------ 项目读写 ------------------------------ */

function readList() {
  const list = wx.getStorageSync(EXERCISE_KEY)
  return Array.isArray(list) ? list : null
}

function writeList(list) {
  wx.setStorageSync(EXERCISE_KEY, list)
}

/* ------------------------------ 项目分组 ------------------------------ */

function readGroups() {
  const g = wx.getStorageSync(GROUP_KEY)
  return Array.isArray(g) && g.length ? g : null
}

function writeGroups(groups) {
  wx.setStorageSync(GROUP_KEY, groups)
}

/** 清洗分组数据：去掉非法 id / 空名 / 重名，至少保留一个分组 */
function sanitizeGroups(list) {
  const out = []
  const ids = {}
  const names = {}
  ;(Array.isArray(list) ? list : []).forEach(function (g) {
    if (!g || !g.id) return
    const id = String(g.id).slice(0, 32)
    const name = String(g.name || '').trim().slice(0, MAX_GROUP_NAME)
    if (!name || ids[id] || names[name]) return
    ids[id] = 1
    names[name] = 1
    out.push({ id: id, name: name })
  })
  if (!out.length) out.push({ id: DEFAULT_GROUP_ID, name: DEFAULT_GROUP_NAME })
  return out.slice(0, MAX_GROUPS)
}

/**
 * 老数据没有分组：补一个「默认」分组，并把所有项目都放进去。
 * 新装用户的项目在 ensureList() 里也会走这里补 groupId。
 */
function ensureGroups() {
  let groups = readGroups()
  if (!groups) {
    groups = sanitizeGroups(null)
    writeGroups(groups)
  }
  const ids = {}
  groups.forEach(function (g) { ids[g.id] = 1 })
  const fallback = groups[0].id
  const list = readList() || []
  let changed = false
  list.forEach(function (e) {
    if (!ids[e.groupId]) { e.groupId = fallback; changed = true }
  })
  if (changed) writeList(list)
  return groups
}

/** 分组列表（带项目数，含隐藏项目） */
function getGroups() {
  const groups = ensureGroups()
  const fallback = groups[0].id
  const counts = {}
  ;(readList() || []).forEach(function (e) {
    const id = e.groupId || fallback
    counts[id] = (counts[id] || 0) + 1
  })
  return groups.map(function (g) {
    return { id: g.id, name: g.name, count: counts[g.id] || 0 }
  })
}

function getGroupMap() {
  const m = {}
  ensureGroups().forEach(function (g) { m[g.id] = g.name })
  return m
}

/** 新建分组 */
function addGroup(name) {
  const groups = ensureGroups()
  const n = String(name || '').trim().slice(0, MAX_GROUP_NAME)
  if (!n) return { ok: false, reason: '请填写分组名称' }
  if (groups.length >= MAX_GROUPS) return { ok: false, reason: '最多 ' + MAX_GROUPS + ' 个分组' }
  if (groups.some(function (g) { return exerciseNameKey(g.name) === exerciseNameKey(n) })) {
    return { ok: false, reason: '已经有同名分组了' }
  }
  const id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  groups.push({ id: id, name: n })
  writeGroups(groups)
  return { ok: true, id: id }
}

/** 分组改名 */
function renameGroup(id, name) {
  const groups = ensureGroups()
  const n = String(name || '').trim().slice(0, MAX_GROUP_NAME)
  if (!n) return { ok: false, reason: '请填写分组名称' }
  const hit = groups.filter(function (g) { return g.id === id })[0]
  if (!hit) return { ok: false, reason: '分组不存在' }
  if (groups.some(function (g) {
    return g.id !== id && exerciseNameKey(g.name) === exerciseNameKey(n)
  })) return { ok: false, reason: '已经有同名分组了' }
  hit.name = n
  writeGroups(groups)
  return { ok: true }
}

/** 删除分组：组内项目移到第一个（优先默认）分组，项目本身和历史记录都不删 */
function removeGroup(id) {
  const groups = ensureGroups()
  if (groups.length <= 1) return { ok: false, reason: '至少要保留一个分组' }
  const hit = groups.filter(function (g) { return g.id === id })[0]
  if (!hit) return { ok: false, reason: '分组不存在' }

  const fallback = (groups.filter(function (g) { return g.id === DEFAULT_GROUP_ID && g.id !== id })[0] || groups[0]).id
  const list = readList() || []
  let moved = 0
  list.forEach(function (e) {
    if (e.groupId === id) { e.groupId = fallback; moved++ }
  })
  if (moved) writeList(list)
  writeGroups(groups.filter(function (g) { return g.id !== id }))
  if (getActiveGroup() === id) setActiveGroup('all')
  return { ok: true, moved: moved, name: hit.name }
}

/** 调整分组顺序（dir = -1 上移 / 1 下移），顺序就是打卡页 tab 的顺序 */
function moveGroup(id, dir) {
  const groups = ensureGroups()
  const i = groups.map(function (g) { return g.id }).indexOf(id)
  const j = i + (dir < 0 ? -1 : 1)
  if (i < 0 || j < 0 || j >= groups.length) return { ok: false, reason: '已经在最边上啦' }
  const tmp = groups[i]
  groups[i] = groups[j]
  groups[j] = tmp
  writeGroups(groups)
  return { ok: true }
}

/** 打卡首页上次选中的分组 */
function getActiveGroup() {
  const id = String(wx.getStorageSync(ACTIVE_GROUP_KEY) || 'all')
  if (id === 'all') return id
  return ensureGroups().some(function (g) { return g.id === id }) ? id : 'all'
}

function setActiveGroup(id) {
  wx.setStorageSync(ACTIVE_GROUP_KEY, id === 'all' ? 'all' : String(id || 'all'))
}

/** 某个分组里的项目（含隐藏项目），不传 groupId 表示全部 */
function getExercisesByGroup(groupId) {
  const list = getAllExercises()
  return groupId ? list.filter(function (e) { return e.groupId === groupId }) : list
}

/**
 * 看不见的字符清单。
 * 只处理零宽空格是不够的——实际从输入法、剪贴板、老版本备份里混进来的还有：
 *   U+3164 / U+FFA0 / U+1160 韩文填充符（输入法「空字符」最爱塞这个）
 *   U+2800 盲文空白（看着是空白，其实是个字）
 *   U+FE0F / U+FE00-0F 变体选择符（跟着 emoji、某些输入法一起粘进来）
 *   U+00AD 软连字符、U+180E 蒙文元音分隔符、U+2060-206F 不可见运算符
 *   U+200B-200F 零宽字符、U+202A-202E 双向控制符、U+FEFF BOM
 *   U+0300-036F 等组合附加符（「腿」后面跟一个声调符，显示上完全看不出）
 * 这些字符宽度为 0，屏幕上看不出差别，但会让「单杠提腿」≠「单杠提腿」，
 * 于是既不会被判重、用户也没法分辨该删哪个。
 */
const INVISIBLE_RE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F' +   // 控制符
  '\\u007F-\\u009F' +                                 // DEL 与 C1
  '\\u00AD' +                                         // 软连字符
  '\\u0300-\\u036F\\u1AB0-\\u1AFF\\u1DC0-\\u1DFF' +   // 组合附加符
  '\\u20D0-\\u20FF\\uFE20-\\uFE2F' +                  // 组合附加符（补充）
  '\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5' +      // 其他格式符 / 韩文填充
  '\\u180B-\\u180F' +                                 // 蒙文自由变体选择符
  '\\u200B-\\u200F' +                                 // 零宽字符 + 双向标记
  '\\u202A-\\u202E' +                                 // 双向控制符
  '\\u2060-\\u206F' +                                 // 词连接符 / 不可见运算符
  '\\u2800' +                                         // 盲文空白
  '\\u3164\\uFFA0' +                                  // 韩文填充符
  '\\uFE00-\\uFE0F\\uFEFF' +                          // 变体选择符 / BOM
  '\\uFFF0-\\uFFFF' +                                 // 特殊字符区
  ']', 'g'
)

/**
 * 归一化第一步：先做 NFKC（全角→半角、ＡＢＣ→ABC、组合字符合成），
 * 再把所有「看不见的字符」全部删掉。
 * 部分老机型没有 String.prototype.normalize，用 try 兜底，后面仍会补一次全角转换。
 */
function normalizeName(name) {
  let s = String(name === undefined || name === null ? '' : name)
  try {
    if (s.normalize) s = s.normalize('NFKC')
  } catch (e) {}
  return s.replace(INVISIBLE_RE, '')
}

/**
 * 项目名的「核心」：只保留真正看得见的字母、数字、汉字、假名、韩文。
 * 标点（·、-、（）、。）、符号、emoji、所有空白、所有不可见字符一律不参与。
 * 这样「单杠·提腿」「单杠提腿。」「单杠 提腿」「单杠提腿」都会得到同一个键。
 */
function nameCore(name) {
  const s = normalizeName(name)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x21 && c <= 0x7E) { out += s.charAt(i); continue }      // 可见 ASCII
    if (c >= 0x00C0 && c <= 0x024F) { out += s.charAt(i); continue }  // 拉丁扩展
    if (c >= 0x3040 && c <= 0x30FF) { out += s.charAt(i); continue }  // 日文假名
    if (c >= 0x3400 && c <= 0x4DBF) { out += s.charAt(i); continue }  // 汉字扩展 A
    if (c >= 0x4E00 && c <= 0x9FFF) { out += s.charAt(i); continue }  // 汉字
    if (c >= 0xAC00 && c <= 0xD7A3) { out += s.charAt(i); continue }  // 韩文音节
    if (c >= 0xF900 && c <= 0xFAFF) { out += s.charAt(i); continue }  // 兼容汉字
    if (c >= 0xFF01 && c <= 0xFF5E) {                                  // 全角，兜底转半角
      out += String.fromCharCode(c - 0xFEE0); continue
    }
    /* 其余（中文标点、符号、代理对 emoji、控制符）直接丢掉 */
  }
  return out.toLowerCase()
}

/** 项目名的判重键：看不见的差异、标点差异全部抹平，剩下的才算「不同的名字」 */
function exerciseNameKey(name) {
  const core = nameCore(name)
  /* 名字全是符号/emoji 时退回「去掉空白后的小写原文」，避免键为空而误判成同名 */
  return core || normalizeName(name).replace(/[\s\u3000]+/g, '').toLowerCase()
}

/** 回写存储时「洗干净」显示名：去掉不可见字符，多余空白收成一个空格 */
function cleanExerciseName(name) {
  return normalizeName(name).replace(/[\s\u3000]+/g, ' ').trim()
}

/** 自动合并的记账：让页面能告诉用户「刚才帮你合并了 N 个重复项目」 */
let mergeReport = { count: 0, names: [] }

/**
 * 取走并清空合并记录（页面弹一次提示用）
 * 只在真正合并过时才有内容，正常情况下是 0
 */
function takeMergeReport() {
  const r = { count: mergeReport.count, names: mergeReport.names.slice(0) }
  mergeReport = { count: 0, names: [] }
  return r
}

/**
 * 长度相同、只有一个字不同 —— 视为「同一个名字被打错了」
 * （「单杠提腿」和「单杆提腿」这种，肉眼几乎分不出来）
 * 只对 4 个字以上的名字生效，避免「侧平举 / 前平举」这类正常的两个项目被误判
 */
function nearName(a, b) {
  if (a.length !== b.length || a.length < 4) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    if (a.charAt(i) !== b.charAt(i)) {
      diff++
      if (diff > 1) return false
    }
  }
  return diff === 1
}

/**
 * 一次性修复：历史上同一个项目被录成了两个「只差一个字」的名字。
 * 只处理带专属图标（本次是单杠提腿的 hangleg）的那一份，
 * 把另一个并入它 —— 别的项目不受影响，也不会每启动一次就模糊合并一次。
 */
function oneTimeNearNameRepair(groups) {
  if (wx.getStorageSync(REPAIR_KEY)) return

  const keys = Object.keys(groups)
  let merged = 0

  keys.forEach(function (a) {
    if (!groups[a]) return
    const hasIcon = groups[a].some(function (e) {
      return e.key === 'hangleg' || iconTokenOf(e) === 'hangleg'
    })
    if (!hasIcon) return

    keys.forEach(function (b) {
      if (b === a || !groups[b] || !groups[a]) return
      if (!nearName(a, b)) return
      groups[a] = groups[a].concat(groups[b])
      delete groups[b]
      merged++
    })
  })

  if (merged > 0) wx.setStorageSync(REPAIR_KEY, 1)
}

/**
 * 一次性清理：保加利亚深蹲已拆成「保加利亚左腿 / 保加利亚右腿」两条，
 * 老的单条项目整条删掉（连历史记录一起，和项目页手动删除的行为一致）。
 * 只按「名称核心」精确匹配，所以带「左腿 / 右腿」的两条不受影响；
 * 跑过一次就置标记，用户以后自己再建同名项目不会被反复删掉。
 */
const LEGACY_BG_KEY = 'workout_repair_bg_v1'
const LEGACY_BG_NAMES = ['保加利亚深蹲', '保加利亚蹲', '保加利亚分腿蹲', '保加利亚单腿蹲']

/* 「坐/卧 弯腿举」被误升级成内置「倒蹬机」，数据要从倒蹬机搬回弯腿举的一次性修复标记 */
const LEGCURL_SPLIT_KEY = 'workout_repair_legcurl_v1'

/** 已升级为内置项的项目 key（同时也是它们的图标令牌） */
const BACKEXT_KEY = 'backext'
const POWERBAR_KEY = 'powerbar'
const LEGCURL_KEY = 'legcurl'
const LEGPRESS_KEY = 'legpress'

/**
 * 项目改名表：旧名（名称核心）→ 新名。
 * 每次读取项目时都会过一遍，改完就不再命中，所以是幂等的；
 * 记录挂在 key 上，改名不影响历史数据。
 */
const EXERCISE_RENAMES = {
  '俯卧腿弯举': '坐/卧 弯腿举'
}

function dropLegacyBulgarian(list) {
  if (wx.getStorageSync(LEGACY_BG_KEY)) return false
  wx.setStorageSync(LEGACY_BG_KEY, 1)

  const dead = list.filter(function (e) {
    return !e.builtin && LEGACY_BG_NAMES.indexOf(nameCore(e.name)) >= 0
  })
  if (!dead.length) return false

  const deadKeys = {}
  dead.forEach(function (e) { deadKeys[e.key] = 1 })
  for (let i = list.length - 1; i >= 0; i--) {
    if (deadKeys[list[i].key]) list.splice(i, 1)
  }

  /* 连带清掉这个项目的打卡记录 / 每日目标 / 上次次数 */
  const all = getAll()
  let recordsChanged = false
  Object.keys(all).forEach(function (d) {
    const src = all[d] || []
    const arr = src.filter(function (s) { return !deadKeys[s.type] })
    if (arr.length !== src.length) recordsChanged = true
    if (arr.length) all[d] = arr
    else delete all[d]
  })
  if (recordsChanged) saveAll(all)

  const goals = wx.getStorageSync(GOAL_KEY) || {}
  let goalsChanged = false
  Object.keys(deadKeys).forEach(function (k) {
    if (k in goals) { delete goals[k]; goalsChanged = true }
  })
  if (goalsChanged) wx.setStorageSync(GOAL_KEY, goals)

  const reps = wx.getStorageSync(REPS_KEY) || {}
  let repsChanged = false
  Object.keys(deadKeys).forEach(function (k) {
    if (k in reps) { delete reps[k]; repsChanged = true }
  })
  if (repsChanged) wx.setStorageSync(REPS_KEY, reps)

  return true
}

/** 名称是不是「山羊挺身」（含「山羊挺身（背伸）」这类变体） */
function isBackextName(name) {
  return nameCore(name).indexOf('山羊挺身') === 0
}

/** 名称是不是「臂力棒」（含「臂力棒 40kg」「弹簧臂力棒」这类变体） */
function isPowerbarName(name) {
  return nameCore(name).indexOf('臂力棒') >= 0
}

/**
 * 名称是不是内置项「倒蹬机」本身。
 * 注意：「倒蹬」是独立的推荐项目，绝不能被这里命中——
 * 否则用户加过的「倒蹬」会被改名成「倒蹬机」、记录被搬走，看起来就像被取代了。
 * 只有名称核心恰好等于内置名才算，变体（含「倒蹬 40kg」「腿举」）一律不碰。
 */
function isLegpressName(name) {
  return nameCore(name) === '倒蹬机'
}

/**
 * 名称是不是内置项「坐/卧 弯腿举」本身（含「俯卧腿弯举」旧名）。
 * 必须精确，不能只看「腿举」——否则「倒蹬机提踵」等会被误吞并。
 */
function isLegcurlName(name) {
  const core = nameCore(name)
  return core === '坐/卧 弯腿举' || core === '坐卧弯腿举' ||
    core === '俯卧腿弯举' || core === '腿弯举'
}

/** 按 key 取一条内置定义 */
function builtinDef(key) {
  return BUILTIN.filter(function (e) { return e.key === key })[0] || null
}

/**
 * 修复旧数据：某个项目原本是用户自己加的（或从推荐项目一键添加的），
 * 现在升级为内置项。做法是就地转换（列表顺序不变）：
 *   - key 固定成内置 key，builtin 置 true → 项目页显示「内置」、不可删除
 *   - 打卡记录 / 每日目标 / 上次次数 / 记住的负重全部跟着改挂到新 key 上
 *   - 自定义自重比例、颜色、隐藏状态原样保留（只补空缺字段）
 *   - 同名副本（如「山羊挺身（背伸）」「臂力棒 40kg」）合并成一条
 * 逻辑本身幂等：内置项已存在且没有副本时什么都不做，所以不需要一次性标记。
 */
function promoteBuiltin(list, key, isMatch) {
  const def = builtinDef(key)
  if (!def) return false

  let canon = list.filter(function (e) { return e.key === key })[0] || null
  const cands = list.filter(function (e) {
    return e !== canon && !e.builtin && isMatch(e.name)
  })

  /* 老用户从没建过这一项：直接补一条内置项，好让内置项的设备状态一致 */
  if (!canon && !cands.length) {
    const fresh = {
      key: def.key, name: def.name, emoji: def.emoji, icon: def.icon,
      color: def.color, soft: def.soft, desc: def.desc,
      builtin: true, hidden: false
    }
    if (Number(def.defaultWeight) > 0) fresh.defaultWeight = Number(def.defaultWeight)
    list.push(fresh)
    return true    /* 新补的项目要落盘，否则下次读取又不见了 */
  }

  let changed = false
  /* 没有内置项时，把用户自己那条就地升级（其在列表里的位置保持不变） */
  const promoted = !canon
  if (promoted) canon = cands.shift()

  const oldKeys = []
  if (canon.key !== def.key) {
    oldKeys.push(canon.key)
    canon.key = def.key
    changed = true
  }
  cands.forEach(function (e) { oldKeys.push(e.key) })

  if (!canon.builtin) { canon.builtin = true; changed = true }

  /* 只把「山羊挺身」「臂力棒」「倒蹬机」这类变体名统一成内置名；用户自己改过的内置名不动 */
  if (promoted && canon.name !== def.name) { canon.name = def.name; changed = true }
  if (!canon.icon) { canon.icon = def.icon; changed = true }
  if (!canon.color) { canon.color = def.color; changed = true }
  if (!canon.soft) { canon.soft = def.soft; changed = true }
  if (!canon.desc) { canon.desc = def.desc; changed = true }
  /* 内置项自带的默认负重（臂力棒 40kg）补到空缺处，用户填过的值不动 */
  if (Number(def.defaultWeight) > 0 && !(Number(canon.defaultWeight) > 0)) {
    canon.defaultWeight = Number(def.defaultWeight)
    changed = true
  }

  if (!oldKeys.length) return changed

  const kill = {}
  oldKeys.forEach(function (k) { kill[k] = 1 })

  /* 自定义自重比例：保留项没有就从副本里继承，避免合并后行为回退 */
  if (!hasCustomBodyweightRatio(canon)) {
    const withRatio = cands.filter(hasCustomBodyweightRatio)[0]
    if (withRatio) {
      canon.bwRatio = Number(withRatio.bwRatio)
      changed = true
    }
  }

  /* 记录改挂到内置 key 上 */
  const all = getAll()
  let recordsChanged = false
  Object.keys(all).forEach(function (d) {
    ;(all[d] || []).forEach(function (set) {
      if (kill[set.type]) {
        set.type = def.key
        recordsChanged = true
      }
    })
  })
  if (recordsChanged) saveAll(all)

  const goals = wx.getStorageSync(GOAL_KEY) || {}
  let goalsChanged = false
  oldKeys.forEach(function (k) {
    if (goals[def.key] === undefined && goals[k] !== undefined) {
      goals[def.key] = goals[k]
      goalsChanged = true
    }
    if (goals[k] !== undefined) {
      delete goals[k]
      goalsChanged = true
    }
  })
  if (goalsChanged) wx.setStorageSync(GOAL_KEY, goals)

  const reps = wx.getStorageSync(REPS_KEY) || {}
  let repsChanged = false
  oldKeys.forEach(function (k) {
    if (reps[def.key] === undefined && reps[k] !== undefined) {
      reps[def.key] = reps[k]
      repsChanged = true
    }
    if (reps[k] !== undefined) {
      delete reps[k]
      repsChanged = true
    }
  })
  if (repsChanged) wx.setStorageSync(REPS_KEY, reps)

  const weights = wx.getStorageSync(LAST_WEIGHT_KEY) || {}
  let weightsChanged = false
  oldKeys.forEach(function (k) {
    if (weights[def.key] === undefined && weights[k] !== undefined) {
      weights[def.key] = weights[k]
      weightsChanged = true
    }
    if (weights[k] !== undefined) {
      delete weights[k]
      weightsChanged = true
    }
  })
  if (weightsChanged) wx.setStorageSync(LAST_WEIGHT_KEY, weights)

  /* 把副本从列表里删掉（就地升级的那条已经换过 key，不会命中） */
  let removed = 0
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i] !== canon && kill[list[i].key]) {
      list.splice(i, 1)
      removed++
    }
  }
  if (removed) {
    mergeReport.count += removed
    mergeReport.names.push(def.name)
    changed = true
  }
  return changed
}

/**
 * 一次性修复：早先的迁移把用户加的「坐/卧 弯腿举」误当成倒蹬机
 * （改名成「倒蹬机」+ 换 key 成 legpress + 把记录搬过去）。
 * 现在「坐/卧 弯腿举」是内置项，倒蹬机是全新独立项目，所以：
 *   - 把当前 legpress 上的全部数据（记录 / 目标 / 上次次数 / 记住的负重 / 个人负重纪录）
 *     搬到内置弯腿举 legcurl 上，弯腿举继承用户原有的自定义设置与分组
 *   - 倒蹬机重建成一条干净的内置项目（无任何历史数据）
 * 一次性标记保证只跑一次：跑完后用户真正练倒蹬机记的数据不会被再搬走。
 */
function splitLegcurlFromLegpress(list) {
  if (wx.getStorageSync(LEGCURL_SPLIT_KEY)) return false
  wx.setStorageSync(LEGCURL_SPLIT_KEY, 1)

  const lcDef = builtinDef(LEGCURL_KEY)
  const lpDef = builtinDef(LEGPRESS_KEY)
  if (!lcDef || !lpDef) return false

  const idx = list.map(function (e) { return e.key }).indexOf(LEGPRESS_KEY)
  if (idx < 0) return false
  const lp = list[idx]

  /* 数据 legpress -> legcurl：记录改挂 key */
  const all = getAll()
  let recChanged = false
  Object.keys(all).forEach(function (d) {
    ;(all[d] || []).forEach(function (s) {
      if (s.type === LEGPRESS_KEY) { s.type = LEGCURL_KEY; recChanged = true }
    })
  })
  if (recChanged) saveAll(all)

  /* 目标 / 上次次数 / 记住的负重 / 个人纪录改挂 key；弯腿举已有值则取较大（纪录）/ 保留其它 */
  ;[GOAL_KEY, REPS_KEY, LAST_WEIGHT_KEY, BEST_KEY].forEach(function (key) {
    const m = wx.getStorageSync(key) || {}
    if (m[LEGPRESS_KEY] === undefined) return
    if (m[LEGCURL_KEY] === undefined) m[LEGCURL_KEY] = m[LEGPRESS_KEY]
    else if (key === BEST_KEY) m[LEGCURL_KEY] = Math.max(Number(m[LEGCURL_KEY]) || 0, Number(m[LEGPRESS_KEY]) || 0)
    delete m[LEGPRESS_KEY]
    wx.setStorageSync(key, m)
  })

  /* 移除旧倒蹬机项；弯腿举若已存在则复用，否则就地新建一条继承其设置 */
  list.splice(idx, 1)
  let lc = list.filter(function (e) { return e.key === LEGCURL_KEY })[0]
  if (!lc) {
    lc = { hidden: false, groupId: lp.groupId || DEFAULT_GROUP_ID }
    list.splice(idx, 0, lc)
  }
  lc.key = LEGCURL_KEY
  lc.name = lcDef.name
  lc.emoji = lcDef.emoji
  lc.icon = lcDef.icon
  lc.color = lcDef.color
  lc.soft = lcDef.soft
  lc.desc = lcDef.desc
  lc.builtin = true
  if (lp.bwRatio !== undefined && lc.bwRatio === undefined) lc.bwRatio = lp.bwRatio
  delete lc.defaultWeight   /* 倒蹬机的默认负重不带到弯腿举 */
  if (Number(lcDef.defaultWeight) > 0) lc.defaultWeight = Number(lcDef.defaultWeight)

  /* 在弯腿举后插入一条全新的、无数据的内置倒蹬机 */
  const freshLp = {
    key: LEGPRESS_KEY, name: lpDef.name, emoji: lpDef.emoji, icon: lpDef.icon,
    color: lpDef.color, soft: lpDef.soft, desc: lpDef.desc,
    builtin: true, hidden: false, groupId: lc.groupId || DEFAULT_GROUP_ID
  }
  const lcIdx = list.map(function (e) { return e.key }).indexOf(LEGCURL_KEY)
  list.splice(lcIdx + 1, 0, freshLp)
  return true
}

/**
 * Repair old/imported duplicate exercise definitions without losing history.
 * Built-in definitions win so the canonical icon and metadata remain stable.
 */
function mergeDuplicateExercises(list) {
  let listChanged = false
  /* 先把名称里的不可见字符洗掉：否则卡片上两个名字看起来一模一样，
     但键值不同，既不会被判重、用户也没法分辨该删哪个 */
  list.forEach(function (e) {
    const clean = cleanExerciseName(e.name)
    if (clean && clean !== e.name) {
      e.name = clean
      listChanged = true
    }
  })

  /* 旧版单条「保加利亚深蹲」下线：已经有左腿 / 右腿两条了 */
  if (dropLegacyBulgarian(list)) listChanged = true

  /* 早先「坐/卧 弯腿举」被误升级成「倒蹬机」的：把数据搬回内置弯腿举，倒蹬机重建为干净新项目 */
  if (splitLegcurlFromLegpress(list)) listChanged = true

  /* 「山羊挺身」「臂力棒」「坐/卧 弯腿举」「倒蹬机」升级为内置项目：自定义的同名项就地转换，记录一起搬过去 */
  if (promoteBuiltin(list, BACKEXT_KEY, isBackextName)) listChanged = true
  if (promoteBuiltin(list, POWERBAR_KEY, isPowerbarName)) listChanged = true
  if (promoteBuiltin(list, LEGCURL_KEY, isLegcurlName)) listChanged = true
  if (promoteBuiltin(list, LEGPRESS_KEY, isLegpressName)) listChanged = true

  /* 项目改名：老名字就地升级，已有记录跟着走（记录挂在 key 上，不用动） */
  list.forEach(function (e) {
    const target = EXERCISE_RENAMES[nameCore(e.name)]
    if (target && target !== e.name) {
      e.name = target
      listChanged = true
    }
  })

  /* 老数据把「自定义项目」当成描述存了下来，它不是训练部位：
     能按图标推出部位就换成部位，推不出来就清空（打卡页那行不显示，好过显示错的） */
  list.forEach(function (e) {
    if (e.desc !== '自定义项目') return
    e.desc = muscleOf(iconTokenOf(e))
    listChanged = true
  })

  /* 部位文案纠错：臀推练的是臀大肌（老数据里写的是动作方向「髋伸」） */
  list.forEach(function (e) {
    if (e.desc !== '臀部 · 髋伸') return
    const isHipThrust = e.key === 'hipbridge' || iconTokenOf(e) === 'hipbridge' || e.name === '臀推'
    if (!isHipThrust) return
    e.desc = '臀部 · 臀大肌'
    listChanged = true
  })

  /* 其余几条同样是「写了动作 / 器械而不是目标肌肉」，按旧文案整条替换，幂等 */
  list.forEach(function (e) {
    const fix = MUSCLE_FIXES[e.desc]
    if (!fix) return
    e.desc = fix
    listChanged = true
  })

  const groups = {}
  list.forEach(function (e) {
    const k = exerciseNameKey(e.name)
    if (!k) return
    if (!groups[k]) groups[k] = []
    groups[k].push(e)
  })

  /* 一次性修复「同一个项目录成了两个只差一个字的名字」的历史数据 */
  oneTimeNearNameRepair(groups)

  const all = getAll()
  const goals = wx.getStorageSync(GOAL_KEY) || {}
  const reps = wx.getStorageSync(REPS_KEY) || {}
  let recordsChanged = false
  let goalsChanged = false
  let repsChanged = false

  Object.keys(groups).forEach(function (nameKey) {
    const same = groups[nameKey]
    if (same.length < 2) return
    const canonical = same.filter(function (e) {
      return e.key === 'hangleg' || iconTokenOf(e) === 'hangleg'
    })[0] ||
      same.filter(function (e) { return !!e.builtin })[0] ||
      same.filter(function (e) { return iconTokenOf(e) !== '' })[0] ||
      same[0]
    const duplicateKeys = same.filter(function (e) { return e.key !== canonical.key })
      .map(function (e) { return e.key })

    /* 保留项自己没图标 / 没描述时，从被合并掉的那份里继承过来，
       否则合并完会出现「同一项目图标变成 emoji」这种回退 */
    const donors = same.filter(function (e) { return e.key !== canonical.key })
    if (!iconTokenOf(canonical)) {
      const withIcon = donors.filter(function (e) { return iconTokenOf(e) !== '' })[0]
      if (withIcon) {
        canonical.icon = iconTokenOf(withIcon)
        listChanged = true
      }
    }
    if (!canonical.desc) {
      const withDesc = donors.filter(function (e) { return !!e.desc })[0]
      if (withDesc) {
        canonical.desc = withDesc.desc
        listChanged = true
      }
    }
    /* 被合并项里设过自定义自重比例的，保留下来，避免合并后估算方式回退 */
    if (!hasCustomBodyweightRatio(canonical)) {
      const withRatio = donors.filter(hasCustomBodyweightRatio)[0]
      if (withRatio) {
        canonical.bwRatio = Number(withRatio.bwRatio)
        listChanged = true
      }
    }
    const duplicateSet = {}
    duplicateKeys.forEach(function (key) { duplicateSet[key] = true })

    mergeReport.count += duplicateKeys.length
    mergeReport.names.push(canonical.name)

    Object.keys(all).forEach(function (date) {
      ;(all[date] || []).forEach(function (set) {
        if (duplicateSet[set.type]) {
          set.type = canonical.key
          recordsChanged = true
        }
      })
    })

    duplicateKeys.forEach(function (key) {
      if (goals[canonical.key] === undefined && goals[key] !== undefined) {
        goals[canonical.key] = goals[key]
        goalsChanged = true
      }
      if (reps[canonical.key] === undefined && reps[key] !== undefined) {
        reps[canonical.key] = reps[key]
        repsChanged = true
      }
      if (goals[key] !== undefined) {
        delete goals[key]
        goalsChanged = true
      }
      if (reps[key] !== undefined) {
        delete reps[key]
        repsChanged = true
      }
    })

    const kept = list.filter(function (e) { return !duplicateSet[e.key] })
    if (kept.length !== list.length) {
      list.splice(0, list.length)
      kept.forEach(function (e) { list.push(e) })
      listChanged = true
    }
  })

  if (recordsChanged) saveAll(all)
  if (goalsChanged) wx.setStorageSync(GOAL_KEY, goals)
  if (repsChanged) wx.setStorageSync(REPS_KEY, reps)
  if (listChanged) writeList(list)
  return list
}

/** 首次使用（或数据被清掉）时，用内置项做种子 */
function ensureList() {
  const cur = readList()
  if (cur && cur.length) return mergeDuplicateExercises(cur)
  const seed = BUILTIN.map(function (e) {
    const item = {
      key: e.key, name: e.name, emoji: e.emoji, icon: e.icon,
      color: e.color, soft: e.soft, desc: e.desc,
      builtin: true, hidden: false,
      groupId: ensureGroups()[0].id
    }
    if (Number(e.defaultWeight) > 0) item.defaultWeight = Number(e.defaultWeight)
    return item
  })
  writeList(seed)
  return mergeDuplicateExercises(seed)
}

function softOf(color) {
  const hit = PALETTE.filter(function (p) { return p.color === color })[0]
  return hit ? hit.soft : '#F4F2E8'
}

/** 某个项目的每日目标 */
function goalOf(key) {
  const g = wx.getStorageSync(GOAL_KEY) || {}
  const v = Number(g[key])
  if (v > 0) return v
  const b = BUILTIN.filter(function (e) { return e.key === key })[0]
  return b ? b.goal : DEFAULT_CUSTOM_GOAL
}

/* 主色从蓝紫换成柠檬黄，老设备里已经存下的旧颜色在这里就地升级一次 */
const LEGACY_COLOR = { '#4F6EF7': '#E3A800', '#EEF1FE': '#FFF3C9' }

function upgradeColor(c) {
  return LEGACY_COLOR[String(c || '').toUpperCase()] || c
}

/**
 * 老数据里内置项没有 icon 字段（那时用的还是 emoji），
 * 这里按 key 补上专属图标令牌；用户主动选了 emoji 的会存成 ''，不会被覆盖
 */
function builtinIcon(key) {
  const b = BUILTIN.filter(function (e) { return e.key === key })[0]
  return b && b.icon ? b.icon : ''
}

function iconTokenOf(e) {
  const raw = typeof e.icon === 'undefined' ? builtinIcon(e.key) : (e.icon || '')
  return ICON_ALIAS[raw] || raw
}

function decorate(e, groupNames) {
  const color = upgradeColor(e.color)
  const migrated = color !== e.color
  const token = iconTokenOf(e)
  return {
    key: e.key,
    name: e.name,
    emoji: e.emoji,
    icon: e.emoji,                                  // 文本图标（emoji）
    iconKey: token,                                 // 专属图标令牌（'' = 无）
    iconPath: ICON_FILES[token] || '',              // 专属图标文件路径
    color: color,
    soft: migrated ? softOf(color) : (e.soft || softOf(color)),
    desc: e.desc || '',
    builtin: !!e.builtin,
    hidden: !!e.hidden,
    goal: goalOf(e.key),
    bwRatio: bodyweightRatio(e),                    // 有效自重比例（0~1）
    bwPercent: Math.round(bodyweightRatio(e) * 100),
    bwDefault: defaultBodyweightRatio(e),
    bwDefaultPercent: Math.round(defaultBodyweightRatio(e) * 100),
    bwCustom: hasCustomBodyweightRatio(e),
    defaultWeight: Number(e.defaultWeight) || 0,       // 项目默认负重（kg），0 = 无
    groupId: e.groupId || DEFAULT_GROUP_ID,
    groupName: (groupNames && groupNames[e.groupId]) || ''
  }
}

/** 全部项目（含已隐藏的），管理页用 */
function getAllExercises() {
  /* 顺序要紧：先让项目定义落盘（含内置项迁移），再补分组并回写 groupId，
     最后重新读一次列表。否则新补的内置项会没有 groupId，分组过滤会漏掉它。 */
  ensureList()
  const groupNames = getGroupMap()
  return ensureList().map(function (e) { return decorate(e, groupNames) })
}

/** 当前启用的项目（未隐藏），统计 / 分享用 */
function getExercises() {
  return getAllExercises().filter(function (e) { return !e.hidden })
}

/**
 * 打卡页项目：未隐藏的全部项目；按分组锻炼，不再额外过滤。
 * 传 groupId 时只返回该分组的项目，不传则是全部（兼容旧调用）。
 */
function getCheckinExercises(groupId) {
  return getExercises().filter(function (e) {
    return !groupId || e.groupId === groupId
  })
}

/** key -> 项目（含隐藏的，保证历史记录里的旧项目也能显示名字） */
function getExerciseMap() {
  const m = {}
  getAllExercises().forEach(function (e) { m[e.key] = e })
  return m
}

/** 新增自定义项目（groupId 不传则放进第一个分组） */
function addExercise(name, emoji, color, icon, groupId) {
  const groups = ensureGroups()
  const list = ensureList()
  const n = String(name || '').trim().slice(0, 8)
  if (!n) return { ok: false, reason: '请填写项目名称' }
  if (list.length >= MAX_EXERCISES) return { ok: false, reason: '最多 ' + MAX_EXERCISES + ' 个项目，先删掉几个吧' }

  const nk = exerciseNameKey(n)
  const dup = list.filter(function (e) { return exerciseNameKey(e.name) === nk })[0]
  if (dup) return { ok: false, reason: '已经有同名项目了' }

  const p = PALETTE.filter(function (x) { return x.color === color })[0] || PALETTE[0]
  const key = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

  list.push({
    key: key, name: n,
    emoji: emoji || '🏋️',
    icon: ICON_FILES[icon] ? icon : '',
    color: p.color, soft: p.soft,
    /* 留空，位置留给「训练部位」：能按图标推出来就显示，推不出来就不占一行 */
    desc: '',
    builtin: false, hidden: false,
    groupId: groups.some(function (g) { return g.id === groupId }) ? groupId : groups[0].id
  })
  writeList(list)
  return { ok: true, key: key }
}

/** 尚未添加的推荐项目 */
function getPresets() {
  const names = {}
  ensureList().forEach(function (e) { names[exerciseNameKey(e.name)] = 1 })
  return PRESETS.filter(function (p) { return !names[exerciseNameKey(p.name)] })
}

/** 一键添加推荐项目（含默认图标 / 配色 / 每日目标）；groupId 不传则放进第一个分组 */
function addPreset(name, groupId) {
  const p = PRESETS.filter(function (x) { return x.name === name })[0]
  if (!p) return { ok: false, reason: '没有这个推荐项目' }

  const r = addExercise(p.name, '', p.color, p.icon, groupId)
  if (!r.ok) return r

  const key = r.key
  /* 补上描述与每日目标 */
  const list = ensureList()
  list.forEach(function (e) {
    if (e.key === key) {
      e.desc = p.desc
      e.emoji = e.emoji || ''
      if (Number(p.defaultWeight) > 0) e.defaultWeight = Number(p.defaultWeight)
    }
  })
  writeList(list)

  const g = wx.getStorageSync(GOAL_KEY) || {}
  g[key] = p.goal
  wx.setStorageSync(GOAL_KEY, g)

  return { ok: true, key: key }
}

/** 修改项目（改名 / 换图标 / 换颜色 / 显隐） */
function updateExercise(key, patch) {
  const list = ensureList()
  let hit = null
  list.forEach(function (e) { if (e.key === key) hit = e })
  if (!hit) return { ok: false, reason: '项目不存在' }

  if (patch.name !== undefined) {
    const n = String(patch.name).trim().slice(0, 8)
    if (!n) return { ok: false, reason: '名称不能为空' }
    const nk = exerciseNameKey(n)
    const dup = list.filter(function (e) {
      return e.key !== key && exerciseNameKey(e.name) === nk
    })[0]
    if (dup) return { ok: false, reason: '已经有同名项目了' }
    hit.name = n
  }
  if (patch.emoji) hit.emoji = patch.emoji
  if (patch.icon !== undefined) hit.icon = ICON_FILES[patch.icon] ? patch.icon : ''
  if (patch.color) {
    const p = PALETTE.filter(function (x) { return x.color === patch.color })[0]
    hit.color = patch.color
    hit.soft = p ? p.soft : softOf(patch.color)
  }
  if (patch.hidden !== undefined) hit.hidden = !!patch.hidden
  if (patch.groupId !== undefined) {
    if (!ensureGroups().some(function (g) { return g.id === patch.groupId })) {
      return { ok: false, reason: '分组不存在' }
    }
    hit.groupId = patch.groupId
  }

  /* null / '' = 清除自定义，回到该运动类型的推荐比例；0 是有效值 */
  if (patch.bwRatio !== undefined) {
    if (patch.bwRatio === null || patch.bwRatio === '') {
      delete hit.bwRatio
    } else {
      const v = Number(patch.bwRatio)
      if (!isFinite(v) || v < 0 || v > MAX_BW_RATIO) {
        return { ok: false, reason: '自重比例需在 0%–100% 之间' }
      }
      hit.bwRatio = Math.round(v * 1000) / 1000
    }
  }

  writeList(list)
  return { ok: true }
}

function setHidden(key, hidden) {
  return updateExercise(key, { hidden: hidden })
}

/**
 * 删除自定义项目（内置项目不可删）
 * 会连带删除该项目的全部历史记录
 */
function removeExercise(key) {
  const list = ensureList()
  let idx = -1
  list.forEach(function (e, i) { if (e.key === key) idx = i })
  if (idx < 0) return { ok: false, reason: '项目不存在' }
  if (list[idx].builtin) return { ok: false, reason: '内置项目不能删除，可以隐藏' }

  list.splice(idx, 1)
  writeList(list)

  const all = getAll()
  let removed = 0
  Object.keys(all).forEach(function (d) {
    const src = all[d] || []
    const arr = src.filter(function (s) { return s.type !== key })
    removed += src.length - arr.length
    if (arr.length) all[d] = arr
    else delete all[d]
  })
  saveAll(all)

  const g = wx.getStorageSync(GOAL_KEY) || {}
  delete g[key]
  wx.setStorageSync(GOAL_KEY, g)

  dropLastWeight(key)
  dropBestWeight(key)
  setLastReps(key, 0)

  return { ok: true, removed: removed }
}

/**
 * 备份恢复时可能遇到本机没有的项目（比如在另一台设备上建的自定义项）。
 * 为它补一个项目定义，避免记录被丢弃。
 */
function ensureExercise(key) {
  const list = ensureList()
  const hit = list.filter(function (e) { return e.key === key })[0]
  if (hit) return
  const p = PALETTE[list.length % PALETTE.length]
  list.push({
    key: key, name: '未命名项目', emoji: '🏋️',
    color: p.color, soft: p.soft, desc: '',
    builtin: false, hidden: false,
    groupId: ensureGroups()[0].id
  })
  writeList(list)
}

/* ------------------------------ 记录读写 ------------------------------ */

function getAll() {
  return wx.getStorageSync(RECORD_KEY) || {}
}

function saveAll(data) {
  wx.setStorageSync(RECORD_KEY, data)
}

function getDay(date) {
  const all = getAll()
  return all[date] || []
}

/* ------------------------------ 增删改 ------------------------------ */

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function addSet(date, type, reps, weight) {
  const all = getAll()
  if (!all[date]) all[date] = []
  all[date].push({
    id: makeId(),
    type: type,
    reps: Number(reps) || 0,
    weight: Number(weight) || 0,
    ts: Date.now()
  })
  saveAll(all)
  noteBestWeight(type, weight)
}

function removeSet(date, id) {
  const all = getAll()
  if (!all[date]) return
  all[date] = all[date].filter(function (s) { return s.id !== id })
  if (all[date].length === 0) delete all[date]
  saveAll(all)
}

function removeDay(date) {
  const all = getAll()
  delete all[date]
  saveAll(all)
}

/* ------------------------------ 目标 ------------------------------ */

function getGoals() {
  const out = {}
  getAllExercises().forEach(function (e) { out[e.key] = e.goal })
  return out
}

function setGoal(key, value) {
  const g = wx.getStorageSync(GOAL_KEY) || {}
  g[key] = Math.max(1, Number(value) || 1)
  wx.setStorageSync(GOAL_KEY, g)
  return getGoals()
}

/* --------------------------- 滑杆记忆的次数 --------------------------- */

/** 某个项目上次用滑杆选的次数；没记录过返回 0 */
function getLastReps(key) {
  const m = wx.getStorageSync(REPS_KEY) || {}
  const v = Number(m[key])
  return v > 0 ? v : 0
}

/** 记住某个项目这次选的次数 */
function setLastReps(key, value) {
  const m = wx.getStorageSync(REPS_KEY) || {}
  const v = Math.round(Number(value) || 0)
  if (v > 0) m[key] = v
  else delete m[key]
  wx.setStorageSync(REPS_KEY, m)
}

/** 全部项目的滑杆次数 {key: 次数}，一次读出来避免逐个读存储 */
function getAllLastReps() {
  const m = wx.getStorageSync(REPS_KEY)
  return m && typeof m === 'object' ? m : {}
}

/* --------------------------- 记住的负重 --------------------------- */

/** 全部项目上次填的负重 {key: kg}；显式存过 0 的也在里面（表示「这次不加重」） */
function getAllLastWeights() {
  const m = wx.getStorageSync(LAST_WEIGHT_KEY)
  return m && typeof m === 'object' ? m : {}
}

/** 记住某个项目的负重（0 = 用户主动清空，之后不再回退到历史） */
function setLastWeight(key, value) {
  if (!key) return
  const m = wx.getStorageSync(LAST_WEIGHT_KEY) || {}
  const v = Math.round((Number(value) || 0) * 10) / 10   /* 哑铃有 2.5kg 这种半公斤 */
  m[key] = v > 0 ? v : 0
  wx.setStorageSync(LAST_WEIGHT_KEY, m)
}

/** 历史里每个项目最近一组的负重 {key: kg}（0 也算，说明那组没加重） */
function lastLoggedWeightMap() {
  const all = getAll()
  const out = {}
  const has = function (k) { return Object.prototype.hasOwnProperty.call(out, k) }
  Object.keys(all).sort().reverse().forEach(function (d) {   /* 日期字符串倒序 = 从新到旧 */
    const sets = all[d] || []
    for (let i = sets.length - 1; i >= 0; i--) {             /* 同一天里后面的更新 */
      const s = sets[i]
      if (!s.type || has(s.type)) continue
      out[s.type] = Math.round((Number(s.weight) || 0) * 10) / 10
    }
  })
  return out
}

/**
 * 打卡页要给每个项目预填的负重 {key: kg}：
 * 用户亲手填过的优先（含主动清空的 0），没填过就回退到历史上最近一组的负重。
 * 一次算好整张表，避免每张卡片各扫一遍记录。
 */
function getLastWeightMap() {
  const out = lastLoggedWeightMap()
  const explicit = getAllLastWeights()
  Object.keys(explicit).forEach(function (k) {
    const v = Number(explicit[k])
    out[k] = isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : 0
  })
  /* 既没亲手填过、也没有任何历史记录的项目：用项目自带的默认负重兜底。
     显式存过 0（用户主动清空）或历史里记过 0 的都不会走到这里，仍按用户意愿留空 */
  const defs = readList() || []
  defs.forEach(function (e) {
    const v = Number(e.defaultWeight)
    if (out[e.key] === undefined && isFinite(v) && v > 0) {
      out[e.key] = Math.round(v * 10) / 10
    }
  })
  return out
}

/** 单个项目的预填负重 */
function getLastWeight(key) {
  if (!key) return 0
  return getLastWeightMap()[key] || 0
}

/** 项目被删掉时清掉记住的负重 */
function dropLastWeight(key) {
  const m = wx.getStorageSync(LAST_WEIGHT_KEY)
  if (!m || typeof m !== 'object' || !(key in m)) return
  delete m[key]
  wx.setStorageSync(LAST_WEIGHT_KEY, m)
}

/* ---------------------- 每个项目的个人负重纪录 ---------------------- */

/** 从全部历史里重算一遍最高负重；老用户第一次读取时用它建档案 */
function rebuildBestWeights() {
  const out = {}
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    ;(all[d] || []).forEach(function (s) {
      const v = Math.round((Number(s.weight) || 0) * 10) / 10
      if (s.type && v > 0 && v > (out[s.type] || 0)) out[s.type] = v
    })
  })
  wx.setStorageSync(BEST_KEY, out)
  return out
}

/** {项目 key: 历史最高负重 kg}；没建过档案的按历史记录初始化一次 */
function getAllBestWeights() {
  const m = wx.getStorageSync(BEST_KEY)
  if (!m || typeof m !== 'object' || Array.isArray(m)) return rebuildBestWeights()
  return m
}

function getBestWeight(key) {
  if (!key) return 0
  return Number(getAllBestWeights()[key]) || 0
}

/** 记一组时顺手刷新纪录（只增不减，删记录不会把个人最好成绩抹掉） */
function noteBestWeight(key, weight) {
  if (!key) return
  const v = Math.round((Number(weight) || 0) * 10) / 10
  if (!(v > 0)) return
  const m = getAllBestWeights()
  if (v > (Number(m[key]) || 0)) {
    m[key] = v
    wx.setStorageSync(BEST_KEY, m)
  }
}

/** 导入备份时：覆盖模式直接采用备份里的纪录，合并模式取两边较大值 */
function mergeBestWeights(map, replace) {
  const cur = replace ? {} : getAllBestWeights()
  Object.keys(map || {}).forEach(function (k) {
    const v = Math.round((Number(map[k]) || 0) * 10) / 10
    if (v > 0 && v > (Number(cur[k]) || 0)) cur[k] = v
  })
  wx.setStorageSync(BEST_KEY, cur)
}

function dropBestWeight(key) {
  const m = wx.getStorageSync(BEST_KEY)
  if (!m || typeof m !== 'object' || !(key in m)) return
  delete m[key]
  wx.setStorageSync(BEST_KEY, m)
}

/* ------------------------------ 统计 ------------------------------ */

function sumOfDay(date, type) {
  return getDay(date)
    .filter(function (s) { return s.type === type })
    .reduce(function (acc, s) { return acc + s.reps }, 0)
}

function sumOfDate(date) {
  return getDay(date).reduce(function (acc, s) { return acc + s.reps }, 0)
}

/**
 * 自重动作每次大致移动多少体重（默认推荐值，用户可在项目页逐项覆盖）。
 *
 * 判定顺序：先看图标（换了图标就跟着图标走），再看名称关键字。
 * 名称用「包含」匹配，所以「保加利亚左腿 / 右腿」这类带后缀的名字也能命中。
 * 越具体的规则要排在越前面，避免「澳式引体」被「引体向上」抢先匹配。
 */
const BW_RULES = [
  /* 倒蹬机提踵：踩在踏板上，身体重量由座椅承担，只算器械配重
     （必须排在「提踵」规则前面，否则会被站姿提踵的 100% 抢先命中） */
  { ratio: 0, keys: ['legpresscalf'], names: ['倒蹬机提踵', '倒蹬提踵', '腿举提踵'] },
  /* 站姿提踵：每一次都是把整个身体顶起来 */
  { ratio: 1, keys: ['calf'], names: ['提踵'] },
  /* 引体向上：双臂约占体重 10% */
  { ratio: 0.9, keys: ['pullup'], names: ['引体向上'] },
  /* 双杠臂屈伸：同样是双臂撑起，去掉约 10% */
  { ratio: 0.9, keys: ['dips', 'dip'], names: ['双杠臂屈伸', '双杠曲臂伸'] },
  /* 保加利亚深蹲：单腿承担大部分体重，另一条腿搭在凳上分担一小部分 */
  { ratio: 0.75, keys: ['bulgarian'], names: ['保加利亚'] },
  /* 澳式引体：脚跟着地、身体斜挂，实际拉起约一半体重 */
  { ratio: 0.5, keys: ['invertedrow'], names: ['澳式引体'] },
  /* 俯卧撑：标准姿势双手撑起约一半体重 */
  { ratio: 0.5, keys: ['pushup'], names: ['俯卧撑'] },
  /* 山羊挺身：把髋以上的上半身抬起 */
  { ratio: 0.5, keys: ['backext'], names: ['山羊挺身', '罗马椅挺身'] },
  /* 单杠提腿：悬垂时手臂与肩带承重，腹部只负责抬起下半身 */
  { ratio: 0.4, keys: ['hangleg'], names: ['单杠提腿'] },
  /* 臀推 / 臀桥：不自重折算，只算额外负重（杠铃片 / 器械重量） */
  { ratio: 0, keys: ['hipbridge'], names: ['臀推', '臀桥'] },
  /* 臂力棒：阻力来自弹簧，跟体重无关，训练量按「标注阻力 × 次数」算 */
  { ratio: 0, keys: ['powerbar'], names: ['臂力棒', '弹簧棒', '握力棒'] },
  /* 坐/卧 弯腿举：器械动作，配重由托垫承担，只算配重、不自重折算 */
  { ratio: 0, keys: ['legcurl'], names: ['弯腿举', '腿弯举'] },
  /* 倒蹬机 / 倒蹬：身体重量由座椅承担，只算器械配重（「倒蹬机提踵」在上面已单独命中） */
  { ratio: 0, keys: ['legpress'], names: ['倒蹬', '腿举'] }
]

function defaultBodyweightRatio(ex) {
  ex = ex || {}
  const icon = String(ex.iconKey || ex.icon || '')
  const name = exerciseNameKey(ex.name)

  for (let i = 0; i < BW_RULES.length; i++) {
    const rule = BW_RULES[i]
    if (icon && rule.keys.indexOf(icon) >= 0) return rule.ratio
    if (name && rule.names.some(function (k) { return name.indexOf(k) >= 0 })) return rule.ratio
  }
  return 0
}

/** 用户是否给这个项目设过自定义自重比例（0% 也是有效设置） */
function hasCustomBodyweightRatio(ex) {
  if (!ex || ex.bwRatio === undefined || ex.bwRatio === null || ex.bwRatio === '') return false
  const v = Number(ex.bwRatio)
  /* 旧版本允许过 150%，这里放宽到 1.5 仍认作「已设置」，计算时再截到 100% */
  return isFinite(v) && v >= 0 && v <= 1.5
}

/** 有效比例：优先用户设置，否则按项目类型用默认值；上限 100% */
function bodyweightRatio(ex) {
  if (hasCustomBodyweightRatio(ex)) return Math.min(MAX_BW_RATIO, Number(ex.bwRatio))
  return defaultBodyweightRatio(ex)
}

/** 单组训练量：(额外负重 + 体重 × 自重比例) × 次数 */
function estimateSetLoad(set, ex, bodyWeight) {
  const reps = Math.max(0, Number(set && set.reps) || 0)
  const external = Math.max(0, Number(set && set.weight) || 0)
  const body = Math.max(0, Number(bodyWeight) || 0) * bodyweightRatio(ex)
  return (external + body) * reps
}

/** 当日总重量（kg，估算），包含当天所有项目，不受隐藏状态影响 */
function totalWeightOfDay(date) {
  const exercises = getExerciseMap()
  const bodyWeight = getProfile().weight
  const total = getDay(date).reduce(function (sum, set) {
    return sum + estimateSetLoad(set, exercises[set.type], bodyWeight)
  }, 0)
  return Math.round(total * 10) / 10
}

/**
 * 某天相对此前历史的「单项负重」破纪录项目。
 * 返回 [{ key, name, weight }]：weight > 0 表示刷新了该项目的单次负重纪录（kg）。
 * 只比较 date 之前的记录，重看历史某天时不会被那天之后的成绩影响。
 */
function recordBreaksOfDay(date) {
  const all = getAll()
  const exercises = getExerciseMap()
  const beforeWeight = {}
  const day = String(date || '')

  Object.keys(all).forEach(function (d) {
    if (!d || d >= day) return
    ;(all[d] || []).forEach(function (set) {
      const k = set.type
      if (!k) return
      const w = Math.round((Number(set.weight) || 0) * 10) / 10
      if (w > (beforeWeight[k] || 0)) beforeWeight[k] = w
    })
  })

  const todayWeight = {}
  const order = []
  ;(all[day] || []).forEach(function (set) {
    const k = set.type
    if (!k) return
    if (!(k in todayWeight)) {
      todayWeight[k] = 0
      order.push(k)
    }
    const w = Math.round((Number(set.weight) || 0) * 10) / 10
    if (w > todayWeight[k]) todayWeight[k] = w
  })

  const out = []
  order.forEach(function (k) {
    if (todayWeight[k] <= (beforeWeight[k] || 0)) return
    out.push({
      key: k,
      name: (exercises[k] && exercises[k].name) || k,
      weight: todayWeight[k]
    })
  })
  return out
}

/** 各项目累计重量（kg，估算），统计全部历史；统计页「项目累计」用 */
function totalWeightByType() {
  const exercises = getExerciseMap()
  const bodyWeight = getProfile().weight
  const out = {}
  getAllExercises().forEach(function (e) { out[e.key] = 0 })
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    (all[d] || []).forEach(function (set) {
      if (out[set.type] === undefined) return
      out[set.type] += estimateSetLoad(set, exercises[set.type], bodyWeight)
    })
  })
  Object.keys(out).forEach(function (k) { out[k] = Math.round(out[k]) })
  return out
}

/** 全部历史累计重量（kg，估算）。口径与 totalReps 一致：含隐藏项目的历史 */
function totalWeight() {
  const byType = totalWeightByType()
  let t = 0
  Object.keys(byType).forEach(function (k) { t += byType[k] })
  return Math.round(t)
}

function getAllDates() {
  const all = getAll()
  return Object.keys(all)
    .filter(function (d) { return all[d] && all[d].length > 0 })
    .sort()
    .reverse()
}

function totalReps() {
  const all = getAll()
  let t = 0
  Object.keys(all).forEach(function (d) {
    (all[d] || []).forEach(function (s) { t += s.reps })
  })
  return t
}

/** 各项目累计次数（含隐藏项目的历史数据） */
function totalByType() {
  const res = {}
  getAllExercises().forEach(function (e) { res[e.key] = 0 })
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    (all[d] || []).forEach(function (s) {
      if (res[s.type] !== undefined) res[s.type] += s.reps
    })
  })
  return res
}

function totalDays() {
  return getAllDates().length
}

function streakDays() {
  const dates = getAllDates()
  if (dates.length === 0) return 0
  const t = U.today()
  const y = U.addDays(t, -1)
  if (dates[0] !== t && dates[0] !== y) return 0

  let count = 0
  let cursor = dates[0] === t ? t : y
  const set = {}
  dates.forEach(function (d) { set[d] = true })
  while (set[cursor]) {
    count++
    cursor = U.addDays(cursor, -1)
  }
  return count
}

/* ------------------------------ 区间统计 ------------------------------ */

/**
 * 落在 [start, end] 闭区间内、且有记录的日期（升序）
 * 日期是 'YYYY-MM-DD'，字典序即时间序，可直接比较
 */
function datesInRange(start, end) {
  const all = getAll()
  return Object.keys(all)
    .filter(function (d) { return d >= start && d <= end && all[d] && all[d].length > 0 })
    .sort()
}

/** 区间内总次数 */
function sumRange(start, end) {
  const all = getAll()
  let t = 0
  datesInRange(start, end).forEach(function (d) {
    (all[d] || []).forEach(function (s) { t += s.reps })
  })
  return t
}

/** 区间内各项目次数 */
function totalByTypeRange(start, end) {
  const res = {}
  getAllExercises().forEach(function (e) { res[e.key] = 0 })
  const all = getAll()
  datesInRange(start, end).forEach(function (d) {
    (all[d] || []).forEach(function (s) {
      if (res[s.type] !== undefined) res[s.type] += s.reps
    })
  })
  return res
}

/** 区间内有记录的天数 */
function activeDaysInRange(start, end) {
  return datesInRange(start, end).length
}

/** 区间内的组数 */
function setCountInRange(start, end) {
  const all = getAll()
  let n = 0
  datesInRange(start, end).forEach(function (d) { n += (all[d] || []).length })
  return n
}

/** 区间内各项目的组数：分享卡每行要显示「总组数」，不能只有一个总数 */
function setCountByTypeRange(start, end) {
  const res = {}
  getAllExercises().forEach(function (e) { res[e.key] = 0 })
  const all = getAll()
  datesInRange(start, end).forEach(function (d) {
    (all[d] || []).forEach(function (s) {
      if (res[s.type] !== undefined) res[s.type] += 1
    })
  })
  return res
}

function weekReps() {
  const start = U.startOfWeek(U.today())
  let t = 0
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    if (d >= start) {
      (all[d] || []).forEach(function (s) { t += s.reps })
    }
  })
  return t
}

function bestDay() {
  const all = getAll()
  let best = null
  Object.keys(all).forEach(function (d) {
    const sum = (all[d] || []).reduce(function (a, s) { return a + s.reps }, 0)
    if (!best || sum > best.total) best = { date: d, total: sum }
  })
  return best
}

/** 重量口径的「单日最高」：吨位最大的那一天 */
function bestLoadDay() {
  const dates = getAllDates()
  if (!dates.length) return null
  let best = null
  dates.forEach(function (d) {
    const kg = totalWeightOfDay(d)
    if (!best || kg > best.kg) best = { date: d, kg: kg }
  })
  return best && best.kg > 0 ? best : null
}

/**
 * 某一天的吨位，在全部有记录的日子里排第几（1 = 最高）。
 * 打卡页圆环用它显示「历史第 N」，并算出追上更前一名还要做多少 kg。
 *
 * gapKg = 前一名与今天的差值向上取整；equal 的情况也算「更前一名」
 * 之外（用 > 比较），所以排名相同时是并列，不会出现 gap 为 0。
 */
function dayLoadRank(date) {
  const all = getAll()
  const exercises = getExerciseMap()
  const bodyWeight = getProfile().weight

  const days = []
  Object.keys(all).forEach(function (d) {
    const sets = all[d] || []
    if (!sets.length) return
    const kg = sets.reduce(function (a, s) {
      return a + estimateSetLoad(s, exercises[s.type], bodyWeight)
    }, 0)
    days.push({ date: d, kg: Math.round(kg * 10) / 10 })
  })
  if (!days.length) return null

  const mine = days.filter(function (x) { return x.date === date })[0]
  if (!mine || mine.kg <= 0) return null

  let higher = 0
  let prevKg = 0
  days.forEach(function (x) {
    if (x.date === date) return
    if (x.kg > mine.kg) {
      higher++
      /* 记下「比今天高」的那些日子里最低的一天，那就是下一名要追的目标 */
      if (!prevKg || x.kg < prevKg) prevKg = x.kg
    }
  })

  return {
    rank: higher + 1,
    days: days.length,
    kg: mine.kg,
    prevKg: prevKg,
    gapKg: higher > 0 ? Math.max(1, Math.ceil(prevKg - mine.kg)) : 0
  }
}

/**
 * 某个项目的单日训练量，在「这个项目所有有记录的日子」里排第几（1 = 最高）。
 * 打卡页每个项目卡片用它标出历史排名和追上更前一名还差多少 kg。
 * 同日多组累加；gapKg 口径与 dayLoadRank 一致：向上取整、至少 1。
 */
function exerciseLoadRank(date, key) {
  if (!key) return null
  const all = getAll()
  const exercises = getExerciseMap()
  const bodyWeight = getProfile().weight
  const days = []

  Object.keys(all).forEach(function (d) {
    const kg = (all[d] || []).reduce(function (a, s) {
      if (s.type !== key) return a
      return a + estimateSetLoad(s, exercises[key], bodyWeight)
    }, 0)
    if (kg > 0) days.push({ date: d, kg: Math.round(kg * 10) / 10 })
  })
  if (!days.length) return null

  const mine = days.filter(function (x) { return x.date === date })[0]
  if (!mine || mine.kg <= 0) return null

  let higher = 0
  let prevKg = 0
  days.forEach(function (x) {
    if (x.date === date) return
    if (x.kg > mine.kg) {
      higher++
      if (!prevKg || x.kg < prevKg) prevKg = x.kg
    }
  })

  return {
    rank: higher + 1,
    days: days.length,
    kg: mine.kg,
    prevKg: prevKg,
    gapKg: higher > 0 ? Math.max(1, Math.ceil(prevKg - mine.kg)) : 0
  }
}

/** 本周累计重量（kg），从本周第一天开始算，与 weekReps 同一时间口径 */
function weekWeight() {
  const start = U.startOfWeek(U.today())
  const exercises = getExerciseMap()
  const bodyWeight = getProfile().weight
  let t = 0
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    if (d < start) return
    (all[d] || []).forEach(function (s) {
      t += estimateSetLoad(s, exercises[s.type], bodyWeight)
    })
  })
  return Math.round(t)
}

function bestSetOf(type) {
  let best = null
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    (all[d] || []).forEach(function (s) {
      if (s.type === type && (!best || s.reps > best.reps)) best = s
    })
  })
  return best
}

/**
 * 每个项目最近一次被打卡的时间戳（毫秒）
 * 统计的是全部历史，不只是今天 —— 隔天打开小程序也能把上次练的项目排到最前
 * 从未打过卡的项目不会出现在结果里
 */
function lastUsedMap() {
  const res = {}
  const all = getAll()
  Object.keys(all).forEach(function (d) {
    (all[d] || []).forEach(function (s) {
      const ts = Number(s.ts) || 0
      if (res[s.type] === undefined || ts > res[s.type]) res[s.type] = ts
    })
  })
  return res
}

/** 最近一次打卡的项目 key；一条记录都没有时返回 '' */
function lastUsedKey() {
  const m = lastUsedMap()
  let best = ''
  let ts = 0
  Object.keys(m).forEach(function (k) {
    if (m[k] > ts) { ts = m[k]; best = k }
  })
  return best
}

/**
 * 按「最后一次打卡时间」倒序排列项目
 * 最新打卡的排第一，次新的排第二，以此类推；
 * 从未打过卡的项目排在最后，彼此之间保持「项目」页里的定义顺序
 */
function orderByLastUsed(list) {
  const m = lastUsedMap()
  return list.map(function (e, i) {
    return { e: e, i: i, ts: m[e.key] || 0 }
  }).sort(function (a, b) {
    if (b.ts !== a.ts) return b.ts - a.ts
    return a.i - b.i
  }).map(function (x) { return x.e })
}

/**
 * 近 n 天数据：返回 [{date, total, values:{项目key: 次数}}]，从早到晚
 * 项目是动态的，所以用 values 而不是固定字段
 */
/**
 * 按日 / 周 / 月聚合的重量时间序列（升序，最后一个桶是当前周期）
 * gran: 'day' | 'week' | 'month'；label 直接给图表的 X 轴用
 */
function weightBuckets(gran, count) {
  const exercises = getExerciseMap()
  const bodyWeight = getProfile().weight
  const all = getAll()

  /* 先按天算好，再往桶里加，避免每个桶都遍历一遍全部记录 */
  const dayKg = {}
  Object.keys(all).forEach(function (d) {
    dayKg[d] = (all[d] || []).reduce(function (sum, set) {
      return sum + estimateSetLoad(set, exercises[set.type], bodyWeight)
    }, 0)
  })
  const dates = Object.keys(dayKg).sort()

  const today = U.today()
  const buckets = []
  if (gran === 'week') {
    let s = U.startOfWeek(today)
    for (let i = 0; i < count; i++) {
      buckets.unshift({ start: s, end: U.addDays(s, 6) })
      s = U.addDays(s, -7)
    }
  } else if (gran === 'month') {
    let s = U.startOfMonth(today)
    for (let i = 0; i < count; i++) {
      buckets.unshift({ start: s, end: U.endOfMonth(s) })
      s = U.startOfMonth(U.addDays(s, -1))
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const d = U.addDays(today, -i)
      buckets.push({ start: d, end: d })
    }
  }

  return buckets.map(function (b) {
    let kg = 0
    dates.forEach(function (d) {
      if (d >= b.start && d <= b.end) kg += dayKg[d]
    })
    let label
    if (gran === 'month') {
      /* 30 个月跨 2~3 年，标成 25/11 才不歧义 */
      label = b.start.slice(2, 4) + '/' + String(Number(b.start.slice(5, 7)))
    } else {
      label = String(Number(b.start.slice(5, 7))) + '/' + String(Number(b.start.slice(8, 10)))
    }
    return { key: b.start, start: b.start, end: b.end, label: label, kg: Math.round(kg) }
  })
}

function recentSeries(n) {
  const days = U.lastDays(n)
  return days.map(function (d) {
    const item = { date: d, total: 0, values: {} }
    getDay(d).forEach(function (s) {
      if (item.values[s.type] === undefined) item.values[s.type] = 0
      item.values[s.type] += s.reps
    })
    item.total = getDay(d).reduce(function (a, s) { return a + s.reps }, 0)
    return item
  })
}

/* ------------------------------ 个人资料 ------------------------------ */

/** 空资料（首次使用时的默认值） */
const EMPTY_PROFILE = {
  avatar: '',      // 本地文件路径（用微信头像填写能力拿到后存到用户目录）
  nickname: '',
  gender: '',      // 'male' | 'female' | ''（保密）
  age: 0,
  height: 0,       // cm
  weight: 0,       // kg
  createdAt: 0,
  updatedAt: 0
}

const GENDERS = [
  { key: 'male', name: '男' },
  { key: 'female', name: '女' },
  { key: '', name: '保密' }
]

/** 文件还在不在（清缓存后头像文件会失效，避免显示空白图） */
function fileOk(path) {
  if (!path) return false
  if (path.indexOf('http') === 0) return true
  try {
    const fs = wx.getFileSystemManager && wx.getFileSystemManager()
    if (!fs || !fs.accessSync) return true
    fs.accessSync(path)
    return true
  } catch (e) {
    return false
  }
}

function num(v, min, max) {
  const n = Number(v)
  if (!n || isNaN(n)) return 0
  return Math.min(max, Math.max(min, n))
}

function getProfile() {
  const raw = wx.getStorageSync(PROFILE_KEY) || {}
  const p = {
    avatar: typeof raw.avatar === 'string' ? raw.avatar : '',
    nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, 20) : '',
    gender: ['male', 'female'].indexOf(raw.gender) >= 0 ? raw.gender : '',
    age: num(raw.age, 1, 120),
    height: num(raw.height, 50, 250),
    weight: num(raw.weight, 20, 300),
    createdAt: Number(raw.createdAt) || 0,
    updatedAt: Number(raw.updatedAt) || 0
  }
  if (p.avatar && !fileOk(p.avatar)) p.avatar = ''
  return p
}

/** 局部更新资料，未传的字段保留原值 */
function saveProfile(patch) {
  const cur = getProfile()
  const next = Object.assign({}, cur)
  const now = Date.now()

  if (patch.avatar !== undefined) next.avatar = String(patch.avatar || '')
  if (patch.nickname !== undefined) next.nickname = String(patch.nickname || '').trim().slice(0, 20)
  if (patch.gender !== undefined) next.gender = ['male', 'female', ''].indexOf(patch.gender) >= 0 ? patch.gender : ''
  if (patch.age !== undefined) next.age = num(patch.age, 0, 120)
  if (patch.height !== undefined) next.height = num(patch.height, 0, 250)
  if (patch.weight !== undefined) next.weight = num(patch.weight, 0, 300)

  if (!next.createdAt) next.createdAt = now
  next.updatedAt = now
  wx.setStorageSync(PROFILE_KEY, next)
  return next
}

/**
 * BMI（中国成人标准）
 * <18.5 偏瘦 / 18.5–23.9 正常 / 24–27.9 超重 / ≥28 肥胖
 */
function bmiOf(p) {
  const h = Number(p && p.height) || 0
  const w = Number(p && p.weight) || 0
  if (h <= 0 || w <= 0) return { ok: false, value: '', text: '', color: '', range: '' }

  const m = h / 100
  const v = Math.round((w / (m * m)) * 10) / 10

  let text = '正常'
  let color = '#2BC48A'
  if (v < 18.5) { text = '偏瘦'; color = '#06B6D4' }
  else if (v < 24) { text = '正常'; color = '#2BC48A' }
  else if (v < 28) { text = '超重'; color = '#FF9F43' }
  else { text = '肥胖'; color = '#EF4444' }

  const lo = Math.round(18.5 * m * m * 10) / 10
  const hi = Math.round(23.9 * m * m * 10) / 10

  return {
    ok: true,
    value: v.toFixed(1),
    text: text,
    color: color,
    range: lo.toFixed(1) + ' – ' + hi.toFixed(1)
  }
}

/** 性别中文名 */
function genderName(key) {
  const hit = GENDERS.filter(function (g) { return g.key === key })[0]
  return hit ? hit.name : '保密'
}

/* ------------------------------ 体重记录 ------------------------------ */

function getWeights() {
  return wx.getStorageSync(WEIGHT_KEY) || {}
}

/**
 * 记录某天的体重，同时同步到资料里的「当前体重」
 * @returns {{ok:boolean, reason?:string}}
 */
function setWeight(date, kg) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: '日期无效' }
  const v = Number(kg)
  if (!v || isNaN(v)) return { ok: false, reason: '请输入体重' }
  if (v < 20 || v > 300) return { ok: false, reason: '体重应在 20 – 300 kg 之间' }

  const all = getWeights()
  all[date] = Math.round(v * 10) / 10
  wx.setStorageSync(WEIGHT_KEY, all)

  // 只在记录的是「最新一天」时才更新资料里的当前体重
  const keys = Object.keys(all).sort()
  if (keys[keys.length - 1] === date) saveProfile({ weight: all[date] })

  return { ok: true }
}

function removeWeight(date) {
  const all = getWeights()
  delete all[date]
  wx.setStorageSync(WEIGHT_KEY, all)

  const keys = Object.keys(all).sort()
  saveProfile({ weight: keys.length ? all[keys[keys.length - 1]] : 0 })
}

/** 体重记录列表，按日期倒序，带与上一次的差值 */
function weightList() {
  const all = getWeights()
  const dates = Object.keys(all).sort().reverse()

  return dates.map(function (d, i) {
    const cur = all[d]
    const prevDate = dates[i + 1]
    const prev = prevDate ? all[prevDate] : 0
    const diff = prev ? Math.round((cur - prev) * 10) / 10 : 0

    let diffText = ''
    let diffClass = 'flat'
    if (diff > 0) { diffText = '+' + diff.toFixed(1); diffClass = 'up' }
    else if (diff < 0) { diffText = diff.toFixed(1); diffClass = 'down' }

    return {
      date: d,
      dateText: U.prettyDate(d),
      kg: cur.toFixed(1),
      diffText: diffText,
      diffClass: diffClass,
      isToday: d === U.today()
    }
  })
}

/* ------------------------------ 备份 / 恢复 ------------------------------ */

const BACKUP_HEADER = 'WORKOUT_BACKUP_1'

function setSig(s) {
  return [s.type, s.reps, s.weight || 0, Math.floor((s.ts || 0) / 1000)].join('|')
}

/** 导出全部记录为一段可复制的文本（含项目定义，换设备也能恢复自定义项目） */
function exportBackup() {
  const all = getAll()
  const records = {}
  let sets = 0
  let days = 0

  Object.keys(all).forEach(function (d) {
    const list = all[d] || []
    if (!list.length) return
    days++
    records[d] = list.map(function (s) {
      sets++
      const o = { t: s.type, r: Number(s.reps) || 0, s: Math.floor((s.ts || 0) / 1000) }
      if (s.weight) o.w = Number(s.weight) || 0
      return o
    })
  })

  const p = getProfile()
  const w = getWeights()

  const payload = {
    v: 4,
    app: 'workout-tracker',
    exportedAt: Math.floor(Date.now() / 1000),
    groups: (readGroups() || sanitizeGroups(null)).map(function (g) {
      return { id: g.id, n: g.name }
    }),
    profile: {
      n: p.nickname,
      g: p.gender,
      a: p.age,
      h: p.height,
      w: p.weight
    },
    weights: w,
    best: getAllBestWeights(),
    goals: getGoals(),
    exercises: ensureList().map(function (e) {
      const o = { k: e.key, n: e.name, e: e.emoji, c: e.color, b: e.builtin ? 1 : 0, h: e.hidden ? 1 : 0 }
      if (e.icon) o.i = e.icon
      if (hasCustomBodyweightRatio(e)) o.bw = Math.round(Number(e.bwRatio) * 100)
      if (Number(e.defaultWeight) > 0) o.dw = Number(e.defaultWeight)
      if (e.groupId) o.g = e.groupId
      return o
    }),
    days: days,
    sets: sets,
    records: records
  }
  return BACKUP_HEADER + '\n' + JSON.stringify(payload)
}

function parseBackup(text) {
  const raw = String(text || '')
  if (!raw.trim()) return { ok: false, reason: '内容是空的' }

  const i = raw.indexOf('{')
  const j = raw.lastIndexOf('}')
  if (i < 0 || j <= i) return { ok: false, reason: '找不到备份数据，确认整段复制完整了吗' }

  let obj = null
  try {
    obj = JSON.parse(raw.slice(i, j + 1))
  } catch (e) {
    return { ok: false, reason: '格式无法识别，不是有效的备份文本' }
  }
  if (!obj || !obj.records || typeof obj.records !== 'object') {
    return { ok: false, reason: '备份里没有记录数据' }
  }

  const records = {}
  let count = 0
  let skipped = 0

  Object.keys(obj.records).forEach(function (d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { skipped++; return }
    const list = obj.records[d]
    if (!Array.isArray(list)) { skipped++; return }
    const arr = []
    list.forEach(function (s) {
      if (!s || !s.t) { skipped++; return }
      const reps = Number(s.r)
      if (!reps || reps <= 0) { skipped++; return }
      arr.push({
        id: makeId(),
        type: String(s.t),
        reps: Math.min(2000, Math.floor(reps)),
        weight: Math.min(500, Number(s.w) || 0),
        ts: (Number(s.s) || Math.floor(Date.now() / 1000)) * 1000
      })
      count++
    })
    if (arr.length) records[d] = arr
  })

  if (count === 0) return { ok: false, reason: '没有解析到任何有效记录' }

  const goals = {}
  Object.keys(obj.goals || {}).forEach(function (k) {
    const v = Number(obj.goals[k])
    if (v > 0) goals[k] = Math.min(2000, Math.floor(v))
  })

  /* 分组：老备份没有这个字段，导入后由 ensureGroups() 补默认分组 */
  const groups = sanitizeGroups(Array.isArray(obj.groups) ? obj.groups.map(function (g) {
    return { id: g && g.id, name: g && g.n }
  }) : null)
  const groupIds = {}
  groups.forEach(function (g) { groupIds[g.id] = 1 })

  const exercises = Array.isArray(obj.exercises) ? obj.exercises.map(function (e) {
    const item = {
      key: String(e.k || ''),
      name: String(e.n || '未命名项目').slice(0, 8),
      emoji: String(e.e || '🏋️'),
      icon: ICON_FILES[e.i] ? e.i : '',
      color: /^#[0-9A-Fa-f]{6}$/.test(e.c || '') ? e.c : PALETTE[0].color,
      builtin: !!e.b,
      hidden: !!e.h
    }
    if (e.bw !== undefined && e.bw !== null && e.bw !== '') {
      const bw = Number(e.bw)
      if (isFinite(bw) && bw >= 0) item.bwRatio = Math.min(MAX_BW_RATIO, bw / 100)
    }
    if (e.dw !== undefined && e.dw !== null && e.dw !== '') {
      const dw = Number(e.dw)
      if (isFinite(dw) && dw > 0) item.defaultWeight = Math.min(500, Math.round(dw * 10) / 10)
    }
    if (groupIds[e.g]) item.groupId = e.g
    return item
  }).filter(function (e) { return e.key }) : []

  /* 个人资料（头像存的是本地文件，不参与备份） */
  let profile = null
  const rp = obj.profile
  if (rp && typeof rp === 'object') {
    profile = {
      nickname: String(rp.n || '').slice(0, 20),
      gender: ['male', 'female'].indexOf(rp.g) >= 0 ? rp.g : '',
      age: num(rp.a, 0, 120),
      height: num(rp.h, 0, 250),
      weight: num(rp.w, 0, 300)
    }
  }

  /* 体重记录 */
  const weights = {}
  Object.keys(obj.weights || {}).forEach(function (d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return
    const v = Number(obj.weights[d])
    if (v >= 20 && v <= 300) weights[d] = Math.round(v * 10) / 10
  })

  /* 每个项目的个人负重纪录（老备份没有则用历史记录重算） */
  const best = {}
  Object.keys(obj.best || {}).forEach(function (k) {
    const v = Math.round((Number(obj.best[k]) || 0) * 10) / 10
    if (k && v > 0) best[k] = Math.min(500, v)
  })

  return {
    ok: true,
    records: records,
    goals: goals,
    exercises: exercises,
    groups: groups,
    best: best,
    profile: profile,
    weights: weights,
    count: count,
    days: Object.keys(records).length,
    skipped: skipped,
    hasProfile: !!profile || Object.keys(weights).length > 0
  }
}

/**
 * 导入备份
 * @param {string} text 备份文本
 * @param {string} mode 'merge' 合并 | 'replace' 覆盖
 */
function importBackup(text, mode) {
  const p = parseBackup(text)
  if (!p.ok) return { ok: false, reason: p.reason }

  const replace = mode === 'replace'

  /* 分组：覆盖模式以备份为准；合并模式把备份里本机没有的分组补进来 */
  if (replace) {
    writeGroups(p.groups)
  } else {
    const local = sanitizeGroups(readGroups())
    const ids = {}
    local.forEach(function (g) { ids[g.id] = 1 })
    p.groups.forEach(function (g) {
      if (!ids[g.id] && local.length < MAX_GROUPS) { local.push(g); ids[g.id] = 1 }
    })
    writeGroups(local)
  }
  setActiveGroup('all')

  /* 项目定义：覆盖模式直接用备份里的；合并模式补进本机没有的 */
  if (replace && p.exercises.length) {
    writeList(p.exercises.map(function (e) {
      const item = {
        key: e.key, name: e.name, emoji: e.emoji, icon: e.icon,
        color: e.color, soft: softOf(e.color), desc: e.builtin ? '' : '自定义项目',
        builtin: e.builtin, hidden: e.hidden
      }
      if (hasCustomBodyweightRatio(e)) item.bwRatio = Number(e.bwRatio)
      if (Number(e.defaultWeight) > 0) item.defaultWeight = Number(e.defaultWeight)
      if (e.groupId) item.groupId = e.groupId
      return item
    }))
  } else {
    p.exercises.forEach(function (e) { ensureExercise(e.key) })
  }

  const cur = replace ? {} : getAll()
  let added = 0
  let dup = 0

  Object.keys(p.records).forEach(function (d) {
    const exist = {}
    ;(cur[d] || []).forEach(function (s) { exist[setSig(s)] = true })
    if (!cur[d]) cur[d] = []
    p.records[d].forEach(function (s) {
      const sig = setSig(s)
      if (exist[sig]) { dup++; return }
      exist[sig] = true
      cur[d].push(s)
      added++
    })
    if (cur[d].length === 0) delete cur[d]
  })

  saveAll(cur)

  /* 记录里出现了本机没有的项目（老备份 / 别的设备建的），补上定义免得数据丢失 */
  Object.keys(cur).forEach(function (d) {
    (cur[d] || []).forEach(function (s) { ensureExercise(s.type) })
  })

  if (replace) wx.setStorageSync(GOAL_KEY, p.goals)

  /* 个人负重纪录：备份里没有的老版本，用当前全部记录重算一份 */
  if (Object.keys(p.best).length) mergeBestWeights(p.best, replace)
  else rebuildBestWeights()

  /* 个人资料 + 体重记录（头像不参与，保留本机的） */
  const local = getProfile()
  let touched = false

  if (p.profile) {
    if (replace) {
      saveProfile({
        nickname: p.profile.nickname,
        gender: p.profile.gender,
        age: p.profile.age,
        height: p.profile.height,
        weight: p.profile.weight
      })
      touched = true
    } else {
      // 合并模式只补本机没填过的字段，不覆盖已有资料
      const fill = {}
      if (!local.nickname && p.profile.nickname) fill.nickname = p.profile.nickname
      if (!local.gender && p.profile.gender) fill.gender = p.profile.gender
      if (!local.age && p.profile.age) fill.age = p.profile.age
      if (!local.height && p.profile.height) fill.height = p.profile.height
      if (!local.weight && p.profile.weight) fill.weight = p.profile.weight
      if (Object.keys(fill).length) { saveProfile(fill); touched = true }
    }
  }

  const wKeys = Object.keys(p.weights)
  if (wKeys.length) {
    const w = getWeights()
    wKeys.forEach(function (d) {
      if (replace || w[d] === undefined) w[d] = p.weights[d]
    })
    wx.setStorageSync(WEIGHT_KEY, w)
    touched = true
  }

  return {
    ok: true,
    added: added,
    dup: dup,
    days: Object.keys(cur).filter(function (d) { return cur[d] && cur[d].length > 0 }).length,
    profileTouched: touched
  }
}

/* ------------------------------ 导出 ------------------------------ */

module.exports = {
  BUILTIN: BUILTIN,
  EMOJIS: EMOJIS,
  ICON_FILES: ICON_FILES,
  ICON_NAMES: ICON_NAMES,
  MUSCLE_BY_ICON: MUSCLE_BY_ICON,
  muscleOf: muscleOf,
  PALETTE: PALETTE,
  DEFAULT_CUSTOM_GOAL: DEFAULT_CUSTOM_GOAL,
  MAX_EXERCISES: MAX_EXERCISES,
  getAllExercises: getAllExercises,
  getExercises: getExercises,
  getCheckinExercises: getCheckinExercises,
  getExercisesByGroup: getExercisesByGroup,
  getExerciseMap: getExerciseMap,
  getGroups: getGroups,
  addGroup: addGroup,
  renameGroup: renameGroup,
  removeGroup: removeGroup,
  moveGroup: moveGroup,
  getActiveGroup: getActiveGroup,
  setActiveGroup: setActiveGroup,
  MAX_GROUPS: MAX_GROUPS,
  MAX_GROUP_NAME: MAX_GROUP_NAME,
  addExercise: addExercise,
  getPresets: getPresets,
  addPreset: addPreset,
  updateExercise: updateExercise,
  setHidden: setHidden,
  removeExercise: removeExercise,
  takeMergeReport: takeMergeReport,
  getAll: getAll,
  getDay: getDay,
  addSet: addSet,
  removeSet: removeSet,
  removeDay: removeDay,
  getGoals: getGoals,
  setGoal: setGoal,
  getLastReps: getLastReps,
  setLastReps: setLastReps,
  getAllLastReps: getAllLastReps,
  getLastWeight: getLastWeight,
  getLastWeightMap: getLastWeightMap,
  setLastWeight: setLastWeight,
  getAllLastWeights: getAllLastWeights,
  dropLastWeight: dropLastWeight,
  getAllBestWeights: getAllBestWeights,
  getBestWeight: getBestWeight,
  noteBestWeight: noteBestWeight,
  rebuildBestWeights: rebuildBestWeights,
  sumOfDay: sumOfDay,
  sumOfDate: sumOfDate,
  defaultBodyweightRatio: defaultBodyweightRatio,
  hasCustomBodyweightRatio: hasCustomBodyweightRatio,
  bodyweightRatio: bodyweightRatio,
  estimateSetLoad: estimateSetLoad,
  totalWeightOfDay: totalWeightOfDay,
  recordBreaksOfDay: recordBreaksOfDay,
  totalWeightByType: totalWeightByType,
  totalWeight: totalWeight,
  datesInRange: datesInRange,
  sumRange: sumRange,
  totalByTypeRange: totalByTypeRange,
  activeDaysInRange: activeDaysInRange,
  setCountInRange: setCountInRange,
  setCountByTypeRange: setCountByTypeRange,
  getAllDates: getAllDates,
  totalReps: totalReps,
  totalByType: totalByType,
  totalDays: totalDays,
  streakDays: streakDays,
  weekReps: weekReps,
  weekWeight: weekWeight,
  bestDay: bestDay,
  bestLoadDay: bestLoadDay,
  dayLoadRank: dayLoadRank,
  exerciseLoadRank: exerciseLoadRank,
  bestSetOf: bestSetOf,
  lastUsedMap: lastUsedMap,
  lastUsedKey: lastUsedKey,
  orderByLastUsed: orderByLastUsed,
  recentSeries: recentSeries,
  weightBuckets: weightBuckets,
  GENDERS: GENDERS,
  getProfile: getProfile,
  saveProfile: saveProfile,
  bmiOf: bmiOf,
  genderName: genderName,
  getWeights: getWeights,
  setWeight: setWeight,
  removeWeight: removeWeight,
  weightList: weightList,
  exportBackup: exportBackup,
  parseBackup: parseBackup,
  importBackup: importBackup
}
