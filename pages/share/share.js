const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')
const U = require('../../utils/util.js')
const C = require('../../utils/caption.js')

/* 海报画布宽度与基础高度（逻辑像素）；项目超过 4 个时向下自动增高 */
const W = 800
const H = 640
/* 右上角头像直径（上一版 64，本次放大一倍） */
const AVATAR = 128
/* 破纪录播报区高度：项目面板与底部统计整体下移这一段 */
const RECORD_H = 176
const CAPTION_H = RECORD_H

/* 基础版面最多容纳 4 行；更多项目不再合并，每行 56px 向下扩展 */
const POSTER_BASE_ROWS = 4
const POSTER_ROW_H = 56

/* 本地静态小程序码兜底路径：把后台下载的小程序码放到 images/wxacode.png 即可生效 */
const STATIC_CODE = '/images/wxacode.png'

/* ------------------------------ 分享日期 ------------------------------ */

/** 只接受真实存在的 YYYY-MM-DD；无效日期回退到今天 */
function normalizeDate(value) {
  const date = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return U.today()
  try {
    return U.formatDate(new Date(date + 'T00:00:00')) === date ? date : U.today()
  } catch (e) {
    return U.today()
  }
}

/* ------------------------------ 工具 ------------------------------ */

/** 千分位 */
function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 重量统一取整到 kg（和打卡页保持一致） */
function fmtWeight(n) {
  return fmt(Math.round(Number(n) || 0))
}

