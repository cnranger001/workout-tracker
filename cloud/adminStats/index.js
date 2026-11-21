const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

const COLLECTION = 'users'
const SERIES_DAYS = 14

/* ============================================================
   管理口令只从云函数环境变量 ADMIN_TOKEN 读取，绝不写进代码。
   在云开发控制台给 adminStats 配置环境变量后，右键「上传并部署」。
   没配置（或还是 CHANGE_ME）时，所有请求一律拒绝。
   ============================================================ */
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '').trim()

function day(offset) {
  const t = Date.now() + (offset || 0) * 86400000 + 8 * 3600000
  return new Date(t).toISOString().slice(0, 10)
}

async function safe(p) {
  try {
    return await p
  } catch (e) {
    return null
  }
}

/** 时间范围内活跃过的「去重」用户数 */
async function uniqActive(col, from) {
  const r = await safe(
    col.aggregate()
      .unwind('$days')
      .match({ days: _.gte(from) })
      .group({ _id: '$_id' })
      .count('n')
      .end()
  )
  return (r && r.list && r.list[0] && r.list[0].n) || 0
}

exports.main = async (event) => {
  event = event || {}

  if (!ADMIN_TOKEN || ADMIN_TOKEN.indexOf('CHANGE_ME') >= 0) {
    return { ok: false, reason: '还没设置管理口令：请在云函数 adminStats 的环境变量里配置 ADMIN_TOKEN 并重新部署' }
  }
  if (String(event.token || '') !== ADMIN_TOKEN) {
    return { ok: false, reason: '口令不正确' }
  }

  const col = db.collection(COLLECTION)
  const today = day()
  const d7 = day(-6)
  const d30 = day(-29)

  const totalRes = await safe(col.count())
  const newTodayRes = await safe(col.where({ firstSeen: today }).count())
  const new7Res = await safe(col.where({ firstSeen: _.gte(d7) }).count())
  const new30Res = await safe(col.where({ firstSeen: _.gte(d30) }).count())

  const activeToday = await uniqActive(col, today)
  const active7 = await uniqActive(col, d7)
  const active30 = await uniqActive(col, d30)

  /* 每日活跃：days 数组展开后按天分组，一个用户一天只出现一次 */
  const actRes = await safe(
    col.aggregate().unwind('$days').group({ _id: '$days', n: $.sum(1) }).end()
  )
  const actMap = {}
  ;((actRes && actRes.list) || []).forEach(function (x) { actMap[x._id] = x.n })

  /* 每日新增：按 firstSeen 分组 */
  const newRes = await safe(col.aggregate().group({ _id: '$firstSeen', n: $.sum(1) }).end())
  const newMap = {}
  let firstDay = ''
  ;((newRes && newRes.list) || []).forEach(function (x) {
    newMap[x._id] = x.n
    if (!firstDay || x._id < firstDay) firstDay = x._id
  })

  const series = []
  for (let i = SERIES_DAYS - 1; i >= 0; i--) {
    const d = day(-i)
    const nw = newMap[d] || 0
    const ac = actMap[d] || 0
    series.push({
      date: d,
      label: String(Number(d.slice(5, 7))) + '/' + String(Number(d.slice(8, 10))),
      dnum: Number(d.slice(8, 10)),
      newCount: nw,
      active: ac,
      returning: Math.max(0, ac - nw)
    })
  }

  /* 平台分布 */
  const pRes = await safe(col.aggregate().group({ _id: '$platform', n: $.sum(1) }).end())
  const platforms = ((pRes && pRes.list) || [])
    .map(function (x) { return { name: x._id || '未知', count: x.n } })
    .sort(function (a, b) { return b.count - a.count })
    .slice(0, 6)

  /* 人均打开天数 */
  const vRes = await safe(
    col.aggregate().group({ _id: null, avg: $.avg('$visits'), sum: $.sum('$visits') }).end()
  )
  const v0 = (vRes && vRes.list && vRes.list[0]) || {}
  const totalUsers = (totalRes && totalRes.total) || 0

  return {
    ok: true,
    generatedAt: Date.now(),
    total: totalUsers,
    newToday: (newTodayRes && newTodayRes.total) || 0,
    new7: (new7Res && new7Res.total) || 0,
    new30: (new30Res && new30Res.total) || 0,
    activeToday: activeToday,
    active7: active7,
    active30: active30,
    firstDay: firstDay,
    avgVisits: v0.avg ? Math.round(v0.avg * 10) / 10 : 0,
    totalVisits: v0.sum || 0,
    series: series,
    platforms: platforms
  }
}
