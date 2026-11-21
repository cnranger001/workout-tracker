/**
 * 给「单杠提腿」图标加一层白底圆角衬底
 *
 * 背景：这张图是用户上传的位图（奶白填充 + 黑描边），直接放在浅金 #FFF3C9 的
 *      图标底衬上，躯干和底色太接近，小尺寸下偏淡。给这一张单独垫一块白色圆角板，
 *      拉开图与底色的对比，其余 22 个矢量图标不动。
 *
 * 用法：node tools/plate-icon.js
 *   读 tools/art/hangleg-plain.png（用户上传原图的母版，不要动它）
 *   写 images/ex-hangleg.png（144×144 透明底，与其它图标同规格）
 *
 * 依赖：python + Pillow（仅本地生成用，不参与小程序打包）
 */

const { execFileSync } = require('child_process')
const path = require('path')

const SRC = path.join(__dirname, 'art', 'hangleg-plain.png')
const OUT = path.join(__dirname, '..', 'images', 'ex-hangleg.png')

const SIZE = 144          // 与其余图标一致的画布边长
const RADIUS = 44         // 白板圆角；再大杠铃两端会顶到圆角切线
const ART_SCALE = 0.93    // 图形占画布比例；保留约 3px 白边，圆角处不会碰图
const PLATE = '#FFFFFF'   // 白板颜色

const py = `
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
S, R, scale = ${SIZE}, ${RADIUS}, ${ART_SCALE}

art = Image.open(src).convert('RGBA')
canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(canvas)
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=R, fill='${PLATE}')

size = int(round(S * scale))
piece = art.resize((size, size), Image.LANCZOS)
off = (S - size) // 2
canvas.alpha_composite(piece, (off, off))
canvas.save(out)

box = canvas.getchannel('A').getbbox()
print('wrote', out, canvas.size, 'content', box)
`

execFileSync('python', ['-c', py, SRC, OUT], { stdio: 'inherit' })
