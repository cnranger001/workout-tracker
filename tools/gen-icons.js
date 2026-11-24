/* 运动图标生成器 v4 —— 参考「器械说明牌」插画风格
 * 视觉规则：
 *   1) 以 ex-hangleg.png 为参考：暖奶油色人体、细深色轮廓、白色圆角底板
 *   2) 不使用黑色短裤 / 黑色鞋块，保持简洁的说明牌线稿感
 *   3) 器械统一黑色细线，配重片是带轮毂的圆
 *   4) 红色弧形箭头标出发力/运动方向（等长动作如平板支撑不画）
 *   5) 全部站同一条基线 y=55
 *
 * 用法：node tools/gen-icons.js
 *   → tools/svg/*.svg（可编辑的源）
 *   → tools/.tmp/*.html（给 Chrome 截图的临时页）
 * 栅格化：
 *   chrome --headless=new --default-background-color=00000000 --window-size=144,144 \
 *     --screenshot=images/ex-<key>.png file:///.../tools/.tmp/<key>.html
 */
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'svg')
const TMP = path.join(__dirname, '.tmp')

const INK = '#26231F'
const SKIN = '#FFF4DD'
const HOT = '#F0443E'

/* 每格字段：
 *   gear   器械线条（数组，一根一根写）
 *   plate  圆：配重片 / 滑轮 / 滚轮 [cx,cy,r]
 *   fig    四肢（粗黑描边 + 白芯）
 *   torso  躯干（更粗）
 *   head   头心 [cx,cy]
 *   shorts 短裤 [x1,y1,x2,y2]（12 宽黑线画成色块）
 *   shoes  鞋 [[x1,y1,x2,y2], ...]（7.6 宽黑线）
 *   arrows 红色箭头 [[x1,y1,x2,y2], ...]
 */
