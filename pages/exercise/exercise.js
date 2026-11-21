const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    list: [],
    count: 0,
    shownCount: 0,
    max: S.MAX_EXERCISES,
    bodyWeight: 0,

    /* 项目分组：打卡首页每个分组是一个 tab；这里负责增删改名排序 */
    groups: [],
    activeGroup: 'all',
    maxGroups: S.MAX_GROUPS,
    maxGroupName: S.MAX_GROUP_NAME,
    groupSheet: false,
    groupEditing: '',     // '' = 新建分组，否则是被编辑的分组 id
    groupInput: '',

    emojis: S.EMOJIS,
    palette: S.PALETTE,
    iconKeys: Object.keys(S.ICON_FILES),
    iconFiles: S.ICON_FILES,
    presets: S.getPresets(),

    sheet: false,
    editing: '',          // '' = 新增，否则是被编辑项目的 key
    defaultGoal: S.DEFAULT_CUSTOM_GOAL,
    goalHint: '',         // 目标输入框的提示语
    form: {
      name: '',
      emoji: '🏋️',
      iconKey: '',        // 专属图标令牌（'' = 用 emoji）
      color: '#E3A800',
      builtin: false,
      hidden: false,
      goal: '',           // 每日目标（次），空 = 不改
      bwPercent: 0,       // 自重比例，界面用百分数
      bwDefault: 0,       // 当前运动类型的推荐比例
      bwCustom: false,    // 是否已手动调节
      bwEach: 0,          // 当前体重下每次折算重量，仅用于提示
      groupId: ''         // 所属分组 id
    }
  },

  onShow() {
    T.bindPage(this)
    this.refresh()

    /* 历史脏数据（同名但混了看不见的字符）会在读取时自动合并，
       这里告诉用户一声，免得他以为是数据丢了 */
    const rep = S.takeMergeReport()
    if (rep.count > 0) {
      const who = rep.names.filter(function (n, i, arr) { return arr.indexOf(n) === i }).join('、')
      wx.showToast({ title: '已自动合并重复项目：' + who, icon: 'none', duration: 2600 })
    }
  },

  refresh() {
    const all = S.getAllExercises()
    /* 顺手把每个项目的历史最高负重带出来，列表里显示「负重纪录」 */
    const best = S.getAllBestWeights()
    all.forEach(function (e) {
      const b = Math.round((Number(best[e.key]) || 0) * 10) / 10
      e.best = b
      e.bestText = String(b)
    })

    /* 项目页与打卡首页共用同一个「当前分组」，切换后两边一致 */
    const activeGroup = S.getActiveGroup()
    const list = activeGroup === 'all'
      ? all
      : all.filter(function (e) { return e.groupId === activeGroup })
    const groups = S.getGroups()
    groups.forEach(function (g) { g.active = g.id === activeGroup })

    this.setData({
      list: list,
      count: all.length,
      shownCount: list.length,
      groups: groups,
      activeGroup: activeGroup,
      presets: S.getPresets(),
      bodyWeight: S.getProfile().weight
    })
  },

  /* ---------------------- 项目分组 ---------------------- */

  onFilterGroup(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeGroup) return
    S.setActiveGroup(id)
    this.refresh()
  },

  openGroupAdd() {
    if (this.data.groups.length >= this.data.maxGroups) {
      wx.showToast({ title: '最多 ' + this.data.maxGroups + ' 个分组', icon: 'none' })
      return
    }
    this.setData({ groupSheet: true, groupEditing: '', groupInput: '' })
  },

  openGroupEdit(e) {
    const id = e.currentTarget.dataset.id
    const g = this.data.groups.filter(function (x) { return x.id === id })[0]
    if (!g) return
    this.setData({ groupSheet: true, groupEditing: id, groupInput: g.name })
  },

  closeGroupSheet() {
    this.setData({ groupSheet: false })
  },

  onGroupInput(e) {
    this.setData({ groupInput: e.detail.value })
  },

  saveGroup() {
    const r = this.data.groupEditing
      ? S.renameGroup(this.data.groupEditing, this.data.groupInput)
      : S.addGroup(this.data.groupInput)
    if (!r.ok) {
      wx.showToast({ title: r.reason, icon: 'none' })
      return
    }
    this.setData({ groupSheet: false })
    this.refresh()
    wx.showToast({ title: this.data.groupEditing ? '已保存' : '已新建', icon: 'success' })
  },

  moveGroup(e) {
    const dir = Number(e.currentTarget.dataset.dir)
    const r = S.moveGroup(this.data.groupEditing, dir)
    if (!r.ok) {
      wx.showToast({ title: r.reason, icon: 'none' })
      return
    }
    this.refresh()
  },

  removeGroup() {
    const id = this.data.groupEditing
    const g = this.data.groups.filter(function (x) { return x.id === id })[0]
    const self = this
    wx.showModal({
      title: '删除分组「' + (g ? g.name : '') + '」',
      content: '组内项目会移回第一个分组，项目本身和打卡记录都不会删除。',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success(res) {
        if (!res.confirm) return
        const r = S.removeGroup(id)
        if (!r.ok) {
          wx.showToast({ title: r.reason, icon: 'none' })
          return
        }
        self.setData({ groupSheet: false })
        self.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  pickGroup(e) {
    this.setData({ 'form.groupId': e.currentTarget.dataset.id })
  },

  /** 新增项目默认放进当前选中的分组；如果正在看「全部」，就放第一个分组 */
  defaultGroupId() {
    if (this.data.activeGroup !== 'all') return this.data.activeGroup
    return this.data.groups.length ? this.data.groups[0].id : ''
  },

  /** 按项目名 / 图标推导推荐比例；手动调过之后不再自动覆盖 */
  syncDefaultRatio(name, iconKey) {
    if (this.data.form.bwCustom) return
    const ratio = S.defaultBodyweightRatio({
      key: this.data.editing,
      name: name,
      iconKey: iconKey || ''
    })
    const percent = Math.round(ratio * 100)
    this.setData({
      'form.bwDefault': percent,
      'form.bwPercent': percent,
      'form.bwEach': this.eachWeight(percent)
    })
  },

  eachWeight(percent) {
    return Math.round(this.data.bodyWeight * percent / 10) / 10
  },

  /* ---------------------- 新增 / 编辑 ---------------------- */

  openAdd() {
    if (this.data.count >= this.data.max) {
      wx.showToast({ title: '最多 ' + this.data.max + ' 个项目', icon: 'none' })
      return
    }
    const used = this.data.list.length
    const p = S.PALETTE[used % S.PALETTE.length]
    this.setData({
      sheet: true,
      editing: '',
      goalHint: '不填则默认 ' + S.DEFAULT_CUSTOM_GOAL + ' 次',
      form: {
        name: '', emoji: '🏋️', iconKey: '', color: p.color,
        builtin: false, hidden: false, goal: '',
        bwPercent: 0, bwDefault: 0, bwCustom: false, bwEach: 0,
        groupId: this.defaultGroupId()
      }
    })
  },

  openEdit(e) {
    const key = e.currentTarget.dataset.key
    const ex = this.data.list.filter(function (x) { return x.key === key })[0]
    if (!ex) return
    this.setData({
      sheet: true,
      editing: key,
      goalHint: '留空表示不修改',
      form: {
        name: ex.name,
        emoji: ex.emoji,
        iconKey: ex.iconKey,
        color: ex.color,
        builtin: ex.builtin,
        hidden: ex.hidden,
        goal: String(ex.goal),
        bwPercent: ex.bwPercent,
        bwDefault: ex.bwDefaultPercent,
        bwCustom: ex.bwCustom,
        bwEach: this.eachWeight(ex.bwPercent),
        groupId: ex.groupId
      }
    })
  },

  closeSheet() {
    this.setData({ sheet: false })
  },

  noop() {},

  onNameInput(e) {
    const name = e.detail.value
    this.setData({ 'form.name': name })
    this.syncDefaultRatio(name, this.data.form.iconKey)
  },

  onGoalInput(e) {
    this.setData({ 'form.goal': e.detail.value })
  },

  pickEmoji(e) {
    const emoji = e.currentTarget.dataset.v
    this.setData({ 'form.emoji': emoji, 'form.iconKey': '' })
    this.syncDefaultRatio(this.data.form.name, '')
  },

  pickIcon(e) {
    const iconKey = e.currentTarget.dataset.v
    this.setData({ 'form.iconKey': iconKey })
    this.syncDefaultRatio(this.data.form.name, iconKey)
  },

  onRatioChange(e) {
    let percent = Number(e.detail.value) || 0
    if (percent < 0) percent = 0
    if (percent > 100) percent = 100
    this.setData({
      'form.bwPercent': percent,
      'form.bwCustom': true,
      'form.bwEach': this.eachWeight(percent)
    })
  },

  resetRatio() {
    const percent = this.data.form.bwDefault
    this.setData({
      'form.bwPercent': percent,
      'form.bwCustom': false,
      'form.bwEach': this.eachWeight(percent)
    })
  },

  pickColor(e) {
    this.setData({ 'form.color': e.currentTarget.dataset.v })
  },

  save() {
    const f = this.data.form
    const name = String(f.name || '').trim()

    /* 每日目标：留空表示沿用原值（新增则用默认值） */
    const goalRaw = String(f.goal || '').trim()
    let goal = 0
    if (goalRaw) {
      goal = parseInt(goalRaw, 10)
      if (!goal || goal <= 0) {
        wx.showToast({ title: '每日目标请填正整数', icon: 'none' })
        return
      }
      if (goal > 2000) {
        wx.showToast({ title: '目标太大啦', icon: 'none' })
        return
      }
    }

    let key = this.data.editing
    const ratio = f.bwCustom ? (Number(f.bwPercent) / 100) : null
    if (this.data.editing) {
      const r = S.updateExercise(this.data.editing, {
        name: name, emoji: f.emoji, icon: f.iconKey, color: f.color,
        bwRatio: ratio, groupId: f.groupId
      })
      if (!r.ok) {
        wx.showToast({ title: r.reason, icon: 'none' })
        return
      }
      wx.showToast({ title: '已保存', icon: 'success' })
    } else {
      const r = S.addExercise(name, f.emoji, f.color, f.iconKey, f.groupId)
      if (!r.ok) {
        wx.showToast({ title: r.reason, icon: 'none' })
        return
      }
      key = r.key
      wx.showToast({ title: '已添加', icon: 'success' })
    }

    if (goal > 0 && key) S.setGoal(key, goal)
    if (!this.data.editing && key && f.bwCustom) {
      S.updateExercise(key, { bwRatio: ratio })
    }

    this.setData({ sheet: false })
    this.refresh()
  },

  /* ---------------------- 隐藏 / 删除 ---------------------- */

  toggleHidden() {
    const f = this.data.form
    S.setHidden(this.data.editing, !f.hidden)
    this.setData({ sheet: false })
    this.refresh()
    wx.showToast({ title: f.hidden ? '已显示' : '已隐藏', icon: 'none' })
  },

  remove() {
    const key = this.data.editing
    const ex = this.data.list.filter(function (x) { return x.key === key })[0]
    if (!ex) return
    const self = this

    wx.showModal({
      title: '删除「' + ex.name + '」',
      content: '会同时删除这个项目的全部历史记录（共 ' + S.totalByType()[key] + ' 次），删除后无法恢复。\n如果只是暂时不练，建议用「隐藏」。',
      confirmText: '删除',
      confirmColor: '#E5484D',
      success(res) {
        if (!res.confirm) return
        const r = S.removeExercise(key)
        if (!r.ok) {
          wx.showToast({ title: r.reason, icon: 'none' })
          return
        }
        self.setData({ sheet: false })
        self.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  /* ---------------------- 推荐项目 ---------------------- */

  addPreset(e) {
    const name = e.currentTarget.dataset.name
    const r = S.addPreset(name, this.defaultGroupId())
    if (!r.ok) {
      wx.showToast({ title: r.reason, icon: 'none' })
      return
    }
    this.refresh()
    wx.showToast({ title: '已添加 ' + name, icon: 'success' })
  },

  goToday() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
