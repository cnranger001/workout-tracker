const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')
const U = require('../../utils/util.js')

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    totalDays: 0,     // 打卡天数
    setCount: 0,      // 总组数
    totalReps: 0,     // 累计次数
    lastDate: '',     // 最近一次记录日期

    backupText: '',   // 导出的备份文本
    backupEmpty: true,

    importText: '',   // 待导入的文本
    mode: 'merge',    // merge | replace
    parseMsg: '',
    parseOk: false,
    canImport: false
  },

  onShow() {
    T.bindPage(this)
    this.refresh()
  },

  refresh() {
    const all = S.getAll()
    let sets = 0
    Object.keys(all).forEach(function (d) {
      sets += (all[d] || []).length
    })
    const dates = S.getAllDates()

    this.setData({
      totalDays: dates.length,
      setCount: sets,
      totalReps: S.totalReps(),
      lastDate: dates.length ? U.prettyDate(dates[0]) : '',
      backupText: sets > 0 ? S.exportBackup() : '',
      backupEmpty: sets === 0
    })

    if (this.data.importText) this.check(this.data.importText)
  },

  /* ---------------------- 导出 ---------------------- */

  onBackupInput(e) {
    // 允许手动编辑（比如删掉某些天），保持文本同步
    this.setData({ backupText: e.detail.value })
  },

  copyText() {
    const text = this.data.backupText
    if (!text) {
      wx.showToast({ title: '还没有可导出的记录', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({ title: '已复制，粘贴到备忘录保存', icon: 'none' })
      },
      fail() {
        wx.showToast({ title: '复制失败，请长按上方文本手动复制', icon: 'none' })
      }
    })
  },

  /** 存成 txt 文件并发给好友 / 文件传输助手 */
  shareFile() {
    const text = this.data.backupText
    if (!text) {
      wx.showToast({ title: '还没有可导出的记录', icon: 'none' })
      return
    }
    const fs = wx.getFileSystemManager && wx.getFileSystemManager()
    const dir = (wx.env && wx.env.USER_DATA_PATH) || ''
    if (!fs || !dir) {
      wx.showToast({ title: '当前环境不支持存文件', icon: 'none' })
      return
    }

    const name = '锻炼记录备份-' + U.today() + '.txt'
    const file = dir + '/workout-backup.txt'
    fs.writeFile({
      filePath: file,
      data: text,
      encoding: 'utf8',
      success() {
        if (wx.shareFileMessage) {
          wx.shareFileMessage({
            filePath: file,
            fileName: name,
            fail() {
              wx.showToast({ title: '已存为文件，也可直接复制文本', icon: 'none' })
            }
          })
        } else {
          wx.showToast({ title: '已存为文件，也可直接复制文本', icon: 'none' })
        }
      },
      fail() {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  },

  /* ---------------------- 导入 ---------------------- */

  onImportInput(e) {
    const v = e.detail.value || ''
    this.setData({ importText: v }, () => this.check(v))
  },

  /** 实时校验粘贴进来的文本，给用户明确反馈 */
  check(text) {
    if (!text || !text.trim()) {
      this.setData({ parseMsg: '', parseOk: false, canImport: false })
      return
    }
    const p = S.parseBackup(text)
    if (!p.ok) {
      this.setData({ parseMsg: '❌ ' + p.reason, parseOk: false, canImport: false })
      return
    }
    let msg = '✅ 识别到 ' + p.days + ' 天 / ' + p.count + ' 组记录'
    if (p.skipped > 0) msg += '（跳过 ' + p.skipped + ' 条无效数据）'
    if (p.groups && p.groups.length > 1) msg += ' · ' + p.groups.length + ' 个分组'
    if (p.best && Object.keys(p.best).length) msg += ' · 负重纪录'
    if (p.hasProfile) msg += ' · 含个人资料与体重记录'
    this.setData({ parseMsg: msg, parseOk: true, canImport: true })
  },

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  clearImport() {
    this.setData({ importText: '', parseMsg: '', parseOk: false, canImport: false })
  },

  doImport() {
    if (!this.data.canImport) {
      wx.showToast({ title: '请先粘贴有效的备份文本', icon: 'none' })
      return
    }
    const self = this
    const replace = this.data.mode === 'replace'

    const run = function () {
      const r = S.importBackup(self.data.importText, self.data.mode)
      if (!r.ok) {
        wx.showToast({ title: r.reason || '导入失败', icon: 'none' })
        return
      }
      self.setData({ importText: '', parseMsg: '', parseOk: false, canImport: false })
      self.refresh()
      wx.showModal({
        title: '导入完成',
        content: '新增 ' + r.added + ' 组'
          + (r.dup > 0 ? '，跳过重复 ' + r.dup + ' 组' : '')
          + '\n现在共有 ' + r.days + ' 天的记录',
        showCancel: false,
        confirmColor: T.current().brandText
      })
    }

    if (replace) {
      wx.showModal({
        title: '确认覆盖？',
        content: '覆盖导入会先清空本机现有记录，只保留备份里的数据。此操作不可撤销。',
        confirmText: '覆盖导入',
        confirmColor: '#E5484D',
        success(res) {
          if (res.confirm) run()
        }
      })
    } else {
      run()
    }
  },

  goToday() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
