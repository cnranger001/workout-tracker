const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')
const U = require('../../utils/util.js')

/* 次数滑杆范围；默认值用于从没选过的项目 */
const REPS_MIN = 1
const REPS_MAX = 100
const REPS_DEFAULT = 10

/* 次数拨轮：左右滑动，中间那格最大最黑，左右两侧依次变淡 */
const WHEEL_SLOT = 62           /* 每格宽度 rpx，和 index.wxss 的 .wheel-item 一致 */
const WHEEL_SIDE = 4            /* 中心左右各渲染几格（留余量，滑动时不用随时重建） */
const WHEEL_SIZE = WHEEL_SIDE * 2 + 1

function clampReps(v) {
  const n = Math.round(Number(v) || 0)
  if (n <= 0) return REPS_DEFAULT      /* 空值、0、负数都回落到默认 */
  if (n < REPS_MIN) return REPS_MIN
  if (n > REPS_MAX) return REPS_MAX
  return n
}

function pad2(v) {
  return v < 10 ? '0' + v : '' + v
}

/** 总重量保留最多 1 位小数，并加千分位 */
/* 重量统一取整到 kg，带千分位（顶部总重量、卡片单项共用） */
function formatKg(v) {
  return String(Math.round(Number(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/* 以 kg 为单位的数值：最多 1 位小数，去掉多余的 .0 */
function fmtNum(v) {
  return String(Math.round((Number(v) || 0) * 10) / 10)
}

/**
 * 负重纪录提示：这个项目历史最高负重是多少、当前输入离它还差多少 kg。
 * 纪录只在「记一组」时刷新，所以正在输入的更大重量会显示成「超出」，
 * 提醒用户点一下对号就能破纪录。
 */
function bestHint(best, weightValue) {
  const b = Math.round((Number(best) || 0) * 10) / 10
  if (b <= 0) return { best: 0, text: '暂无负重纪录', tone: 'none' }
  const cur = Math.round((parseFloat(weightValue) || 0) * 10) / 10
  const gap = Math.round((b - cur) * 10) / 10
  if (gap > 0) return { best: b, text: '纪录 ' + fmtNum(b) + 'kg · 还差 ' + fmtNum(gap) + 'kg', tone: 'behind' }
  if (gap === 0) return { best: b, text: '纪录 ' + fmtNum(b) + 'kg · 已追平', tone: 'match' }
  return { best: b, text: '纪录 ' + fmtNum(b) + 'kg · 超出 ' + fmtNum(-gap) + 'kg', tone: 'ahead' }
}

/** 单项当日训练量的历史排名提示 */
function loadRankHint(rank) {
  if (!rank) return ''
  if (rank.rank <= 1) return '历史第 1 · 已是最高'
  return '历史第 ' + rank.rank + ' · 还差 ' + formatKg(rank.gapKg) + 'kg 进第 ' + (rank.rank - 1)
}

/* 以 center 为中心生成一整条拨轮（自左向右递增）；超出 1~100 的格子留空 */
function buildWheel(center) {
  const list = []
  for (let i = 0; i < WHEEL_SIZE; i++) {
    const v = center + i - WHEEL_SIDE
    const inRange = v >= REPS_MIN && v <= REPS_MAX
    list.push({ id: i, t: inRange ? pad2(v) : '', lv: Math.abs(i - WHEEL_SIDE) })
  }
  return list
}

/* 记录成功时的撒花：位置、颜色、快慢都随机，一次性生成一整层纸屑 */
const CONFETTI_COLORS = ['#FFC53D', '#FF7A59', '#36CFC9', '#597EF7', '#F759AB', '#52C41A', '#FFD666']
function buildConfetti() {
  const out = []
  for (let i = 0; i < 28; i++) {
    const size = 8 + Math.round(Math.random() * 10)
    const round = i % 3 === 0
    out.push({
      id: i,
      style: 'left:' + (2 + Math.round(Math.random() * 94)) + '%;' +
        'width:' + size + 'rpx;height:' + (round ? size : Math.round(size * 1.6)) + 'rpx;' +
        'background:' + CONFETTI_COLORS[i % CONFETTI_COLORS.length] + ';' +
        'border-radius:' + (round ? '50%' : '2rpx') + ';' +
        'animation-name:cf-' + (i % 4) + ';' +
        'animation-duration:' + (900 + Math.round(Math.random() * 500)) + 'ms;' +
        'animation-delay:' + Math.round(Math.random() * 260) + 'ms;'
    })
  }
  return out
}

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    date: '',
    dateLabel: '',
    weekLabel: '',
    isToday: true,
    canNext: false,

    cards: [],       // 当前分组里未隐藏项目的卡片数据
    exerciseCount: 0,
    noExercises: false,
    emptyText: '',
    showAllBtn: false,

    /* 打卡首页的分组 tab：'all' = 全部，其余对应一个项目分组 */
    activeGroup: 'all',
    groupTabs: [],
    showGroupTabs: false,
    groupNote: false,

    dayTotal: 0,     // 当天总次数
    dayWeight: 0,    // 当天总重量（kg，估算）
    dayWeightText: '0',
    dayWeightUnit: 'kg',
    dayWeightTon: false,
    bodyWeight: 0,
    weightHint: '未设置体重，仅统计负重',
    setCount: 0,     // 当天组数
    hasRecord: false,
    /* 圆环里的容量排名：rank = { rank, days, kg, prevKg, gapKg }，无记录时为 null */
    rank: null,
    rankTip: '',

    // 自定义输入弹窗
    showModal: false,
    modalType: '',
    modalName: '',
    modalIcon: '',
    modalColor: '',
    inputReps: '',
    inputWeight: '',
    modalBestHint: '',   // 弹窗里的负重纪录提示
    modalBest: 0,

    confetti: []         // 记录成功时的撒花纸屑，动画结束清空
  },

  onLoad() {
    const info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null
    this._winW = (info && info.windowWidth) || 375
    this.setData({ date: U.today() })
  },

  onShow() {
    T.bindPage(this)
    // 每次进入首页（含切 tab 回来）都按最新打卡时间重排一次
    this._orderKeys = null
    this._latestKey = ''
    this.refresh()
  },

  onHide() {
    if (this._confettiTimer) clearTimeout(this._confettiTimer)
    this._confettiTimer = null
    this.setData({ confetti: [] })
  },

  onUnload() {
    if (this._confettiTimer) clearTimeout(this._confettiTimer)
  },

  onPullDownRefresh() {
    // 下拉刷新也是明确的「重新排序」动作
    this._orderKeys = null
    this._latestKey = ''
    this.refresh()
    wx.stopPullDownRefresh()
  },

  /* ---------------------- 日期切换 ---------------------- */

  prevDay() {
    this.setData({ date: U.addDays(this.data.date, -1) }, () => this.refresh())
  },

  nextDay() {
    if (!this.data.canNext) return
    this.setData({ date: U.addDays(this.data.date, 1) }, () => this.refresh())
  },

  backToday() {
    this.setData({ date: U.today() }, () => this.refresh())
  },

  /* ---------------------- 项目分组 tab ---------------------- */

  onGroupTab(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeGroup) return
    S.setActiveGroup(id)
    /* 卡片集合变了，按最后一次打卡时间的排序要重算；输入值仍按项目 key 保留 */
    this._orderKeys = null
    this.refresh()
  },

  showAllGroups() {
    S.setActiveGroup('all')
    this._orderKeys = null
    this.refresh()
  },

  /* ---------------------- 数据刷新 ---------------------- */

  refresh() {
    const date = this.data.date
    const sets = S.getDay(date)
    /* 当前分组：只有该项目分组 tab 被选中时才过滤，'all' 显示全部项目 */
    const activeGroup = S.getActiveGroup()
    const groups = S.getGroups()
    const allExercises = S.getExercises()
    const groupCount = {}
    allExercises.forEach(function (e) { groupCount[e.groupId] = (groupCount[e.groupId] || 0) + 1 })
    const groupTabs = [{ id: 'all', name: '全部', count: allExercises.length, active: activeGroup === 'all' }]
      .concat(groups.map(function (g) {
        return { id: g.id, name: g.name, count: groupCount[g.id] || 0, active: activeGroup === g.id }
      }))
    const list = S.getCheckinExercises(activeGroup === 'all' ? '' : activeGroup)
    /* 自重折算要用体重，先取出来，卡片行和顶部总重量共用 */
    const bodyWeight = S.getProfile().weight

    /*
     * 按「最后一次打卡时间」倒序：最新打卡的排第一，次新的排第二，以此类推。
     * 顺序只在进入首页时算一次并锁定 —— 打卡过程中若实时重排，刚点的那张卡会
     * 向上跳走，而手指还停在原位，下一次连点就会记到别的项目上。
     */
    if (!this._orderKeys) {
      this._orderKeys = S.orderByLastUsed(list).map(function (e) { return e.key })
      this._latestKey = S.lastUsedKey()
    }
    const orderMap = {}
    this._orderKeys.forEach(function (k, i) { orderMap[k] = i })
    const ordered = list.slice().sort(function (a, b) {
      const ia = orderMap[a.key]
      const ib = orderMap[b.key]
      if (ia === undefined && ib === undefined) return 0
      if (ia === undefined) return 1
      if (ib === undefined) return -1
      return ia - ib
    })
    const lastKey = this._latestKey
    const lastReps = S.getAllLastReps()
    const lastWeights = S.getLastWeightMap()
    const bestMap = S.getAllBestWeights()
    const expandedMap = this._expanded || {}
    const weightMap = this._weights || {}

    const self = this
    const cards = ordered.map(function (ex) {
      const own = sets.filter(function (s) { return s.type === ex.key })
      const done = own.reduce(function (a, s) { return a + s.reps }, 0)
      /* 该项目当天训练量：(负重 + 体重×自重比例) × 次数，逐组累加后四舍五入 */
      const load = Math.round(own.reduce(function (a, s) {
        return a + S.estimateSetLoad(s, ex, bodyWeight)
      }, 0))
      const reps = clampReps(lastReps[ex.key] || REPS_DEFAULT)
      /* 负重：本次已经输入过就用输入的（含主动清空的空串），否则用上次记住的值 */
      const weight = weightMap[ex.key] !== undefined
        ? weightMap[ex.key]
        : (lastWeights[ex.key] > 0 ? String(lastWeights[ex.key]) : '')
      /* 负重旁标出这个项目的历史最高负重，以及当前输入离它还差多少 kg */
      const bh = bestHint(bestMap[ex.key], weight)
      /* 训练量旁标出这个项目当日总量在历史里排第几、离前一名还差多少 */
      const lr = S.exerciseLoadRank(date, ex.key)
      return {
        key: ex.key,
        isLatest: ex.key === lastKey,
        reps: reps,
        weight: weight,
        best: bh.best,
        bestHint: bh.text,
        gapTone: bh.tone,
        wheelItems: buildWheel(reps),
        wheelStyle: self._wheelStyle(),
        expanded: !!expandedMap[ex.key],
        name: ex.name,
        /* 训练部位（和「项目 → 推荐项目」同一套描述文案）；没填过描述就按图标兜底
           老的占位文案「自定义项目」不算部位，一并走兜底 */
        desc: (ex.desc && ex.desc !== '自定义项目') ? ex.desc : S.muscleOf(ex.iconKey),
        icon: ex.icon,
        iconPath: ex.iconPath,
        color: ex.color,
        soft: ex.soft,
        done: done,
        load: load,
        loadText: formatKg(load),
        loadRank: lr,
        loadRankText: loadRankHint(lr),
        setList: own.slice().reverse().map(function (s, i) {
          return {
            id: s.id,
            index: own.length - i,
            reps: s.reps,
            weight: s.weight,
            time: U.formatTime(s.ts)
          }
        })
      }
    })

    const dayTotal = sets.reduce(function (a, s) { return a + s.reps }, 0)
    const dayWeight = S.totalWeightOfDay(date)
    /* 满 1 吨换成吨，34,344kg 显示为 34.344 吨 */
    const dayLoad = U.formatLoad(dayWeight)

    /* 圆环里放容量排名：当日吨位在历史所有打卡日里排第几，以及追上一名还差多少 */
    const rank = S.dayLoadRank(date)
    let rankTip = ''
    if (rank) {
      rankTip = rank.rank === 1
        ? '历史第 1 · 已是最高'
        : '历史第 ' + rank.rank + ' · 再做 ' + formatKg(rank.gapKg) + ' kg 进第 ' + (rank.rank - 1)
    }

    this.setData({
      dateLabel: U.prettyDate(date) + ' ' + U.weekName(date),
      isToday: U.isToday(date),
      canNext: date < U.today(),
      cards: cards,
      exerciseCount: list.length,
      noExercises: list.length === 0,
      emptyText: activeGroup !== 'all'
        ? '这个分组还没有项目\n去「项目」页把项目分到这个组，或先看全部'
        : '还没有项目\n去「项目」页新增或添加推荐项目',
      showAllBtn: activeGroup !== 'all' && list.length === 0,
      activeGroup: activeGroup,
      groupTabs: groupTabs,
      showGroupTabs: groups.length >= 2,
      groupNote: activeGroup !== 'all',
      dayTotal: dayTotal,
      dayWeight: dayWeight,
      dayWeightText: dayLoad.text,
      dayWeightUnit: dayLoad.unit,
      dayWeightTon: dayLoad.ton,
      bodyWeight: bodyWeight,
      weightHint: bodyWeight > 0 ? ('按体重 ' + bodyWeight + 'kg 估算') : '未设置体重，仅统计负重',
      setCount: sets.length,
      hasRecord: sets.length > 0,
      rank: rank,
      rankTip: rankTip
    })
  },

  /* ---------------------- 次数拨轮：左右滑动 ---------------------- */

  /* rpx → px：滑动距离是 px，格子宽度写的是 rpx */
  _slotPx() {
    if (!this._winW) this._winW = 375
    return WHEEL_SLOT * this._winW / 750
  },

  /*
   * 整条拨轮的水平位移：让第 WHEEL_SIDE 格（中心格）正对容器中线。
   * extraPx 是半格以内的拖拽余量，松手后归零，看起来就是「咔哒」吸附。
   */
  _wheelStyle(extraPx, animate) {
    const x = -(WHEEL_SIDE + 0.5) * this._slotPx() + (extraPx || 0)
    return 'transform: translateX(' + x.toFixed(2) + 'px);' +
      'transition: transform ' + (animate ? '0.2s cubic-bezier(0.2, 0.8, 0.3, 1)' : '0s') + ';'
  },

  /* 按住：记下起点，之后按水平位移换算次数 */
  onWheelStart(e) {
    const type = e.currentTarget.dataset.type
    const card = this._findCard(type)
    if (!card) return
    const touch = e.touches && e.touches[0]
    this._wheel = {
      type: type,
      x0: touch ? touch.clientX : 0,
      v0: card.reps,
      v: card.reps
    }
    wx.vibrateShort({ type: 'light', fail() {} })
  },

  /*
   * 滑动：趋势值 = 起点次数 - 水平位移 / 格宽（往左拖，右边更大的数字转到中间）。
   * 中心格随最近整数切换，半格以内只挪位置不重建数据。
   */
  onWheelMove(e) {
    const w = this._wheel
    if (!w) return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const i = this._cardIndex(w.type)
    if (i < 0) return

    const slot = this._slotPx()
    let pos = w.v0 - (touch.clientX - w.x0) / slot
    if (pos < REPS_MIN) pos = REPS_MIN
    if (pos > REPS_MAX) pos = REPS_MAX

    const base = clampReps(Math.round(pos))
    const patch = {}
    patch['cards[' + i + '].wheelStyle'] = this._wheelStyle((base - pos) * slot)
    if (base !== w.v) {
      w.v = base
      patch['cards[' + i + '].reps'] = base
      patch['cards[' + i + '].wheelItems'] = buildWheel(base)
    }
    this.setData(patch)
  },

  /* 松手 / 被打断：吸附回中，并记住这个项目最后选的次数 */
  onWheelEnd() {
    const w = this._wheel
    if (!w) return
    this._wheel = null
    const i = this._cardIndex(w.type)
    if (i >= 0) {
      const patch = {}
      patch['cards[' + i + '].wheelStyle'] = this._wheelStyle(0, true)
      this.setData(patch)
    }
    S.setLastReps(w.type, w.v)
  },

  _cardIndex(type) {
    const cards = this.data.cards
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].key === type) return i
    }
    return -1
  },

  _findCard(type) {
    const i = this._cardIndex(type)
    return i < 0 ? null : this.data.cards[i]
  },

  /* 每个项目独立填写负重；刷新卡片和连续打卡时都保留输入值，并记到本地下次打开还在 */
  onCardWeightInput(e) {
    const type = e.currentTarget.dataset.type
    const i = this._cardIndex(type)
    if (i < 0) return
    const value = e.detail.value
    if (!this._weights) this._weights = {}
    this._weights[type] = value
    S.setLastWeight(type, value)
    /* 一边输入一边刷新「离纪录还差多少公斤」，不用等记完一组 */
    const bh = bestHint(S.getBestWeight(type), value)
    const patch = {}
    patch['cards[' + i + '].weight'] = value
    patch['cards[' + i + '].bestHint'] = bh.text
    patch['cards[' + i + '].gapTone'] = bh.tone
    this.setData(patch)
  },

  /* 记录成功：撒一层纸屑，1.6 秒后清掉；连续打卡会重新播 */
  celebrate() {
    const self = this
    if (this._confettiTimer) clearTimeout(this._confettiTimer)
    this.setData({ confetti: [] }, function () {
      self.setData({ confetti: buildConfetti() })
    })
    this._confettiTimer = setTimeout(function () {
      self.setData({ confetti: [] })
    }, 1600)
  },

  /* 记录一组 */
  logSet(e) {
    const type = e.currentTarget.dataset.type
    const card = this.data.cards.filter(function (c) { return c.key === type })[0]
    if (!card) return
    const reps = clampReps(card.reps)
    const weight = parseFloat(card.weight) || 0
    if (weight < 0) {
      wx.showToast({ title: '负重不能小于 0', icon: 'none' })
      return
    }

    S.addSet(this.data.date, type, reps, weight)
    S.setLastReps(type, reps)
    S.setLastWeight(type, weight)
    this.refresh()
    wx.vibrateShort({ type: 'light', fail() {} })
    this.celebrate()
  },

  /* ---------------------- 展开 / 收起组明细 ---------------------- */

  toggleSets(e) {
    const type = e.currentTarget.dataset.type
    if (!this._expanded) this._expanded = {}
    const next = !this._expanded[type]
    this._expanded[type] = next

    const cards = this.data.cards
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].key !== type) continue
      const patch = {}
      patch['cards[' + i + '].expanded'] = next
      this.setData(patch)
      return
    }
  },

  /* ---------------------- 自定义输入 ---------------------- */

  openModal(e) {
    const type = e.currentTarget.dataset.type
    const ex = S.getExerciseMap()[type] || { name: '该项目' }
    const card = this.data.cards.filter(function (c) { return c.key === type })[0]
    const inputWeight = card ? (card.weight || '') : ''
    this.setData({
      showModal: true,
      modalType: type,
      modalName: ex.name,
      modalIcon: ex.icon,
      modalIconPath: ex.iconPath || '',
      modalColor: ex.color,
      inputReps: card ? String(card.reps) : '',
      inputWeight: inputWeight,
      modalBest: S.getBestWeight(type),
      modalBestHint: bestHint(S.getBestWeight(type), inputWeight).text
    })
  },

  closeModal() {
    this.setData({ showModal: false })
  },

  noop() {},

  onRepsInput(e) {
    this.setData({ inputReps: e.detail.value })
  },

  onWeightInput(e) {
    this.setData({
      inputWeight: e.detail.value,
      modalBestHint: bestHint(this.data.modalBest, e.detail.value).text
    })
  },

  confirmModal() {
    const reps = parseInt(this.data.inputReps, 10)
    if (!reps || reps <= 0) {
      wx.showToast({ title: '请输入次数', icon: 'none' })
      return
    }
    if (reps > 2000) {
      wx.showToast({ title: '次数太大啦', icon: 'none' })
      return
    }
    const weight = parseFloat(this.data.inputWeight) || 0
    if (weight < 0) {
      wx.showToast({ title: '负重不能小于 0', icon: 'none' })
      return
    }
    if (!this._weights) this._weights = {}
    this._weights[this.data.modalType] = weight > 0 ? String(weight) : ''
    /* 弹窗里填的次数/负重同样记成「上次的值」，拨轮和负重框下次直接用 */
    S.setLastReps(this.data.modalType, reps)
    S.setLastWeight(this.data.modalType, weight)
    S.addSet(this.data.date, this.data.modalType, reps, weight)
    this.setData({ showModal: false })
    this.refresh()
    this.celebrate()
  },

  /* ---------------------- 删除某组 ---------------------- */

  deleteSet(e) {
    const id = e.currentTarget.dataset.id
    const self = this
    wx.showModal({
      title: '删除这一组',
      content: '删除后无法恢复',
      confirmColor: '#E5484D',
      success(res) {
        if (res.confirm) {
          S.removeSet(self.data.date, id)
          self.refresh()
        }
      }
    })
  },

  /* ---------------------- 分享 ---------------------- */

  goShare() {
    wx.navigateTo({ url: '/pages/share/share?date=' + this.data.date })
  },

  goBackup() {
    wx.navigateTo({ url: '/pages/backup/backup' })
  },

  goExercise() {
    wx.switchTab({ url: '/pages/exercise/exercise' })
  }
})
