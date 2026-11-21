const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 生成小程序码（云调用，不需要 access_token / AppSecret）
 *
 * 注意：getUnlimited 的 page 必须是「已发布」的小程序页面。
 * 审核中 / 体验版阶段调用会失败，端上会自动回落到本地静态码。
 */
exports.main = async (event) => {
  const scene = String(event.scene || 'share').slice(0, 32)
  const page = event.page || 'pages/index/index'
  const width = Number(event.width) || 280

  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene: scene,
      page: page,
      width: width,
      autoColor: false,
      // 海报上码放在白色圆角卡片里，所以用深色线条
      lineColor: { r: 17, g: 24, b: 39 },
      isHyaline: true
    })

    return {
      ok: true,
      base64: res.buffer.toString('base64'),
      contentType: res.contentType || 'image/png'
    }
  } catch (err) {
    return {
      ok: false,
      errMsg: (err && err.errMsg) || (err && err.message) || String(err)
    }
  }
}