const ICONS = {
  /* ---------- 第一行：俯卧撑 / 引体 / 深蹲 / 硬拉 ---------- */
  pushup: {
    gear: [],
    fig: ['M46 34 46 44 46 53.5', 'M46 34 39 43 34 51', 'M30 40 21 47 15 53', 'M30 40 25 48 20 54'],
    torso: 'M46 33 30 40',
    head: [51, 25.5],
    shorts: [28, 39, 32, 42],
    shoes: [[15, 53, 9.5, 54.5]],
    arrows: [[41, 25, 41, 36]]
  },


  pullup: {
    gear: ['M8 12h48', 'M8 12v-4', 'M56 12v-4', 'M6 58h52'],
    fig: ['M30 31 23 22 19.5 13.5', 'M34 31 41 22 44.5 13.5',
      'M32 42 29.5 50 28.5 56', 'M32 42 34.5 50 35.5 56'],
    torso: 'M32 29 32 42',
    head: [32, 23.5],
    shorts: [30, 42, 34, 42],
    shoes: [[28.5, 56, 24.5, 57.5], [35.5, 56, 39.5, 57.5]],
    arrows: [[39, 26, 39, 40]]
  },


  squat: {
    gear: ['M10 18h44', 'M22 14.5v7', 'M42 14.5v7', 'M6 55h52'],
    plate: [[14, 18, 5], [50, 18, 5]],
    fig: ['M31 25 26 28 23 21', 'M32 25 27 29 24 22', 'M25 38 39 40 36 54', 'M25 38 35 43 32 54'],
    torso: 'M32 20 25 38',
    head: [34, 14.5],
    shorts: [23.5, 37, 30, 40.5],
    shoes: [[36, 54, 44, 54]],
    arrows: [[46, 33, 46, 44]]
  },
  deadlift: {
    gear: ['M10 32h44', 'M19 28.5v7', 'M45 28.5v7', 'M6 55h52'],
    plate: [[14, 32, 5], [50, 32, 5]],
    fig: ['M31 22 34 28 34 31.5', 'M32 22 37 28 37 31.5', 'M30 36 26 45 25 54', 'M30 36 34 45 34 54'],
    torso: 'M32 19 30 36',
    head: [33, 13.5],
    shorts: [28.5, 35, 32, 38.5],
    shoes: [[25, 54, 33, 54]],
    arrows: [[40, 23, 40, 34]]
  },

  /* ---------- 第二行：卧推 / 哑铃肩推 / 高位下拉 / 坐姿划船 ---------- */
  benchpress: {
    gear: ['M7 43h34', 'M11 43v12', 'M37 43v12', 'M20 16h38', 'M27 12.5v7', 'M51 12.5v7'],
    plate: [[24, 16, 5], [54, 16, 5]],
    fig: ['M36 35 37 26 37 18.5', 'M36 35 32 27 32 20', 'M18 38 14 44 14 51', 'M18 38 22 45 22 52'],
    torso: 'M36 35 18 38',
    head: [44, 32.5],
    shorts: [16.5, 37.6, 22, 38.2],
    shoes: [],
    arrows: [[46, 21, 46, 31]]
  },

  /* 哑铃卧推：和 benchpress 同样是躺凳推起，但手里是两只独立哑铃，
     所以画两段短握柄 + 四个小配重片，箭头指向上方表示推起 */
  dbbench: {
    gear: ['M7 43h34', 'M11 43v12', 'M37 43v12', 'M20 16h16', 'M42 16h16'],
    plate: [[22, 16, 3.6], [34, 16, 3.6], [44, 16, 3.6], [56, 16, 3.6]],
    fig: ['M34 35 29 26 27 18', 'M34 35 40 26 44 18', 'M18 38 14 44 14 51', 'M18 38 22 45 22 52'],
    torso: 'M34 35 18 38',
    head: [42, 32.5],
    shorts: [16.5, 37.6, 22, 38.2],
    shoes: [],
    arrows: [[58, 25, 58, 15]]
  },

  dbpress: {
    gear: ['M17 24v20', 'M17 44h16', 'M24 44v11', 'M10 55h48'],
    plate: [[10, 12, 3.2], [18, 12, 3.2], [28, 12, 3.2], [36, 12, 3.2]],
    fig: ['M22 26 16 20 14 13', 'M25 26 31 20 33 13', 'M21 44 34 45 37 54', 'M21 44 29 49 32 55'],
    torso: 'M24 22 21 44',
    head: [25, 17],
    shorts: [19.5, 43, 25, 45.5],
    shoes: [[37, 54, 44, 54]],
    arrows: [[7, 14, 7, 24]]
  },
  pulldown: {
    gear: ['M54 8v47', 'M46 55h14', 'M54 10h-12', 'M20 20h26', 'M12 44h12', 'M18 44v11', 'M6 55h52'],
    plate: [[40, 12, 2.6]],
    fig: ['M25 36 24 28 28 21', 'M27 36 34 28 36 21', 'M22 44 34 45 36 54', 'M22 44 30 49 32 55'],
    torso: 'M25 34 22 44',
    head: [26, 29],
    shorts: [20.5, 43, 25.5, 45],
    shoes: [[36, 54, 43, 54]],
    arrows: [[41, 25, 41, 34]]
  },
  cablerow: {
    gear: ['M54 10v45', 'M46 55h14', 'M47 16h8v22h-8z', 'M47 34h-9', 'M38 30v8',
      'M15 43h12', 'M21 43v12', 'M6 55h52'],
    plate: [[50, 20, 2.4]],
    fig: ['M26 32 32 35 37.5 34', 'M26 33 32 37 38 37', 'M25 43 36 44 39 52', 'M25 43 34 47 37 53'],
    torso: 'M26 30 25 43',
    head: [26, 25],
    shorts: [23.5, 42, 28, 44.5],
    shoes: [[39, 52, 45, 50]],
    arrows: [[43, 27, 35, 27]]
  },

  /* ---------- 第三行：倒蹬 / 腿屈伸 / 腿弯举 / 山羊挺身 ---------- */
  legpress: {
    gear: ['M8 48h24', 'M12 48v7', 'M28 48v7', 'M46 21 54 31', 'M50 24 57 33', 'M6 55h52'],
    fig: ['M28 45 37 39 44 32', 'M28 45 39 45 48 39', 'M20 36 27 39 30 44'],
    torso: 'M16 45 28 45',
    head: [9.5, 39],
    shorts: [26.5, 45, 31, 46.5],
    shoes: [[42, 32, 47, 27]],
    arrows: [[33, 26, 41, 33]]
  },
  legext: {
    gear: ['M12 24v18', 'M13 42h18', 'M15 42v13', 'M8 55h26', 'M6 55h52'],
    plate: [[46, 32, 2.8]],
    fig: ['M16 42 31 42 43 34', 'M16 42 28 46 39 46', 'M20 29 27 32 31 38'],
    torso: 'M18 24 16 42',
    head: [19, 19],
    shorts: [14.5, 41, 20, 44],
    shoes: [],
    arrows: [[36, 27, 42, 33]]
  },
  legcurl: {
    gear: ['M9 40h34', 'M13 40v15', 'M41 40v15'],
    plate: [[49, 26, 2.6]],
    fig: ['M36 37 45 39 47.5 29', 'M36 38 44 43 48 35', 'M22 31 28 34 32 36'],
    torso: 'M19 35.5 36 37',
    head: [11, 31.5],
    shorts: [33.5, 36.5, 38, 38],
    shoes: [[47.5, 27.5, 50, 23.5]],
    arrows: [[54.5, 32, 54.5, 23]]
  },

  backext: {
    gear: ['M8 50 30 24', 'M12 55 34 29', 'M6 55h52'],
    fig: ['M28 28 22 38 16 46', 'M29 28 24 38 19 47', 'M34 24 28 20 23 23', 'M34 24 39 28 42 32'],
    torso: 'M28 28 36 22',
    head: [40, 19],
    shorts: [26.5, 27, 29, 31],
    shoes: [[15, 47, 12, 50]],
    arrows: [[45, 22, 45, 32]]
  },

  /* ---------- 第四行：弯举 / 绳索下压 / 单车 / 平板 ---------- */
  curl: {
    gear: ['M18 22h14', 'M6 55h52'],
    plate: [[17, 22, 3.4], [33, 22, 3.4]],
    fig: ['M32 23 26 31 25 23', 'M34 23 40 31 41 23', 'M31 38 27 52', 'M31 38 35 52'],
    torso: 'M33 19 31 38',
    head: [33, 14],
    shorts: [29.5, 37, 33.5, 39.5],
    shoes: [[27, 52, 23.5, 54], [35, 52, 38.5, 54]],
    arrows: [[19, 14, 19, 24]]
  },
  pushdown: {
    gear: ['M54 8v47', 'M46 55h14', 'M54 16h-4', 'M50 18 46 30', 'M38 40h6', 'M6 55h52'],
    plate: [[50, 15, 2.4]],
    fig: ['M32 28 38 33 41 40', 'M32 28 26 33 23 39', 'M31 42 27 54', 'M31 42 35 54'],
    torso: 'M32 25 31 42',
    head: [32, 20],
    shorts: [29.5, 41, 33, 44],
    shoes: [[27, 54, 23.5, 55.5], [35, 54, 38.5, 55.5]],
    arrows: [[47, 33, 47, 44]]
  },
  bike: {
    gear: ['M12 55h36', 'M12 40h14', 'M18 40 24 52', 'M38 26v26', 'M33 26h8', 'M24 52h14'],
    plate: [[30, 45, 9]],
    fig: ['M24 25 32 27 37 27', 'M24 26 31 30 36 31', 'M19 38 28 40 33 48', 'M19 38 26 44 30 51'],
    torso: 'M23 23 19 38',
    head: [24, 17],
    shorts: [18, 37, 22, 39.5],
    shoes: [[33, 48, 37, 51]],
    arrows: [[31, 51, 39, 47]]
  },
  plank: {
    gear: [],
    fig: ['M44 39 44 52 35 52', 'M44 39 42 50 38 54', 'M30 43 20 49 15 53.5', 'M30 43 24 51 20 55'],
    torso: 'M44 38 30 43',
    head: [49, 31],
    shorts: [27.5, 41.5, 31, 45],
    shoes: [[15, 53.5, 10.5, 55]],
    arrows: []
  },


  /* ---------- 图里没有、但小程序已有：照样板统一重画 ---------- */
  bulgarian: {
    gear: ['M40 33h19', 'M44 33v10', 'M54 33v10'],
    fig: ['M26 36 30 45 28 54', 'M26 36 37 43 41.5 34', 'M25 25 30 31 30 37', 'M25 25 20 30 20 35'],
    torso: 'M24 21 26 36',
    head: [23.5, 15.5],
    shorts: [24.5, 35, 28.5, 39],
    shoes: [[28, 54, 35, 54], [41.5, 34, 45.5, 32.5]],
    arrows: [[33, 47, 33, 39]]
  },

  lateral: {
    gear: ['M16 20v8', 'M48 20v8', 'M6 55h52'],
    plate: [[16, 24, 3.4], [48, 24, 3.4]],
    fig: ['M32 26 19 24', 'M32 26 45 24', 'M32 42 27 54', 'M32 42 37 54'],
    torso: 'M32 22 32 42',
    head: [32, 17],
    shorts: [30, 41, 34, 44],
    shoes: [[27, 54, 23.5, 55.5], [37, 54, 40.5, 55.5]],
    arrows: [[9, 20, 9, 30]]
  },
  hipbridge: {
    gear: ['M36 40h20', 'M40 40v15', 'M52 40v15', 'M8 29h24', 'M6 55h52'],
    plate: [[10, 29, 4.5]],
    fig: ['M24 33 18 42 20 53', 'M24 33 27 42 30 52', 'M39 36 33 31 28 29', 'M39 36 44 32 48 30'],
    torso: 'M39 36 24 33',
    head: [44, 29],
    shorts: [22, 32, 26.5, 36],
    shoes: [[20, 53, 27, 53]],
    arrows: [[13, 22, 13, 31]]
  },
  lunge: {
    gear: ['M6 55h52'],
    fig: ['M29 37 41 43 39 54', 'M29 37 21 44 16 51', 'M30 24 35 30 35 36', 'M30 24 25 30 24 35'],
    torso: 'M30 21 29 37',
    head: [30, 16],
    shorts: [28, 36, 32.5, 40],
    shoes: [[39, 54, 46, 54], [16, 51, 9, 52.5]],
    arrows: [[45, 39, 45, 48]]
  },
  run: {
    gear: ['M6 55h52'],
    fig: ['M34 23 42 26 40 18', 'M33 23 25 27 21 21',
      'M30 33 37 40 35 52', 'M30 33 22 39 15 37'],
    torso: 'M35 20 30 33',
    head: [36, 15],
    shorts: [29, 32, 33.5, 36],
    shoes: [[35, 52, 42, 52], [15, 37, 10, 36]],
    arrows: [[45, 23, 45, 33]]
  },
  ohp: {
    gear: ['M14 12h36', 'M21 8.5v7', 'M43 8.5v7', 'M6 55h52'],
    plate: [[16, 12, 5], [48, 12, 5]],
    fig: ['M30 31 24 22 23 14', 'M34 31 40 22 41 14', 'M32 43 27 54', 'M32 43 37 54'],
    torso: 'M32 30 32 43',
    head: [32, 25],
    shorts: [30, 42, 34, 45],
    shoes: [[27, 54, 23.5, 55.5], [37, 54, 40.5, 55.5]],
    arrows: [[53, 20, 53, 30]]
  },

  /* ---------- 第五批：澳式引体 / 髋外展 / 髋内收 / 提踵 ---------- */
  /* 低杠悬垂，身体斜着把胸口拉向杠 */
  invertedrow: {
    gear: ['M24 18h32', 'M26 14v4', 'M54 14v4', 'M6 55h52'],
    fig: ['M41 32 36 25 33 18', 'M43 33 46 25 49 18',
      'M28 43 22 44 16 48', 'M29 44 23 50 17 54'],
    torso: 'M42 32 28 43',
    head: [47, 29],
    shorts: [26, 41.6, 29.8, 46],
    shoes: [[16, 48, 10, 49], [17, 54, 11, 55]],
    arrows: [[33, 40, 33, 32]]
  },

  /* 坐姿髋外展：双膝向外顶，箭头朝外 */
  abduct: {
    gear: ['M8 55h48', 'M22 42h20v3h-20z', 'M32 45v10', 'M12 55v-26', 'M52 55v-26', 'M6 55h52'],
    plate: [[12, 26, 2.6], [52, 26, 2.6]],
    fig: ['M32 25 24 30', 'M32 25 40 30',
      'M30 40 17 42 16 50', 'M34 40 47 42 48 50'],
    torso: 'M32 20 32 38',
    head: [32, 15],
    shorts: [27, 40.5, 37, 40.5],
    shoes: [[16, 50, 12, 52], [48, 50, 52, 52]],
    arrows: [[26, 36, 17, 36], [38, 36, 47, 36]]
  },

  /* 坐姿髋内收：双膝向内夹，箭头朝内 */
  adduct: {
    gear: ['M8 55h48', 'M22 42h20v3h-20z', 'M32 45v10', 'M12 55v-26', 'M52 55v-26', 'M6 55h52'],
    plate: [[12, 26, 2.6], [52, 26, 2.6]],
    fig: ['M32 25 24 30', 'M32 25 40 30',
      'M30 40 21 42 20 50', 'M34 40 43 42 44 50'],
    torso: 'M32 20 32 38',
    head: [32, 15],
    shorts: [27, 40.5, 37, 40.5],
    shoes: [[20, 50, 16, 52], [44, 50, 48, 52]],
    arrows: [[19, 36, 27, 36], [45, 36, 37, 36]]
  },

  /* 站姿提踵：前脚掌踩台，脚踝向上顶 */
  calf: {
    gear: ['M33 47h20v8h-20z', 'M6 55h52'],
    fig: ['M29 23 33 31', 'M29 33 30 41 31 45.5', 'M30 34 32 42 33 46'],
    torso: 'M29 19 29 33',
    head: [29, 13],
    shorts: [26, 32, 32, 34],
    shoes: [[31, 45.5, 40, 47], [33, 46, 41, 47]],
    arrows: [[49, 44, 49, 35]]
  },

  /* 倒蹬机提踵：靠坐在倒蹬机上，只有前脚掌踩板，脚跟悬空，踝关节把踏板顶出去
     与 legpress 的区别：膝盖几乎伸直、只有脚尖接触踏板、箭头顺踏板方向朝外 */
  legpresscalf: {
    gear: ['M8 51h22', 'M12 51v4', 'M26 51v4', 'M44 21 50 33', 'M46 20 52 32', 'M6 55h52'],
    fig: ['M28 45 42 29', 'M28 45 44 33', 'M19 39 26 42 29 45'],
    torso: 'M16 46 28 46',
    head: [9.5, 40],
    shorts: [26.5, 45.5, 31, 47],
    shoes: [[42, 29, 46, 25], [44, 33, 48, 29]],
    arrows: [[35, 30, 42, 23]]
  },

  /* 臂力棒（弹簧棒）：双手分握两端，把中间带弹簧的钢棒向下弯成 V
     弯折点压到两腿之间靠下的位置，弹簧圈完全露出来；红色箭头标出手掌下压的方向 */
  powerbar: {
    gear: ['M9.5 29.5 26 47', 'M38 47 54.5 29.5',
      'M26 47q1.6-4.8 3.2 0q1.6 4.8 3.3 0q1.6-4.8 3.2 0q1.6 4.8 3.3 0'],
    fig: ['M31 22 24 26 12.5 29', 'M33 22 40 26 51.5 29',
      'M32 35 25 45.5 23.5 53', 'M32 35 39 45.5 40.5 53'],
    torso: 'M32 18 32 35',
    head: [32, 12.5],
    shorts: [28.5, 34, 35.5, 37.5],
    shoes: [[23.5, 53, 19, 54.5], [40.5, 53, 45, 54.5]],
    arrows: [[4.5, 17, 9.5, 30], [59.5, 17, 54.5, 30]]
  }
}

