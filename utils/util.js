/**
 * 通用工具函数
 */

/** 补零 */
function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

/** Date -> 'YYYY-MM-DD' */
function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

/** 今天的日期字符串 */
function today() {
  return formatDate(new Date())
}

/** 在给定日期上加减天数 */
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 'YYYY-MM-DD' -> 周X */
function weekName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return WEEK_NAMES[d.getDay()]
}

/** '2026-10-05' -> '10月05日' */
function prettyDate(dateStr) {
  const p = dateStr.split('-')
  return Number(p[1]) + '月' + p[2] + '日'
}

/** 是否今天 */
function isToday(dateStr) {
  return dateStr === today()
}

/** 相对描述：今天 / 昨天 / 10月05日 */
function relativeDate(dateStr) {
  if (dateStr === today()) return '今天'
  if (dateStr === addDays(today(), -1)) return '昨天'
  if (dateStr === addDays(today(), -2)) return '前天'
  return prettyDate(dateStr)
}

/** 时间戳 -> HH:mm */
function formatTime(ts) {
  const d = new Date(ts)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

/** 本周一对应的日期 */
function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - (day - 1))
  return formatDate(d)
}

/** 本周区间（周一 ~ 周日） */
function weekRange(dateStr) {
  const s = startOfWeek(dateStr)
  return { start: s, end: addDays(s, 6) }
}

/** 当月第一天 */
function startOfMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-01'
}

/** 当月最后一天 */
function endOfMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(last)
}

/** 本月区间（1 号 ~ 月末） */
function monthRange(dateStr) {
  return { start: startOfMonth(dateStr), end: endOfMonth(dateStr) }
}

/** 距月末还有几天（当天就是月末时为 0） */
function daysToMonthEnd(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return last - d.getDate()
}

/** '2026-10-05' -> '2026年10月' */
function monthText(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
}

/** 区间文本：'10月06日 - 10月12日'（同月时右端省略月份） */
function prettyRange(startStr, endStr) {
  const a = String(startStr || '').split('-')
  const b = String(endStr || '').split('-')
  if (a.length < 3 || b.length < 3) return String(startStr || '')
  const aText = Number(a[1]) + '月' + a[2] + '日'
  const bText = a[1] === b[1] ? (Number(b[2]) + '日') : (Number(b[1]) + '月' + b[2] + '日')
  return aText + ' - ' + bText
}

/** 生成最近 n 天的日期数组（从早到晚） */
function lastDays(n, end) {
  const endStr = end || today()
  const arr = []
  for (let i = n - 1; i >= 0; i--) {
    arr.push(addDays(endStr, -i))
  }
  return arr
}

/** 千分位（只给整数部分加逗号） */
function comma(s) {
  return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 总重量显示：不到 1 吨按 kg（整数 + 千分位），满 1 吨换成吨并保留 3 位小数。
 *   34,344kg -> { text: '34.344', unit: '吨' }
 *   860kg    -> { text: '860',    unit: 'kg' }
 * 末尾多余的 0 会去掉（1,000kg -> '1 吨'、1,200kg -> '1.2 吨'），免得出现「1.000 吨」。
 */
function formatLoad(value) {
  const kg = Math.round(Number(value) || 0)
  if (Math.abs(kg) >= 1000) {
    let t = (kg / 1000).toFixed(3)
    if (t.indexOf('.') >= 0) t = t.replace(/0+$/, '').replace(/\.$/, '')
    const parts = t.split('.')
    return { text: comma(parts[0]) + (parts[1] ? '.' + parts[1] : ''), unit: '吨', ton: true }
  }
  return { text: comma(kg), unit: 'kg', ton: false }
}

module.exports = {
  pad,
  formatDate,
  today,
  addDays,
  weekName,
  prettyDate,
  isToday,
  relativeDate,
  formatTime,
  startOfWeek,
  weekRange,
  startOfMonth,
  endOfMonth,
  monthRange,
  daysToMonthEnd,
  monthText,
  prettyRange,
  lastDays,
  formatLoad
}
