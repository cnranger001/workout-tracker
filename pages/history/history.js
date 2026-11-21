const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')
const U = require('../../utils/util.js')

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    days: [],
    totalDays: 0,
    totalReps: 0,
    empty: true,
    expandDate: ''
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
    const dates = S.getAllDates()
    const days = dates.map(function (d) {
      const sets = S.getDay(d)
      // 用「全部项目」而不是「启用项目」，隐藏 / 删除前留下的记录也要能显示名字
      const items = S.getAllExercises().map(function (ex) {
        const reps = sets
          .filter(function (s) { return s.type === ex.key })
          .reduce(function (a, s) { return a + s.reps }, 0)
        return { key: ex.key, name: ex.name, icon: ex.icon, iconPath: ex.iconPath, color: ex.color, soft: ex.soft, reps: reps }
      }).filter(function (it) { return it.reps > 0 })

      const total = sets.reduce(function (a, s) { return a + s.reps }, 0)

      const setList = sets.slice().reverse().map(function (s, i) {
        const ex = S.getExerciseMap()[s.type] || { name: s.type, color: '#A69F8E', icon: '🏋️', iconPath: '' }
        return {
          id: s.id,
          index: sets.length - i,
          name: ex.name,
          icon: ex.icon,
          iconPath: ex.iconPath || '',
          color: ex.color,
          reps: s.reps,
          weight: s.weight,
          time: U.formatTime(s.ts)
        }
      })

      return {
        date: d,
        label: U.relativeDate(d),
        week: U.weekName(d),
        total: total,
        setCount: sets.length,
        items: items,
        setList: setList
      }
    })

    this.setData({
      days: days,
      totalDays: dates.length,
      totalReps: S.totalReps(),
      empty: days.length === 0
    })
  },

  toggle(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ expandDate: this.data.expandDate === date ? '' : date })
  },

  removeDay(e) {
    const date = e.currentTarget.dataset.date
    const self = this
    wx.showModal({
      title: '删除这一天的记录',
      content: '共 ' + S.sumOfDate(date) + ' 次，删除后无法恢复',
      confirmColor: '#E5484D',
      success(res) {
        if (res.confirm) {
          S.removeDay(date)
          self.setData({ expandDate: '' })
          self.refresh()
          wx.showToast({ title: '已删除', icon: 'none' })
        }
      }
    })
  },

  goToday() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