/* ------------------------------ 绘制工具 ------------------------------ */

/** 深色细轮廓 + 奶油色芯：贴近 ex-hangleg.png 的线稿人体 */
function tube(paths, w, core) {
  if (!paths.length) return ''
  const d = paths.join(' ')
  return '<path d="' + d + '" stroke="' + INK + '" stroke-width="' + w + '" fill="none"/>' +
    '<path d="' + d + '" stroke="' + SKIN + '" stroke-width="' + core + '" fill="none"/>'
}

/** 红色双向箭头：一条杆 + 两个实心三角头 */
function arrow(x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const L = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / L
  const uy = dy / L
  const px = -uy
  const py = ux
  const bend = Math.min(5.5, Math.max(2.8, L * 0.18))
  const cx = (x1 + x2) / 2 + px * bend
  const cy = (y1 + y2) / 2 + py * bend
  const head = Math.min(5.4, L * 0.32)
  const hw = head * 0.54
  const sx = x1 + ux * head
  const sy = y1 + uy * head
  const ex = x2 - ux * head
  const ey = y2 - uy * head
  const f = function (n) { return n.toFixed(2) }
  const tri = function (ax, ay, bx, by, cx, cy) {
    return 'M' + f(ax) + ' ' + f(ay) + 'L' + f(bx) + ' ' + f(by) + 'L' + f(cx) + ' ' + f(cy) + 'Z'
  }
  return '<path d="M' + f(sx) + ' ' + f(sy) + 'Q' + f(cx) + ' ' + f(cy) + ' ' + f(ex) + ' ' + f(ey) +
    '" stroke="' + HOT + '" stroke-width="' + (L > 13 ? 2.6 : 2.2) + '" stroke-linecap="round" fill="none"/>' +
    '<path d="' + tri(x2, y2, ex + px * hw, ey + py * hw, ex - px * hw, ey - py * hw) + '" fill="' + HOT + '"/>'
}

