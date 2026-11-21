/**
 * 从 utils/theme.js 生成 app.wxss 里的主题变量
 *
 *   node tools/gen-theme-css.js
 *
 * WXSS 不支持运行时改变量，所以六套配色必须以 .theme-xxx 类的形式写死在 app.wxss。
 * 为了让「theme.js 是唯一数据源」，这里按 theme.js 重新生成那两段：
 *   page { ... } 里的默认值（柠檬黄）
 *   .theme-lemon / .theme-sky / ... 六个类
 * 改了配色只要重跑本脚本，样式和 Canvas 取色不会走岔。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const T = require(path.join(ROOT, 'utils/theme.js'))

const ALPHAS = [85, 62, 55, 45, 35, 16]

/** 一套主题 → 一串 CSS 声明 */
function decls(t, indent) {
  const pad = indent || '  '
  const lines = [
    ['--brand', t.brand],
    ['--brand-2', t.brand2],
    ['--brand-deep', t.brandDeep],
    ['--brand-text', t.brandText],
    ['--brand-ink', t.brandInk],
    ['--brand-soft', t.brandSoft],
    ['--brand-soft-2', t.brandSoft2],
    ['--brand-shadow', T.rgba(t.brandDeep, 0.32)],
    ['--bg', t.bg],
    ['--card', t.card],
    ['--line', t.line],
    ['--text-1', t.text1],
    ['--text-2', t.text2],
    ['--text-3', t.text3],
    ['--arrow', t.arrow],
    ['--fill', t.fill],
    ['--fill-2', t.fill2]
  ]

  ALPHAS.forEach(function (a) {
    lines.push(['--ink-' + a, T.rgba(t.brandInk, a / 100)])
  })

  return lines
    .map(function (kv) {
      return pad + kv[0] + ': ' + kv[1] + ';'
    })
    .join('\n')
}

function build() {
  const def = T.byId(T.DEFAULT_ID)

  const defaultBlock =
    '  /* 默认 = ' + def.name + '（没设置过主题时的兜底，与 .theme-' + def.id + ' 完全一致） */\n' +
    decls(def, '  ')

  const classes = T.THEMES.map(function (t) {
    return (
      '.theme-' + t.id + ' {   /* ' + t.name + ' · ' + t.hint + ' */\n' +
      decls(t, '  ') +
      '\n}'
    )
  }).join('\n\n')

  return { defaultBlock: defaultBlock, classes: classes }
}

function replaceRegion(src, name, body) {
  const start = '/* @' + name + ':start */'
  const end = '/* @' + name + ':end */'
  const i = src.indexOf(start)
  const j = src.indexOf(end)
  if (i < 0 || j < 0) {
    throw new Error('app.wxss 里找不到 ' + start + ' / ' + end + ' 标记')
  }
  /* 保留结束标记前面的缩进（默认值那段是在 page { } 里面） */
  const lineStart = src.lastIndexOf('\n', j) + 1
  const indent = src.slice(lineStart, j)

  return src.slice(0, i + start.length) + '\n' + body + '\n' + indent + src.slice(j)
}

const file = path.join(ROOT, 'app.wxss')
const css = fs.readFileSync(file, 'utf8')
const built = build()

let next = replaceRegion(css, 'theme-default', built.defaultBlock)
next = replaceRegion(next, 'theme-classes', built.classes)

fs.writeFileSync(file, next)

console.log('主题数量:', T.THEMES.length, '→', T.THEMES.map(function (t) { return t.id }).join(' / '))
console.log('已写入 app.wxss（' + next.split('\n').length + ' 行）')
