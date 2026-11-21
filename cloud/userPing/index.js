const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const COLLECTION = 'users'

/* 加盐哈希：库里不保存 openid 原文，只存不可逆短 ID，仅用于去重计数 */
const SALT = 'workout-tracker-2026'
const MAX_DAYS = 366

/* 云函数时区是 UTC，按东八区算「今天」 */
function day(offset) {
  const t = Date.now() + (offset || 0) * 86400000 + 8 * 3600000
  return new Date(t).toISOString().slice(0, 10)
}

exports.main = async (event) => {
  event = event || {}
  const ctx = cloud.getWXContext()
  const openid = ctx && ctx.OPENID
  if (!openid) return { ok: false, reason: 'no openid' }

  const uid = crypto.createHash('sha256').update(SALT + openid).digest('hex').slice(0, 24)
  const today = day()
  const platform = String(event.platform || '').slice(0, 24)

  try {
    const col = db.collection(COLLECTION)

    let doc = null
    try {
      const r = await col.doc(uid).get()
      doc = r && r.data
    } catch (e) {
      doc = null
    }

    if (!doc) {
      await col.add({
        data: {
          _id: uid,
          firstSeen: today,
          lastSeen: today,
          days: [today],
          visits: 1,
          platform: platform
        }
      })
      return { ok: true, isNew: true }
    }

    const days = Array.isArray(doc.days) ? doc.days.slice() : []
    if (days.indexOf(today) < 0) {
      days.push(today)
      if (days.length > MAX_DAYS) days.splice(0, days.length - MAX_DAYS)
    }

    const patch = { lastSeen: today, days: days, visits: _.inc(1) }
    if (platform) patch.platform = platform
    await col.doc(uid).update({ data: patch })

    return { ok: true, isNew: false }
  } catch (e) {
    return { ok: false, reason: (e && e.message) || 'db error' }
  }
}
