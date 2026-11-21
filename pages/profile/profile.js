const T = require('../../utils/theme.js')
const S = require('../../utils/store.js')
const U = require('../../utils/util.js')
const A = require('../../utils/analytics.js')

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    p: {},              // 个人资料
    bmi: {},            // BMI 计算结果
    initial: '👤',      // 无头像时显示的占位
    summaryLine: '',    // 头像右侧的一行摘要
    genderIndex: 2,     // 0 男 / 1 女 / 2 保密

    inputAge: '',
    inputHeight: '',
    inputWeight: '',

    weights: [],        // 体重记录列表
    hasWeight: false,

    themes: T.palette(),  // 可选主题（色块预览用）
    themeId: T.DEFAULT_ID,
    themeName: '',

    stats: {
      total: 0,
      days: 0,
      streak: 0,
      exercises: 0
    }
  },

  onShow() {
    T.bindPage(this)
    this.refresh()
  },

  refresh() {
    const p = S.getProfile()
    const bmi = S.bmiOf(p)
    const w = S.weightList()

    const gi = p.gender === 'male' ? 0 : (p.gender === 'female' ? 1 : 2)

    /* 头像右侧摘要：性别 · 年龄 · 身高，有什么显示什么 */
    const bits = []
    if (p.gender) bits.push(S.genderName(p.gender))
    if (p.age) bits.push(p.age + ' 岁')
    if (p.height) bits.push(p.height + ' cm')
    if (p.weight) bits.push(p.weight + ' kg')

    this.setData({
      p: p,
      bmi: bmi,
      genderIndex: gi,
      initial: p.nickname ? p.nickname.slice(0, 1) : '👤',
      summaryLine: bits.length ? bits.join(' · ') : '完善资料，让记录更懂你',
      inputAge: p.age ? String(p.age) : '',
      inputHeight: p.height ? String(p.height) : '',
      inputWeight: p.weight ? String(p.weight) : '',
      weights: w.slice(0, 10),
      hasWeight: w.length > 0,
      weightCount: w.length,
      themeId: T.currentId(),
      themeName: T.current().name,
      stats: {
        total: S.totalReps(),
        days: S.totalDays(),
        streak: S.streakDays(),
        exercises: S.getExercises().length
      }
    })
  },

  /* ---------------------- 主题外观 ---------------------- */

  /** 点色块换主题：立刻生效（根节点 class + 导航栏 / tabBar），不用重启 */
  pickTheme(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === T.currentId()) return

    T.setTheme(id)
    const t = T.bindPage(this)          // 同时把 themeClass 写回 data
    this.setData({ themeId: t.id, themeName: t.name })
    wx.showToast({ title: '已换成' + t.name, icon: 'none', duration: 1000 })
  },

  /* ---------------------- 头像 ---------------------- */

  /**
   * 微信官方「头像填写能力」：button open-type="chooseAvatar"
   * 拿到的是临时路径，必须复制到用户目录，否则清缓存后失效
   */
  onChooseAvatar(e) {
    const tmp = e.detail && e.detail.avatarUrl
    if (!tmp) return

    const fs = wx.getFileSystemManager && wx.getFileSystemManager()
    const dir = (wx.env && wx.env.USER_DATA_PATH) || ''

    if (!fs || !dir) {
      S.saveProfile({ avatar: tmp })
      this.refresh()
      return
    }

    const file = dir + '/avatar_' + Date.now() + '.png'
    const self = this

    fs.copyFile({
      srcPath: tmp,
      destPath: file,
      success() {
        const old = S.getProfile().avatar
        if (old && old.indexOf(dir) === 0 && old !== file) {
          try {
            fs.unlink({ filePath: old, fail() {} })
          } catch (err) {}
        }
        S.saveProfile({ avatar: file })
        self.refresh()
        wx.showToast({ title: '头像已更新', icon: 'none' })
      },
      fail() {
        wx.showToast({ title: '头像保存失败', icon: 'none' })
      }
    })
  },

  /* ---------------------- 昵称 ---------------------- */

  /** input type="nickname"：失焦时微信做安全检测，所以在这里取值 */
  onNickname(e) {
    const v = (e.detail && e.detail.value) || ''
    if (v === (this.data.p.nickname || '')) return
    S.saveProfile({ nickname: v })
    this.refresh()
  },

  /* ---------------------- 性别 ---------------------- */

  onGender(e) {
    const i = Number(e.currentTarget.dataset.i)
    const g = S.GENDERS[i] ? S.GENDERS[i].key : ''
    S.saveProfile({ gender: g })
    this.refresh()
  },

  /* ---------------------- 年龄 / 身高 ---------------------- */

  onAgeInput(e) {
    this.setData({ inputAge: e.detail.value })
  },

  commitAge() {
    const raw = this.data.inputAge
    const v = parseInt(raw, 10)
    if (!raw || !v) {
      S.saveProfile({ age: 0 })
      this.refresh()
      return
    }
    if (v < 1 || v > 120) {
      wx.showToast({ title: '年龄应在 1 – 120 之间', icon: 'none' })
      return
    }
    S.saveProfile({ age: v })
    this.refresh()
  },

  onHeightInput(e) {
    this.setData({ inputHeight: e.detail.value })
  },

  commitHeight() {
    const raw = this.data.inputHeight
    const v = parseFloat(raw)
    if (!raw || !v) {
      S.saveProfile({ height: 0 })
      this.refresh()
      return
    }
    if (v < 50 || v > 250) {
      wx.showToast({ title: '身高应在 50 – 250 cm 之间', icon: 'none' })
      return
    }
    S.saveProfile({ height: Math.round(v) })
    this.refresh()
  },

  /* ---------------------- 体重 ---------------------- */

  onWeightInput(e) {
    this.setData({ inputWeight: e.detail.value })
  },

  /** 记录今天的体重（同一天重复记录会覆盖） */
  addWeight() {
    const v = parseFloat(this.data.inputWeight)
    if (!v) {
      wx.showToast({ title: '请输入体重', icon: 'none' })
      return
    }
    const r = S.setWeight(U.today(), v)
    if (!r.ok) {
      wx.showToast({ title: r.reason, icon: 'none' })
      return
    }
    this.setData({ inputWeight: '' })
    this.refresh()
    wx.showToast({ title: '已记录 ' + v.toFixed(1) + ' kg', icon: 'none' })
  },

  delWeight(e) {
    const d = e.currentTarget.dataset.date
    const self = this
    wx.showModal({
      title: '删除这条体重记录',
      content: U.prettyDate(d),
      confirmColor: '#E5484D',
      success(res) {
        if (res.confirm) {
          S.removeWeight(d)
          self.refresh()
        }
      }
    })
  },

  /* ---------------------- 其它 ---------------------- */

  goBackup() {
    wx.navigateTo({ url: '/pages/backup/backup' })
  },

  goExercise() {
    wx.switchTab({ url: '/pages/exercise/exercise' })
  },

  goShare() {
    wx.navigateTo({ url: '/pages/share/share' })
  },

  /**
   * 隐藏入口：连点底部说明文字 5 次进管理面板
   * 这样面板不在任何可见菜单里，普通用户根本不会看到
   */
  onSecretTap() {
    const now = Date.now()
    if (now - (this._tapAt || 0) > 2000) this._tapCount = 0
    this._tapAt = now
    this._tapCount = (this._tapCount || 0) + 1

    if (this._tapCount >= 5) {
      this._tapCount = 0
      wx.navigateTo({ url: '/pages/admin/admin' })
      return
    }
    if (this._tapCount === 3) {
      wx.showToast({ title: '再点 ' + (5 - this._tapCount) + ' 次', icon: 'none', duration: 800 })
    }
  },

  /** 清空个人资料（不动锻炼记录） */
  resetProfile() {
    const self = this
    wx.showModal({
      title: '清空个人资料',
      content: '将清除头像、昵称、性别、年龄、身高与全部体重记录。锻炼记录不受影响。',
      confirmText: '清空',
      confirmColor: '#E5484D',
      success(res) {
        if (!res.confirm) return
        wx.setStorageSync('workout_profile_v1', {})
        wx.setStorageSync('workout_weight_v1', {})
        self.refresh()
        wx.showToast({ title: '已清空', icon: 'none' })
      }
    })
  }
})