/** 按画布宽度截断文字，末尾补省略号 */
function fitText(ctx, text, maxWidth) {
  let t = String(text || '')
  if (ctx.measureText(t).width <= maxWidth) return t
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

/**
 * 按宽度折行（中文逐字断，最多 maxLines 行）
 * 俏皮话在配图左边只剩半张卡片宽，一行放不下要折两行；
 * 两行时按「宽度最接近」找折点，避免第二行只剩两三个字
 */
function wrapText(ctx, text, maxWidth, maxLines) {
  const t = String(text || '').trim()
  if (!t) return []
  if (ctx.measureText(t).width <= maxWidth) return [t]
  if (maxLines <= 1) return [fitText(ctx, t, maxWidth)]

  if (maxLines === 2) {
    let best = -1
    let bestScore = Infinity
    for (let k = 1; k < t.length; k++) {
      const head = t.slice(0, k)
      const w1 = ctx.measureText(head).width
      const w2 = ctx.measureText(t.slice(k)).width
      if (w1 > maxWidth || w2 > maxWidth) continue
      /* 断在标点后面读起来更顺，给一点额外加分 */
      const bonus = /[，、。！？；：]$/.test(head) ? 28 : 0
      const score = Math.abs(w1 - w2) - bonus
      if (score < bestScore) {
        bestScore = score
        best = k
      }
    }
    if (best > 0) return [t.slice(0, best), t.slice(best)]
  }

  /* 两行都放不下（或行数更多）时按宽度贪心折，最后一行截断 */
  const lines = []
  let buf = ''
  let i = 0
  for (; i < t.length; i++) {
    const ch = t.charAt(i)
    if (ctx.measureText(buf + ch).width <= maxWidth) {
      buf += ch
      continue
    }
    if (lines.length >= maxLines - 1) break   /* 已经是最后一行，剩下的整体收尾 */
    lines.push(buf)
    buf = ch
  }
  if (i >= t.length) {
    if (buf) lines.push(buf)
    return lines
  }
  lines.push(fitText(ctx, buf + t.slice(i), maxWidth))
  return lines
}

/** 总容量文案：满 1 吨换成吨，规则与打卡页同一套（utils/util.js formatLoad） */
function weightText(n) {
  return U.formatLoad(n).text
}

function weightUnit(n) {
  return U.formatLoad(n).unit
}

/** 负重公斤：最多一位小数，130 / 130.5 */
function kgText(v) {
  return String(Math.round((Number(v) || 0) * 10) / 10).replace(/\.0$/, '')
}

/** 原来俏皮话的位置改成破纪录播报：自重项目报次数，其他项目报负重 */
function recordBroadcast(date) {
  let breaks = []
  try {
    breaks = S.recordBreaksOfDay(date) || []
  } catch (e) {
    breaks = []
  }
  if (!breaks.length) return '今日没有打破记录的项目'
  return breaks.map(function (b) {
    if (b.kind === 'reps') return b.name + ' 次数新纪录 ' + kgText(b.reps) + '次'
    return b.name + ' 负重新纪录 ' + kgText(b.weight) + '公斤'
  }).join('，')
}

/** 场景值 1154 = 朋友圈「单页模式」 */
function isSinglePage() {
  try {
    const opt = wx.getEnterOptionsSync && wx.getEnterOptionsSync()
    return !!opt && opt.scene === 1154
  } catch (e) {
    return false
  }
}

/**
 * 当天每个项目的训练量（kg，估算，取整）
 * 和打卡卡片用的是同一套公式：(负重 + 体重 × 自重比例) × 次数
 */
function loadByType(date) {
  const map = S.getExerciseMap()
  const bodyWeight = S.getProfile().weight
  const out = {}
  S.getDay(date).forEach(function (set) {
    const kg = S.estimateSetLoad(set, map[set.type], bodyWeight)
    out[set.type] = (out[set.type] || 0) + kg
  })
  Object.keys(out).forEach(function (k) {
    out[k] = Math.round(out[k])
  })
  return out
}

/** 所选日期有记录的项目；0 次项目不进入分享卡或分享链接 */
function buildRows(totals, loads, sets) {
  loads = loads || {}
  sets = sets || {}
  return S.getExercises().map(function (ex) {
    const v = totals[ex.key] || 0
    const kg = loads[ex.key] || 0
    const gs = sets[ex.key] || 0
    return {
      key: ex.key,
      name: ex.name,
      color: ex.color,
      iconKey: ex.iconKey,
      iconPath: ex.iconPath,
      emoji: ex.emoji,
      muscle: ex.desc || S.muscleOf(ex.iconKey) || '',
      total: v,
      totalText: fmt(v),
      sets: gs,
      setsText: fmt(gs),
      load: kg,
      loadText: fmt(kg)
    }
  }).filter(function (r) { return r.total > 0 })
}

/** 分享卡只读取指定日期；打卡总天数和连续天数仍取全部历史 */
function snapshot(date) {
  const d = normalizeDate(date)
  const dayTotal = S.sumRange(d, d)
  const dayWeight = S.totalWeightOfDay(d)
  const groups = S.setCountInRange(d, d)

  const rows = buildRows(S.totalByTypeRange(d, d), loadByType(d), S.setCountByTypeRange(d, d))

  return {
    stat: {
      nick: S.getProfile().nickname,
      avatar: S.getProfile().avatar,
      date: d,
      dateText: U.prettyDate(d),
      week: U.weekName(d),

      /* 主数字改为总容量，次数退到右侧；两个参数共用这两段文案 */
      heroLabel: '当日总容量',
      subLabel: '当日总次数',
      heroNum: dayTotal,

      today: dayTotal,
      dayWeight: dayWeight,
      dayWeightText: weightText(dayWeight),
      dayWeightUnit: weightUnit(dayWeight),
      groups: groups,
      /* 原文案区改成破纪录播报 */
      caption: recordBroadcast(d),
      streak: S.streakDays(),
      days: S.totalDays()
    },
    rows: rows
  }
}

/**
 * 快照 + 项目明细 -> 分享链接 query
 * 单页模式读不到本地存储，项目名 / 配色 / 次数只能全靠 query 带过去
 */
function buildQuery(stat, rows) {
  const it = (rows || []).map(function (r) {
    return [
      r.key,
      encodeURIComponent(r.name),
      String(r.color).replace('#', ''),
      r.total,
      encodeURIComponent(r.iconKey || ''),
      encodeURIComponent(r.emoji || ''),
      r.load || 0,
      encodeURIComponent(r.muscle || ''),
      r.sets || 0
    ].join('~')
  }).join('!')

  return [
    'nk=' + encodeURIComponent(stat.nick || ''),
    'rc=' + encodeURIComponent(stat.caption || ''),
    'dt=' + stat.date,
    'td=' + stat.today,
    'tw=' + (stat.dayWeight || 0),
    'g=' + stat.groups,
    'sk=' + stat.streak,
    'dy=' + stat.days,
    'it=' + it
  ].join('&')
}

/** query -> 快照 + 项目明细 */
function parseQuery(o) {
  o = o || {}
  const n = function (k, d) {
    const v = parseInt(o[k], 10)
    return isNaN(v) ? d : v
  }
  const nf = function (k, d) {
    const v = parseFloat(o[k])
    return isNaN(v) ? d : v
  }
  const date = normalizeDate(o.dt)
  const today = n('td', 0)
  const dayWeight = nf('tw', 0)
  const days = n('dy', 0)
  const groups = n('g', 0)

  /* 日期文案只依赖 query，不读本地存储 —— 单页模式下没有存储可读 */
  let dateText = ''
  let week = ''
  try {
    dateText = U.prettyDate(date)
    week = U.weekName(date)
  } catch (e) {}

  const rows = []
  if (o.it) {
    String(o.it).split('!').forEach(function (seg) {
      const p = seg.split('~')
      if (p.length < 4) return
      let name = p[1] || p[0]
      try { name = decodeURIComponent(name) } catch (e) {}
      const hex = p[2] || ''
      let iconKey = p[4] || ''
      let emoji = p[5] || ''
      try { iconKey = decodeURIComponent(iconKey) } catch (e) {}
      try { emoji = decodeURIComponent(emoji) } catch (e) {}
      /* 老链接没有第 7、8、9 段，缺失时按 0 / 空处理 */
      const kg = parseInt(p[6], 10) || 0
      let muscle = p[7] || ''
      try { muscle = decodeURIComponent(muscle) } catch (e) {}
      const sets = parseInt(p[8], 10) || 0
      rows.push({
        key: p[0],
        name: name,
        color: /^[0-9A-Fa-f]{6}$/.test(hex) ? '#' + hex : '#FFFFFF',
        iconKey: iconKey,
        iconPath: S.ICON_FILES[iconKey] || '',
        emoji: emoji,
        muscle: muscle,
        total: parseInt(p[3], 10) || 0,
        totalText: fmt(parseInt(p[3], 10) || 0),
        sets: sets,
        setsText: fmt(sets),
        load: kg,
        loadText: fmt(kg)
      })
    })
  }

  let nick = ''
  if (o.nk) {
    try { nick = decodeURIComponent(o.nk) } catch (err) { nick = '' }
  }

  let caption = ''
  /* 新链接用 rc 带破纪录播报；老链接的 cp 是文案，兼容读取但不再生成 */
  if (o.rc || o.cp) {
    try { caption = decodeURIComponent(o.rc || o.cp) } catch (e) { caption = '' }
  }
  caption = C.clean(caption)
  if (C.hasEquivalent(caption)) caption = ''

  return {
    stat: {
      nick: nick,
      date: date,
      dateText: dateText,
      week: week,
      heroLabel: '当日总容量',
      subLabel: '当日总次数',
      heroNum: today,
      today: today,
      dayWeight: dayWeight,
      dayWeightText: weightText(dayWeight),
      dayWeightUnit: weightUnit(dayWeight),
      groups: groups,
      caption: caption,
      avatar: '',
      streak: n('sk', 0),
      days: days
    },
    rows: rows
  }
}

/** 圆角矩形（兼容不支持 roundRect 的旧版本） */
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * 海报版面：4 项以内沿用原来的 5:4 卡片；更多项目逐项展开，
 * 项目面板、底部统计卡、小程序码和页脚一起向下移动，绝不裁掉项目。
 */
function posterLayout(rowCount, withCaption) {
  const pad = withCaption ? CAPTION_H : 0
  const expanded = rowCount > POSTER_BASE_ROWS
  const panelY = 268 + pad
  const panelH = rowCount > 0 ? (expanded ? rowCount * POSTER_ROW_H : 168) : 0
  const bottomY = rowCount > 0 ? panelY + panelH + 16 : 452 + pad
  return {
    expanded: expanded,
    height: expanded ? bottomY + 188 : H + pad,
    captionY: 252,
    panelY: panelY,
    panelH: panelH,
    bottomY: bottomY
  }
}

/** 加载一张 canvas 图片；失败或超时返回 null，不阻塞整张海报 */
function loadCanvasImage(canvas, src) {
  return new Promise(function (resolve) {
    if (!src) {
      resolve(null)
      return
    }
    let img = null
    try {
      img = canvas.createImage()
    } catch (e) {
      resolve(null)
      return
    }
    if (!img) {
      resolve(null)
      return
    }

    let done = false
    const finish = function (value) {
      if (done) return
      done = true
      resolve(value)
    }
    img.onload = function () { finish(img) }
    img.onerror = function () { finish(null) }
    img.src = src
    setTimeout(function () { finish(null) }, 2500)
  })
}

/** 导出画布为临时图片，失败时用显式尺寸重试一次 */
function exportCanvas(canvas, dpr, height, cb) {
  wx.canvasToTempFilePath({
    canvas: canvas,
    success: function (res) { cb(res.tempFilePath) },
    fail: function () {
      wx.canvasToTempFilePath({
        canvas: canvas,
        x: 0,
        y: 0,
        width: W,
        height: height,
        destWidth: W * dpr,
        destHeight: height * dpr,
        success: function (r2) { cb(r2.tempFilePath) },
        fail: function () { cb('') }
      })
    }
  })
}

/* ------------------------------ 页面 ------------------------------ */

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    single: false,     // 是否朋友圈「单页模式」
    hasData: true,
    stat: {},
    rows: [],
    posterPath: '',
    posterError: false,
    posterStyle: 'height: 517rpx',
    today: '',

    codePath: '',      // 小程序码图片路径（云函数生成 或 本地静态码）
    codeHint: '未配置',
    hasCode: false
  },

  onLoad(options) {
    T.bindPage(this)
    options = options || {}
    const single = isSinglePage()
    const shared = !!options.dt
    const parsed = (single || shared) ? parseQuery(options) : snapshot(options.date)

    this.setData({
      single: single,
      today: U.today(),
      stat: parsed.stat,
      rows: parsed.rows,
      hasData: parsed.stat.today > 0
    }, () => {
      if (parsed.stat.today <= 0) return
      // 单页模式能力受限，不画 canvas，改用 WXML 渲染同一份内容
      if (single) return
      this.redraw()
    })

    if (!single) {
      // 开启「发送给朋友」+「分享到朋友圈」（该接口在单页模式下被禁用，必须排除）
      if (wx.showShareMenu) {
        wx.showShareMenu({
          withShareTicket: false,
          menus: ['shareAppMessage', 'shareTimeline']
        })
      }
    }
  },

  /* ---------------------- 日期切换 ---------------------- */

  /** 在分享页也可以改日期；卡片只使用新选日期的记录 */
  changeDate(e) {
    const date = e && e.detail ? e.detail.value : ''
    if (!date || date === this.data.stat.date) return

    const parsed = snapshot(date)
    this.setData({
      stat: parsed.stat,
      rows: parsed.rows,
      hasData: parsed.stat.today > 0,
      posterPath: '',
      posterError: false
    }, () => {
      if (parsed.stat.today <= 0) return
      this.redraw()
    })
  },

  /** 出图：小程序码只解析一次，之后换日期直接重画 */
  redraw() {
    if (this.data.codePath) {
      this.drawPoster()
      return
    }
    this.resolveCode(() => this.drawPoster())
  },

  /* ---------------------- 小程序码 ---------------------- */

  cloudReady() {
    try {
      const app = getApp()
      return !!(app && app.globalData && app.globalData.cloudReady)
    } catch (e) {
      return false
    }
  },

  /**
   * 取小程序码：优先云函数（可带参数）→ 本地静态码 → 没有就不画
   */
  resolveCode(cb) {
    const self = this

    const useStatic = function (hint) {
      self.setData({ codePath: STATIC_CODE, codeHint: hint }, cb)
    }

    if (!this.cloudReady() || !wx.cloud || !wx.cloud.callFunction) {
      useStatic('本地静态码')
      return
    }

    wx.cloud.callFunction({
      name: 'getWxacode',
      data: {
        scene: 'share',
        page: 'pages/index/index',
        width: 280
      },
      success(res) {
        const r = (res && res.result) || {}
        if (!r.ok || !r.base64) {
          useStatic('本地静态码（云函数未返回）')
          return
        }
        const fs = wx.getFileSystemManager && wx.getFileSystemManager()
        const dir = (wx.env && wx.env.USER_DATA_PATH) || ''
        if (!fs || !dir) {
          useStatic('本地静态码')
          return
        }
        const file = dir + '/wxacode.png'
        fs.writeFile({
          filePath: file,
          data: r.base64,
          encoding: 'base64',
          success() {
            self.setData({ codePath: file, codeHint: '云函数生成' }, cb)
          },
          fail() {
            useStatic('本地静态码（写入失败）')
          }
        })
      },
      fail() {
        useStatic('本地静态码（云函数不可用）')
      }
    })
  },

  /* ---------------------- 绘制海报 ---------------------- */

  drawPoster() {
    const self = this
    const rows = this.posterRows()
    const layout = posterLayout(rows.length, !!this.data.stat.caption)
    this._posterLayout = layout

    /* 预览区与导出画布保持同一比例；卡片内宽 646rpx，对应画布宽 800px */
    this.setData({ posterStyle: 'height: ' + Math.round(layout.height * 646 / W) + 'rpx' })

    const query = wx.createSelectorQuery().in(this)
    query.select('#poster').fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) {
        self.setData({ posterError: true })
        return
      }
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')

      let dpr = 2
      try {
        dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
      } catch (e) {
        dpr = 2
      }
      if (dpr > 3) dpr = 3

      canvas.width = W * dpr
      canvas.height = layout.height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, W, layout.height)

      let done = false
      const finish = function (media) {
        if (done) return
        done = true
        media = media || {}
        self.paint(ctx, media)
        exportCanvas(canvas, dpr, layout.height, function (path) {
          self.setData({
            posterPath: path,
            posterError: !path,
            hasCode: !!media.code
          })
        })
      }

      /* 小程序码 / 头像并行加载，哪一张失败都只是它自己不画 */
      Promise.all([
        loadCanvasImage(canvas, self.data.codePath),
        loadCanvasImage(canvas, self.data.stat.avatar)
      ]).then(function (imgs) {
        finish({ code: imgs[0] || null, avatar: imgs[1] || null })
      }).catch(function () { finish({}) })
    })
  },

  /** 海报项目行：有次数的项目全部列出，不再截断或合并「其他 N 项」 */
  posterRows() {
    return (this.data.rows || [])
      .filter(function (r) { return r.total > 0 })
      .slice()
      .sort(function (a, b) { return b.total - a.total })
  },

  /** 真正作画；media = { code, avatar }，都是可缺省的图片 */
  paint(ctx, media) {
    const s = this.data.stat
    const rows = this.posterRows()
    const layout = this._posterLayout || posterLayout(rows.length, !!s.caption)
    const height = layout.height
    media = media || {}
    const codeImg = media.code || null
    /* 海报配色跟随当前主题；白色面板里固定用面板墨色，酒红/紫这类深底也不糊 */
    const th = T.current()
    const dark = th.navFront === '#FFFFFF'
    const INK = th.brandInk
    const INK85 = T.rgba(th.brandInk, 0.85)
    const INK62 = T.rgba(th.brandInk, 0.62)
    const INK55 = T.rgba(th.brandInk, 0.55)
    const INK45 = T.rgba(th.brandInk, 0.45)
    const DECOR = T.rgba('#FFFFFF', dark ? 0.14 : 0.35)
    const PANELBG = T.rgba('#FFFFFF', dark ? 0.82 : 0.55)
    const PANEL = th.panelInk
    const PANEL62 = T.rgba(th.panelInk, 0.62)
    const PANEL55 = T.rgba(th.panelInk, 0.55)

    /* 背景 */
    const g = ctx.createLinearGradient(0, 0, W, height)
    g.addColorStop(0, th.brand2)
    g.addColorStop(1, th.brand)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, height)

    /* 装饰圆 */
    ctx.fillStyle = DECOR
    ctx.beginPath()
    ctx.arc(W - 30, 10, 130, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(30, height - 20, 150, 0, Math.PI * 2)
    ctx.fill()

    /* 顶部品牌 + 右上角头像 */
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillStyle = INK
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText('锻炼记录', 48, 40)

    const AV = AVATAR
    const avX = W - 48 - AV
    const avY = 30
    if (media.avatar) {
      /* 圆形裁切 + 白色描边，方头像直接贴上去会很生硬 */
      ctx.save()
      ctx.beginPath()
      ctx.arc(avX + AV / 2, avY + AV / 2, AV / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(media.avatar, avX, avY, AV, AV)
      ctx.restore()
      ctx.strokeStyle = T.rgba('#FFFFFF', 0.9)
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(avX + AV / 2, avY + AV / 2, AV / 2 - 2, 0, Math.PI * 2)
      ctx.stroke()
    }

    /* 日期：有头像时往左让位，没有就贴右边缘 */
    ctx.textAlign = 'right'
    ctx.fillStyle = INK62
    ctx.font = '24px sans-serif'
    ctx.fillText(
      s.week ? (s.dateText + ' ' + s.week) : s.dateText,
      media.avatar ? avX - 18 : W - 48,
      50
    )

    /* 昵称：跟在头像下方居中；没有头像时退回品牌标题下方（不占空白） */
    if (s.nick) {
      ctx.fillStyle = INK85
      ctx.font = 'bold 26px sans-serif'
      if (media.avatar) {
        ctx.textAlign = 'center'
        /* 宽度按头像直径收着，居中后左右不会出边 */
        ctx.fillText(fitText(ctx, s.nick, AV), avX + AV / 2, avY + AV + 10)
      } else {
        ctx.textAlign = 'left'
        ctx.fillText(fitText(ctx, s.nick, 300), 48, 82)
      }
    }

    /* 昵称可能改成居中绘制，后面主数字是左对齐的，这里必须复位 */
    ctx.textAlign = 'left'

    /* 主数字：当日总容量（放主位，次数退到右侧） */
    ctx.fillStyle = INK62
    ctx.font = '22px sans-serif'
    ctx.fillText(s.heroLabel, 48, 118)

    const weightStr = s.dayWeightText || fmtWeight(s.dayWeight)
    const weightUnit = s.dayWeightUnit || 'kg'
    /* 吨带三位小数、带千分位时会很长：按实际测量宽度一档档收字号，压不到右侧次数 */
    const UNIT_FONT = 30
    const LEFT_MAX = 344            /* 48 → 392，右列从 420 起，留 28px 间距 */
    ctx.font = UNIT_FONT + 'px sans-serif'
    const unitW = ctx.measureText(weightUnit).width
    let bigFont = 86
    ctx.font = 'bold ' + bigFont + 'px sans-serif'
    let weightW = ctx.measureText(weightStr).width
    while (bigFont > 46 && weightW + 14 + unitW > LEFT_MAX) {
      bigFont -= 4
      ctx.font = 'bold ' + bigFont + 'px sans-serif'
      weightW = ctx.measureText(weightStr).width
    }
    ctx.fillStyle = INK
    ctx.font = 'bold ' + bigFont + 'px sans-serif'
    ctx.fillText(weightStr, 48, 142)
    ctx.font = UNIT_FONT + 'px sans-serif'
    ctx.fillStyle = INK55
    ctx.fillText(weightUnit, 48 + weightW + 14, 142 + Math.round(bigFont * 0.54))

    /* 当日总次数 + 组数：右侧小一号，只作参考 */
    ctx.fillStyle = INK62
    ctx.font = '22px sans-serif'
    ctx.fillText(s.subLabel || '当日总次数', 420, 118)
    const repsStr = fmt(s.heroNum)
    ctx.fillStyle = INK
    ctx.font = 'bold 52px sans-serif'
    ctx.fillText(repsStr, 420, 148)
    const rw = ctx.measureText(repsStr).width
    ctx.font = '24px sans-serif'
    ctx.fillStyle = INK55
    ctx.fillText('次', 420 + rw + 10, 174)
    ctx.font = '22px sans-serif'
    ctx.fillText(s.groups + ' 组', 420, 208)

    /* 破纪录播报：最多三行，占满原来俏皮话的空间 */
    if (s.caption) {
      const cy0 = layout.captionY || 252
      ctx.textAlign = 'left'
      ctx.fillStyle = INK85
      ctx.font = '28px sans-serif'
      const lines = wrapText(ctx, s.caption, W - 96, 3)
      const lineH = 40
      const top = cy0 + Math.round((RECORD_H - lines.length * lineH) / 2) + 8
      lines.forEach(function (line, i) {
        ctx.fillText(line, 48, top + i * lineH)
      })
    }

    /* 项目面板：所有项目逐行绘制，每行带自己的专属图标 */
    if (rows.length > 0) {
      const px = 48
      const py = layout.panelY
      const pw = W - 96
      const ph = layout.panelH
      ctx.fillStyle = PANELBG
      rrect(ctx, px, py, pw, ph, 24)
      ctx.fill()

      const rowH = ph / rows.length
      ctx.textBaseline = 'middle'
      rows.forEach(function (r, i) {
        const cy = py + rowH * (i + 0.5)
        const lx = px + 24

        /* 先量出右侧数值列的宽度，左边项目名和肌群才知道能占多宽 */
        const kgStr = r.load > 0 ? (r.loadText + ' kg') : ''
        const smallStr = (r.sets > 0 ? r.setsText + ' 组 · ' : '') + r.totalText + ' 次'
        ctx.font = 'bold 28px sans-serif'
        const kgW = kgStr ? ctx.measureText(kgStr).width : 0
        ctx.font = kgStr ? '22px sans-serif' : 'bold 28px sans-serif'
        const smallW = ctx.measureText(smallStr).width
        const rightEdge = px + pw - 30
        const numLeft = rightEdge - (kgStr ? kgW + 18 + smallW : smallW)

        /* 左侧：项目名 + 目标肌群（灰色小字跟在名字后面） */
        ctx.textAlign = 'left'
        ctx.fillStyle = PANEL
        ctx.font = '26px sans-serif'
        ctx.fillText(r.name, lx, cy)
        const nameW = ctx.measureText(r.name).width
        if (r.muscle) {
          const mw = numLeft - 20 - (lx + nameW + 14)
          if (mw > 48) {
            ctx.fillStyle = PANEL55
            ctx.font = '19px sans-serif'
            ctx.fillText(fitText(ctx, r.muscle, mw), lx + nameW + 14, cy + 1)
          }
        }

        /* 右侧数值列：总重量加粗放最右，组数 + 次数退成灰字跟它左边 */
        ctx.textAlign = 'right'
        if (kgStr) {
          ctx.fillStyle = PANEL
          ctx.font = 'bold 28px sans-serif'
          ctx.fillText(kgStr, rightEdge, cy)
          ctx.fillStyle = PANEL62
          ctx.font = '22px sans-serif'
          ctx.fillText(smallStr, rightEdge - kgW - 18, cy)
        } else {
          /* 无负重的项目（自重）：没有 kg 可强调，组数 + 次数自己顶到最右并恢复加粗 */
          ctx.fillStyle = PANEL
          ctx.font = 'bold 28px sans-serif'
          ctx.fillText(smallStr, rightEdge, cy)
        }
      })
    }

    /* 底部两张小卡 */
    const by = layout.bottomY
    const bh = 100
    const bw = 250
    const boxes = [
      { label: '连续打卡', num: fmt(s.streak), unit: '天' },
      { label: '打卡总天数', num: fmt(s.days), unit: '天' }
    ]
    ctx.textBaseline = 'top'
    boxes.forEach(function (b, i) {
      const bx = 48 + i * (bw + 12)
      ctx.fillStyle = PANELBG
      rrect(ctx, bx, by, bw, bh, 20)
      ctx.fill()

      ctx.textAlign = 'left'
      ctx.fillStyle = PANEL55
      ctx.font = '20px sans-serif'
      ctx.fillText(b.label, bx + 26, by + 18)

      ctx.fillStyle = PANEL
      ctx.font = 'bold 40px sans-serif'
      ctx.fillText(b.num, bx + 26, by + 44)
      const nw = ctx.measureText(b.num).width
      ctx.font = '22px sans-serif'
      ctx.fillStyle = PANEL62
      ctx.fillText(b.unit, bx + 26 + nw + 8, by + 66)
    })

    /* 小程序码：白色圆角卡片 + 深色码 */
    if (codeImg) {
      const cx = 600
      const cy = by
      const cw = 152
      ctx.fillStyle = '#FFFFFF'
      rrect(ctx, cx, cy, cw, cw, 16)
      ctx.fill()
      ctx.drawImage(codeImg, cx + 8, cy + 8, cw - 16, cw - 16)
    }

    /* 页脚 */
    ctx.font = '20px sans-serif'
    ctx.fillStyle = INK45
    if (codeImg) {
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('扫码，开始记录你的每一次训练', 48, by + 126)
    } else {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('坚持就是胜利 · 锻炼记录', W / 2, by + 140)
    }
  },

  regenerate() {
    /* 重新生成时重算破纪录播报 */
    const parsed = snapshot(this.data.stat.date)
    this.setData({
      stat: parsed.stat,
      rows: parsed.rows,
      hasData: parsed.stat.today > 0,
      posterPath: '',
      posterError: false
    }, () => {
      if (parsed.stat.today <= 0) return
      this.redraw()
    })
    wx.showToast({ title: '已重新生成', icon: 'none' })
  },

  /* ---------------------- 保存到相册 ---------------------- */

  saveImage() {
    const self = this
    const p = this.data.posterPath
    if (!p) {
      wx.showToast({ title: '海报还在生成，稍等一下', icon: 'none' })
      return
    }

    const doSave = function () {
      wx.saveImageToPhotosAlbum({
        filePath: p,
        success() {
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail(err) {
          const msg = (err && err.errMsg) || ''
          if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0 || msg.indexOf('deny') >= 0) {
            wx.showModal({
              title: '需要相册权限',
              content: '保存图片需要「保存到相册」权限，请在设置里开启',
              confirmText: '去设置',
              confirmColor: T.current().brandText,
              success(m) {
                if (m.confirm && wx.openSetting) wx.openSetting({})
              }
            })
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      })
    }

    if (!wx.getSetting) {
      doSave()
      return
    }
    wx.getSetting({
      success(res) {
        const auth = res.authSetting || {}
        if (auth['scope.writePhotosAlbum'] === false) {
          wx.showModal({
            title: '需要相册权限',
            content: '之前拒绝了保存到相册，请在设置里开启',
            confirmText: '去设置',
            confirmColor: T.current().brandText,
            success(m) {
              if (m.confirm && wx.openSetting) wx.openSetting({})
            }
          })
        } else {
          doSave()
        }
      },
      fail() {
        doSave()
      }
    })
  },

  /* ---------------------- 分享 ---------------------- */

  shareTitle() {
    const s = this.data.stat
    const who = s.nick ? s.nick + ' ' : ''
    if (s.today > 0) {
      return who + s.dateText + '完成 ' + fmt(s.today) + ' 次，累计打卡 ' + s.days + ' 天'
    }
    return who + s.dateText + '还没有锻炼记录'
  },

  /** 构造好友分享卡片；有海报就把带小程序码的海报当封面 */
  friendShare() {
    const obj = {
      title: this.shareTitle(),
      path: '/pages/share/share?' + buildQuery(this.data.stat, this.data.rows)
    }
    if (this.data.posterPath) obj.imageUrl = this.data.posterPath
    return obj
  },

  /**
   * 发送给朋友
   * 海报是异步生成的，若进入分享时还没画好，用 promise 等它（官方支持 2.12.0+），
   * 保证好友收到的封面一定是带小程序码的那张海报。
   */
  onShareAppMessage() {
    const base = this.friendShare()
    if (base.imageUrl) return base

    const self = this
    const promise = new Promise(function (resolve) {
      let waited = 0
      const timer = setInterval(function () {
        if (self.data.posterPath || self.data.posterError) {
          clearInterval(timer)
          resolve(self.friendShare())
        } else if (waited >= 4000) {
          clearInterval(timer)
          resolve(self.friendShare())   // 超时就用无图卡片，不阻塞分享
        }
        waited += 200
      }, 200)
    })

    return {
      title: base.title,
      path: base.path,
      promise: promise
    }
  },

  /** 分享到朋友圈：只给 title + query + 图片，路径不可自定义 */
  onShareTimeline() {
    const obj = {
      title: this.shareTitle(),
      query: buildQuery(this.data.stat, this.data.rows)
    }
    if (this.data.posterPath) obj.imageUrl = this.data.posterPath
    return obj
  },

  /* ---------------------- 其它 ---------------------- */

  goToday() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
