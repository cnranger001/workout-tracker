/**
 * 主题（配色方案）
 *
 * 六套方案：柠檬黄（默认）/ 天蓝 / 军绿 / 酒红 / 石灰灰 / 紫。
 * 每套只换「品牌色 + 底色 + 中性色冷暖」，布局、字号、间距完全不动。
 *
 * 这里是唯一的数据源：
 *   - app.wxss 里的 .theme-xxx 由 tools/gen-theme-css.js 按这份数据生成
 *     （WXSS 不支持运行时写 CSS 变量，所以样式类必须写死）
 *   - 导航栏 / 状态栏 / tabBar 颜色、分享卡 Canvas 取色也从这里读
 * 改动色值后执行一次：node tools/gen-theme-css.js
 */

const THEME_KEY = 'workout_theme_v1'

const THEMES = [
  {
    id: 'lemon',
    name: '柠檬黄',
    hint: '默认',
    /* 导航栏文字只有黑 / 白两种，深色底用白字 */
    navFront: '#000000',
    tabSelected: '#C08A00',
    /* 品牌色系 */
    brand: '#FFC300',
    brand2: '#FFD84D',
    brandDeep: '#E0A100',
    brandText: '#8A6500',
    brandInk: '#3A2F00',
    brandSoft: '#FFF6D0',
    brandSoft2: '#FBF5DC',
    /* 中性色系 */
    bg: '#FAF8EF',
    card: '#FFFFFF',
    line: '#F0EDE0',
    text1: '#221F15',
    text2: '#55514A',
    text3: '#A69F8E',
    arrow: '#C9C3B2',
    fill: '#F4F2E8',
    fill2: '#F7F5EC',
    /* 分享卡内白色面板上的文字色（不随品牌墨色走，保证面板里始终可读） */
    panelInk: '#3A2F00'
  },
  {
    id: 'sky',
    name: '天蓝',
    hint: '清爽',
    navFront: '#000000',
    tabSelected: '#1B6C99',
    brand: '#5CB3E6',
    brand2: '#8FD1F5',
    brandDeep: '#3E93C7',
    brandText: '#176A96',
    brandInk: '#0A3B55',
    brandSoft: '#E8F4FD',
    brandSoft2: '#DDF0FC',
    bg: '#F4F9FC',
    card: '#FFFFFF',
    line: '#E3EFF6',
    text1: '#16242B',
    text2: '#4C5A63',
    text3: '#97A6B0',
    arrow: '#BFD0DA',
    fill: '#ECF2F6',
    fill2: '#F3F8FB',
    panelInk: '#0A3B55'
  },
  {
    id: 'military',
    name: '军绿',
    hint: '沉稳',
    navFront: '#000000',
    tabSelected: '#4C5C33',
    brand: '#74874F',
    brand2: '#94A574',
    brandDeep: '#5E7040',
    brandText: '#4C5C33',
    brandInk: '#1E2614',
    brandSoft: '#EFF3E2',
    brandSoft2: '#E7EDD6',
    bg: '#F6F8F0',
    card: '#FFFFFF',
    line: '#E5EAD9',
    text1: '#1E2217',
    text2: '#4E5344',
    text3: '#9AA189',
    arrow: '#C2C9B2',
    fill: '#EFEFE7',
    fill2: '#F4F5EC',
    panelInk: '#1E2614'
  },
  {
    id: 'burgundy',
    name: '酒红',
    hint: '浓郁',
    navFront: '#FFFFFF',
    tabSelected: '#8E2F3C',
    brand: '#8E2F3C',
    brand2: '#A95260',
    brandDeep: '#74232C',
    brandText: '#8E2F3C',
    brandInk: '#FFF6F5',
    brandSoft: '#F9EAEC',
    brandSoft2: '#F3DDE0',
    bg: '#FAF6F6',
    card: '#FFFFFF',
    line: '#F1E2E4',
    text1: '#241A1B',
    text2: '#5A4A4C',
    text3: '#A99094',
    arrow: '#DCC4C7',
    fill: '#F3EBEC',
    fill2: '#F8F1F2',
    panelInk: '#3B1418'
  },
  {
    id: 'limestone',
    name: '石灰灰',
    hint: '素净',
    navFront: '#000000',
    tabSelected: '#6C675D',
    brand: '#A8A294',
    brand2: '#C8C2B4',
    brandDeep: '#8B8578',
    brandText: '#6C675D',
    brandInk: '#2A2823',
    brandSoft: '#F2F0EA',
    brandSoft2: '#EAE7DF',
    bg: '#F7F6F2',
    card: '#FFFFFF',
    line: '#E7E4DC',
    text1: '#22211D',
    text2: '#55534C',
    text3: '#A09C91',
    arrow: '#C8C3B6',
    fill: '#F0EFE9',
    fill2: '#F5F4EF',
    panelInk: '#2A2823'
  },
  {
    id: 'purple',
    name: '紫',
    hint: '个性',
    navFront: '#FFFFFF',
    tabSelected: '#5C3FB0',
    brand: '#7B5AD8',
    brand2: '#9F86EE',
    brandDeep: '#6547BC',
    brandText: '#5C3FB0',
    brandInk: '#FDFBFF',
    brandSoft: '#F1ECFD',
    brandSoft2: '#EAE2FB',
    bg: '#F8F6FE',
    card: '#FFFFFF',
    line: '#EBE5F8',
    text1: '#201B2C',
    text2: '#544D66',
    text3: '#9E96B4',
    arrow: '#CFC7E4',
    fill: '#F1EEF7',
    fill2: '#F6F3FC',
    panelInk: '#2A2140'
  }
]

