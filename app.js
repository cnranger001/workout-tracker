/**
 * 云开发环境 ID
 *
 * 开通云开发后，把环境 ID 填到下面：
 *   1. 开发者工具顶部工具栏找到「云开发」按钮（一朵云的图标，位置偏左；
 *      窗口太窄时会被折叠进工具栏右侧的 ⋯ / » 里，拉宽窗口即可看到）
 *   2. 开通并新建一个环境（免费额度）
 *   3. 在「环境 → 环境 ID」里复制形如 workout-1x2y3z 的 ID
 * 保持 YOUR_CLOUD_ENV_ID 不动 = 不使用云开发，小程序码改走本地静态码兜底。
 */
const CLOUD_ENV = 'cloud1-d2gcihi9wc2f942ad'

const A = require('./utils/analytics.js')

App({
  globalData: {
    // 数据版本号，后续结构升级时可做迁移
    dataVersion: 1,
    cloudEnv: CLOUD_ENV,
    cloudReady: false
  },

  onLaunch() {
    // 首次启动时初始化目标值
    const goals = wx.getStorageSync('workout_goals_v1')
    if (!goals) {
      wx.setStorageSync('workout_goals_v1', { squat: 50, pullup: 20, pushup: 50 })
    }

    this.initCloud()

    // 匿名上报一次活跃（每天最多一次，失败静默忽略）。
    // 不想统计就把 utils/analytics.js 的 ping 调用注释掉，或在管理页关掉开关。
    A.ping()
  },

  /** 云开发初始化：只在填了真实环境 ID 时才启用 */
  initCloud() {
    const usable = CLOUD_ENV && CLOUD_ENV.indexOf('YOUR_') !== 0
    if (!usable || !wx.cloud) return
    try {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: false })
      this.globalData.cloudReady = true
    } catch (e) {
      this.globalData.cloudReady = false
    }
  },

  onShow() {
    // 跨天时补一次上报（比如小程序一直在后台没被销毁）
    A.ping()
  },

  onHide() {}
})