/* The reference character has a visibly broader shoulder line than waist. */
function shoulderBar(ic) {
  if (!ic.torso || !ic.head) return ''
  const m = String(ic.torso).match(/M\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/)
  if (!m) return ''
  const p1 = [Number(m[1]), Number(m[2])]
  const p2 = [Number(m[3]), Number(m[4])]
  const d1 = Math.hypot(p1[0] - ic.head[0], p1[1] - ic.head[1])
  const d2 = Math.hypot(p2[0] - ic.head[0], p2[1] - ic.head[1])
  const s = d1 < d2 ? p1 : p2
  const o = d1 < d2 ? p2 : p1
  const dx = s[0] - o[0]
  const dy = s[1] - o[1]
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const px = -dy / len
  const py = dx / len
  const half = 4.4
  const x1 = s[0] - px * half
  const y1 = s[1] - py * half
  const x2 = s[0] + px * half
  const y2 = s[1] + py * half
  return tube(['M' + x1.toFixed(2) + ' ' + y1.toFixed(2) + 'L' + x2.toFixed(2) + ' ' + y2.toFixed(2)], 6.6, 4.3)
}

function build(ic) {
  const gear = (ic.gear || []).filter(function (d) { return !/^M6 5[58]h52$/.test(d) }).join(' ')

  const plates = (ic.plate || []).map(function (p) {
    const r = p[2]
    return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + SKIN +
      '" stroke="' + INK + '" stroke-width="2.2"/>' +
      (r >= 3.6 ? '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.2" fill="' + INK + '"/>' : '')
  }).join('')

  const shorts = ic.shorts
    ? '<path d="M' + ic.shorts[0] + ' ' + ic.shorts[1] + 'L' + ic.shorts[2] + ' ' + ic.shorts[3] +
      '" stroke="' + INK + '" stroke-width="8" stroke-linecap="round" fill="none"/>'
    : ''

  const shoes = (ic.shoes || []).map(function (s) {
    return '<path d="M' + s[0] + ' ' + s[1] + 'L' + s[2] + ' ' + s[3] +
      '" stroke="' + INK + '" stroke-width="6.2" stroke-linecap="round" fill="none"/>'
  }).join('')

  const head = ic.head
    ? '<circle cx="' + ic.head[0] + '" cy="' + ic.head[1] + '" r="5.2" fill="' + SKIN +
      '" stroke="' + INK + '" stroke-width="2.3"/>'
    : ''

  const arrows = (ic.arrows || []).map(function (a) { return arrow(a[0], a[1], a[2], a[3]) }).join('')

  return (gear ? '<path d="' + gear + '" fill="none" stroke="' + INK +
    '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
    plates +
    '<g stroke-linecap="round" stroke-linejoin="round">' + tube(ic.fig || [], 5.9, 3.7) + '</g>' +
    '<g stroke-linecap="round" stroke-linejoin="round">' +
    (ic.torso ? tube([ic.torso], 8.2, 5.6) : '') + '</g>' +
    '<g stroke-linecap="round" stroke-linejoin="round">' + shoulderBar(ic) + '</g>' +
    head + arrows
}

function svg(key) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + build(ICONS[key]) + '</svg>'
}