const DEFAULT_ID = 'lemon'

function byId(id) {
  for (let i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === id) return THEMES[i]
  }
  return null
}

/** 当前主题（没选过 / 存的值不认识 → 回到柠檬黄） */
function current() {
  let saved = ''
  try {
    saved = wx.getStorageSync(THEME_KEY) || ''
  } catch (e) {
    saved = ''
  }
  return byId(saved) || byId(DEFAULT_ID)
}

function currentId() {
  return current().id
}

/** 保存选择；返回 true 表示确实换了主题 */
function setTheme(id) {
  const t = byId(id)
  if (!t) return false
  const changed = currentId() !== t.id
  try {
    wx.setStorageSync(THEME_KEY, t.id)
  } catch (e) {}
  return changed
}

/** #RRGGBB + alpha → rgba(...)，Canvas 里没有 CSS 变量，只能自己算 */
function rgba(hex, alpha) {
  const h = String(hex || '').replace('#', '')
  const full = h.length === 3
    ? h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2)
    : h
  const n = parseInt(full, 16)
  if (!isFinite(n)) return 'rgba(0,0,0,' + alpha + ')'
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

/** 主题里某个色 + 透明度（Canvas 用） */
function ink(alpha) {
  return rgba(current().brandInk, alpha)
}

/**
 * 把一个页面接上主题：
 *   - 给根节点写 class（CSS 变量靠它覆盖）
 *   - 同步导航栏 / 状态栏 / tabBar 颜色
 * 每个页面的 onShow（分享页是 onLoad）里调一次即可。
 */
function bindPage(page) {
  const t = current()

  if (page && page.setData) {
    page.setData({ themeClass: 'theme-' + t.id })
  }

  if (typeof wx === 'undefined') return t

  if (wx.setNavigationBarColor) {
    wx.setNavigationBarColor({
      frontColor: t.navFront,
      backgroundColor: t.brand,
      fail() {}
    })
  }

  if (wx.setBackgroundColor) {
    wx.setBackgroundColor({
      backgroundColor: t.bg,
      backgroundColorTop: t.bg,
      backgroundColorBottom: t.bg,
      fail() {}
    })
  }

  if (wx.setTabBarStyle) {
    wx.setTabBarStyle({
      color: t.text3,
      selectedColor: t.tabSelected,
      backgroundColor: '#FFFFFF',
      borderStyle: 'white',
      fail() {}
    })
  }

  return t
}

/** 当前主题的一小份数据（给页面直接显示，如主题预览色块） */
function palette() {
  return THEMES.map(function (t) {
    return {
      id: t.id,
      name: t.name,
      hint: t.hint,
      brand: t.brand,
      brand2: t.brand2,
      brandInk: t.brandInk
    }
  })
}

module.exports = {
  THEME_KEY: THEME_KEY,
  THEMES: THEMES,
  DEFAULT_ID: DEFAULT_ID,
  byId: byId,
  current: current,
  currentId: currentId,
  setTheme: setTheme,
  rgba: rgba,
  ink: ink,
  bindPage: bindPage,
  palette: palette
}
