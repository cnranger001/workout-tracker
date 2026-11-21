const U = require('./util.js')

const PING_KEY = 'analytics_ping_date'   // 上次上报成功的日期
const TOKEN_KEY = 'admin_token'          // 管理口令（本机保存）
const OFF_KEY = 'analytics_off'          // 上报开关

/* ------------------------------ 开关 ------------------------------ */

function isOff() {
  return !!wx.getStorageSync(OFF_KEY)
}

function setOff(v) {
  wx.setStorageSync(OFF_KEY, v ? 1 : 0)
}

/* ------------------------------ 环境 ------------------------------ */

function cloudReady() {
  try {
    const app = getApp()
    return !!(app && app.globalData && app.globalData.cloudReady)
  } catch (e) {
    return false
  }
}

/** 机型 + 系统版本，只用于分布统计 */
function platform() {
  try {
    const info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync()
    const p = String(info.platform || '')
    const sys = String(info.system || '').split(' ')[0]
    return (p + (sys ? ' ' + sys : '')).slice(0, 24)
  } catch (e) {
    return ''
  }
}

/* ------------------------------ 上报 ------------------------------ */

/**
 * 匿名上报一次「今天有人用过」
 * 每个自然日最多一次，失败静默忽略（不能因为统计影响正常使用）
 */
function ping() {
  if (isOff() || !cloudReady()) return
  if (!wx.cloud || !wx.cloud.callFunction) return

  const today = U.today()
  if (wx.getStorageSync(PING_KEY) === today) return

  wx.cloud.callFunction({
    name: 'userPing',
    data: { platform: platform() },
    success(res) {
      const r = (res && res.result) || {}
      if (r.ok) wx.setStorageSync(PING_KEY, today)
    },
    fail() {}
  })
}

/* ------------------------------ 管理口令 ------------------------------ */

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(t) {
  wx.setStorageSync(TOKEN_KEY, String(t || ''))
}

function clearToken() {
  wx.setStorageSync(TOKEN_KEY, '')
}

module.exports = {
  isOff: isOff,
  setOff: setOff,
  cloudReady: cloudReady,
  platform: platform,
  ping: ping,
  getToken: getToken,
  setToken: setToken,
  clearToken: clearToken
}