/* ------------------------------ 输出 ------------------------------ */

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

const keys = Object.keys(ICONS)

keys.forEach(function (k) {
  const s = svg(k)
  fs.writeFileSync(path.join(OUT, k + '.svg'), s)
  fs.writeFileSync(path.join(TMP, k + '.html'),
    '<!doctype html><meta charset="utf-8">' +
    '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;border-radius:44px}' +
    'body{background:#FFFFFF}' +
    'svg{display:block;width:144px;height:144px}</style>' + s)
})

const sheet = keys.map(function (k) {
  return '<div class="cell"><div class="chip"><div class="s">' + svg(k) +
    '</div></div><div class="big">' + svg(k) + '</div><div class="k">' + k + '</div></div>'
}).join('')

fs.writeFileSync(path.join(TMP, 'sheet.html'),
  '<!doctype html><meta charset="utf-8"><style>' +
  'body{margin:0;background:#FAF8EF;font:11px/1.4 -apple-system,system-ui,sans-serif;color:#3A2F00;' +
  'display:flex;flex-wrap:wrap;gap:6px;padding:12px}' +
  '.cell{width:104px;text-align:center}' +
  '.chip{width:64px;height:64px;border-radius:16px;background:#FFF3C9;display:flex;align-items:center;justify-content:center;margin:0 auto}' +
  '.s svg{width:46px;height:46px;display:block}' +
  '.big svg{width:104px;height:104px;display:block}' +
  '.k{color:#8A8378;margin-top:2px}</style>' + sheet)

console.log('icons:', keys.length, keys.join(','))
