const T = require('../../utils/theme.js')
const A = require('../../utils/analytics.js')

function fmtTime(ts) {
  const d = new Date(ts)
  const p = function (n) { return n < 10 ? '0' + n : String(n) }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

Page({
  data: {
    themeClass: '',   // 当前主题类名，由 utils/theme.js 写入
    authed: false,      // 是否已通过口令校验
    token: '',
    loading: false,
    error: '',
    off: false,

    s: null,            // 云函数返回的统计数据
    series: [],
    platforms: [],
    updatedAt: ''
  },

  onLoad() {
    const t = A.getToken()
    this.setData({ token: t, authed: !!t, off: A.isOff() }, () => {
      if (t) this.load()
    })
  },

  onShow() {
    T.bindPage(this)
    this.setData({ off: A.isOff() })
  },

  onPullDownRefresh() {
    if (this.data.authed) this.load()
    else wx.stopPullDownRefresh()
  },

  /* ---------------------- 口令 ---------------------- */

  onTokenInput(e) {
    this.setData({ token: e.detail.value })
  },

  submit() {
    const t = String(this.data.token || '').trim()
    if (!t) {
      wx.showToast({ title: '请输入管理口令', icon: 'none' })
      return
    }
    A.setToken(t)
    this.setData({ authed: true, error: '' })
    this.load()
  },

  logout() {
    const self = this
    wx.showModal({
      title: '退出管理',
      content: '清除本机保存的口令，下次进入需要重新输入',
      confirmColor: '#E5484D',
      success(res) {
        if (!res.confirm) return
        A.clearToken()
        self.setData({ authed: false, token: '', s: null, series: [], platforms: [], error: '' })
      }
    })
  },

  /* ---------------------- 拉取数据 ---------------------- */

  load() {
    if (!A.cloudReady() || !wx.cloud || !wx.cloud.callFunction) {
      this.setData({ loading: false, error: '云开发未就绪：确认 app.js 里已填环境 ID，并重新编译' })
      return
    }

    this.setData({ loading: true, error: '' })
    const self = this

    wx.cloud.callFunction({
      name: 'adminStats',
      data: { token: A.getToken() },
      success(res) {
        wx.stopPullDownRefresh()
        const r = (res && res.result) || {}
        if (!r.ok) {
          self.setData({ loading: false, error: r.reason || '读取失败' })
          return
        }

        let max = 1
        ;(r.series || []).forEach(function (x) { if (x.active > max) max = x.active })

        const series = (r.series || []).map(function (x) {
          return {
            date: x.date,
            dnum: x.dnum,
            newCount: x.newCount,
            active: x.active,
            returning: x.returning,
            // 堆叠柱：回访在上、新增在下，高度按最大活跃天数比例
            retH: Math.round((x.returning / max) * 100),
            newH: Math.round((x.newCount / max) * 100)
          }
        })

        self.setData({
          loading: false,
          s: r,
          series: series,
          platforms: r.platforms || [],
          updatedAt: fmtTime(r.generatedAt || Date.now())
        })
      },
      fail() {
        wx.stopPullDownRefresh()
        self.setData({
          loading: false,
          error: '云函数调用失败：确认已右键 adminStats →「上传并部署」'
        })
      }
    })
  },

  /* ---------------------- 上报开关 ---------------------- */

  onToggleOff(e) {
    const v = !!e.detail.value
    const self = this
    if (v) {
      wx.showModal({
        title: '停止匿名统计',
        content: '停止后本机会立刻停止上报，你将不再出现在统计里。已上报的历史数据需要到云开发控制台手动删除。',
        confirmColor: '#E5484D',
        success(res) {
          if (res.confirm) {
            A.setOff(true)
            self.setData({ off: true })
          }
        }
      })
    } else {
      A.setOff(false)
      this.setData({ off: false })
      A.ping()
    }
  }
})
