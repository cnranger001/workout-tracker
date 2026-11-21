const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')
const U = require('../../utils/util.js')

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    summary: {
      days: 0,
      streak: 0,
      /* 容量口径（kg/吨）：text + unit 由 U.formatLoad 决定按 kg 还是吨显示 */
      totalLoad: { text: '0', unit: 'kg' },
      weekLoad: { text: '0', unit: 'kg' },
      avgLoad: { text: '0', unit: 'kg' }
    },
    byType: [],
    loadTotal: null,
    /* 吨位走势：gran 决定按日/周/月聚合，默认日K */
    gran: 'day',
    loadSeries: [],
    loadSum: null,
    loadRangeText: '近 30 天',
    maxLoad: 1,
    loadAxisUnit: '吨',
    bestLoad: null,
    bestSets: [],
    empty: true
  },

  onShow() {
    T.bindPage(this)
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  refresh() {
    const totals = S.totalByType()
    const loads = S.totalWeightByType()
    const days = S.totalDays()

    let totalLoad = 0
    const byType = S.getExercises().map(function (ex) {
      const kg = loads[ex.key] || 0
      const fmt = U.formatLoad(kg)
      totalLoad += kg
      return {
        key: ex.key,
        name: ex.name,
        icon: ex.icon,
        iconPath: ex.iconPath,
        color: ex.color,
        soft: ex.soft,
        total: totals[ex.key] || 0,
        best: (S.bestSetOf(ex.key) || {}).reps || 0,
        load: kg,
        loadText: fmt.text,
        loadUnit: fmt.unit
      }
    })
    const maxType = Math.max.apply(null, byType.map(function (b) { return b.total }).concat([1]))
    byType.forEach(function (b) {
      b.pct = Math.round((b.total / maxType) * 100)
    })

    const total = S.totalReps()

    /* 顶部容量格：吨位一律四舍五入到整数（2.05 吨 → 2 吨），kg 本来就是整数 */
    const fl = function (kg) {
      const n = Number(kg) || 0
      const f = U.formatLoad(n)
      if (f.unit === '吨') return { text: String(Math.round(n / 1000)), unit: '吨' }
      return { text: f.text, unit: f.unit }
    }
    const totalLoadKg = S.totalWeight()
    const weekLoadKg = S.weekWeight()
    const avgLoadKg = days > 0 ? Math.round(totalLoadKg / days) : 0

    const bestLoadDay = S.bestLoadDay()
    let bestLoadView = null
    if (bestLoadDay) {
      const fb = fl(bestLoadDay.kg)
      bestLoadView = { date: bestLoadDay.date, text: fb.text, unit: fb.unit }
    }

    const load = this.buildLoad(this.data.gran)

    /* 全部历史累计吨数：标题旁一行小字，同时也是各项目吨数之和 */
    const loadTotal = U.formatLoad(Math.round(totalLoad))
    loadTotal.kg = Math.round(totalLoad)

    this.setData({
      summary: {
        days: days,
        streak: S.streakDays(),
        totalLoad: fl(totalLoadKg),
        weekLoad: fl(weekLoadKg),
        avgLoad: fl(avgLoadKg)
      },
      byType: byType,
      loadTotal: loadTotal,
      bestLoad: bestLoadView,
      loadSeries: load.series,
      loadSum: load.sum,
      loadRangeText: load.rangeText,
      maxLoad: load.max,
      /* 轴单位跟着量级走：满 1 吨按吨显示，否则按 kg，免得刻度全是 0.0 */
      loadAxisUnit: load.unit,
      empty: total === 0
    }, () => {
      if (total > 0) {
        this.drawLoad()
      }
    })
  },

  /**
   * 按粒度取 30 个桶的吨位序列，顺便算好峰值、合计、轴单位
   * 日K = 近 30 天，周K = 近 30 周，月K = 近 30 月
   */
  buildLoad(gran) {
    const g = gran === 'week' || gran === 'month' ? gran : 'day'
    const series = S.weightBuckets(g, 30)
    const max = Math.max.apply(null, series.map(function (s) { return s.kg }).concat([1]))
    const kg = series.reduce(function (a, s) { return a + s.kg }, 0)
    const sum = U.formatLoad(Math.round(kg))
    sum.kg = Math.round(kg)
    return {
      series: series,
      max: max,
      sum: sum,
      unit: max >= 1000 ? '吨' : 'kg',
      rangeText: g === 'week' ? '近 30 周' : (g === 'month' ? '近 30 个月' : '近 30 天')
    }
  },

  /* 切日K / 周K / 月K */
  pickGran(e) {
    const g = e.currentTarget.dataset.g || 'day'
    if (g === this.data.gran) return
    const load = this.buildLoad(g)
    this.setData({
      gran: g,
      loadSeries: load.series,
      loadSum: load.sum,
      maxLoad: load.max,
      loadAxisUnit: load.unit,
      loadRangeText: load.rangeText
    }, () => { this.drawLoad() })
  },

  /* ------------ canvas 公共 ------------ */
  getCanvas(id, cb) {
    const query = wx.createSelectorQuery().in(this)
    query.select('#' + id).fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      let dpr = 2
      try {
        dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2
      } catch (err) {
        dpr = 2
      }
      const w = res[0].width
      const h = res[0].height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)
      cb(ctx, w, h)
    })
  },

  /* ------------ 每日总吨位（近30天柱状时间序列） ------------ */

  drawLoad() {
    const data = this.data.loadSeries
    const max = this.data.maxLoad || 1
    const toTon = this.data.loadAxisUnit === '吨'
    const th = T.current()

    this.getCanvas('chartLoad', function (ctx, w, h) {
      const padL = 34
      const padR = 10
      /* 顶部留一行给峰值日期 */
      const padT = 26
      const padB = 20
      const plotW = w - padL - padR
      const plotH = h - padT - padB
      const n = data.length
      const slot = plotW / n
      const barW = Math.max(3, Math.min(9, slot * 0.6))

      /* 网格线 + Y 轴刻度（按吨或 kg，看量级） */
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const gridCount = 3
      for (let i = 0; i <= gridCount; i++) {
        const y = padT + (plotH / gridCount) * i
        ctx.strokeStyle = th.line
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(padL, y)
        ctx.lineTo(w - padR, y)
        ctx.stroke()
        const v = max * (1 - i / gridCount)
        ctx.fillStyle = th.arrow
        ctx.fillText(toTon ? (v / 1000).toFixed(1) : String(Math.round(v)), padL - 6, y)
      }

      /* 每天一根柱：最后一个桶（当前周期）加深，没训练的日子留空 */
      let peak = -1
      data.forEach(function (d, i) {
        if (d.kg > 0 && (peak < 0 || d.kg > data[peak].kg)) peak = i
        if (!d.kg) return
        const cx = padL + slot * i + slot / 2
        const bh = Math.max(2, (d.kg / max) * plotH)
        ctx.fillStyle = i === n - 1 ? th.brandDeep : th.brand
        ctx.fillRect(cx - barW / 2, padT + plotH - bh, barW, bh)
      })

      /* 峰值日期：标在最高的那根柱子上方，靠边时向内收 */
      if (peak >= 0) {
        const label = data[peak].label
        ctx.font = '10px sans-serif'
        ctx.fillStyle = th.brandDeep
        ctx.textBaseline = 'bottom'
        const cx = padL + slot * peak + slot / 2
        const half = ctx.measureText(label).width / 2
        const minX = padL + half
        const maxX = w - padR - half
        ctx.textAlign = 'center'
        ctx.fillText(label, Math.min(maxX, Math.max(minX, cx)), padT + plotH - (data[peak].kg / max) * plotH - 4)
      }

      /* 首尾日期 */
      ctx.font = '10px sans-serif'
      ctx.fillStyle = th.arrow
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillText(data[0].label, padL, padT + plotH + 4)
      ctx.textAlign = 'right'
      ctx.fillText(data[n - 1].label, w - padR, padT + plotH + 4)
    })
  },

  goToday() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goShare() {
    wx.navigateTo({ url: '/pages/share/share' })
  }
})
