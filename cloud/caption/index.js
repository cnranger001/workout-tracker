const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/* ============================================================
   分享卡上那句俏皮话（AI 生成）
   需要一个「OpenAI 兼容」的对话接口，密钥放云函数环境变量里，
   绝对不要写到小程序代码里（端上能被反编译看到）。

   云开发控制台 → 云函数 → caption → 版本与配置 → 环境变量：
     AI_BASE_URL  https://api.deepseek.com/v1/chat/completions
     AI_KEY       sk-xxxx
     AI_MODEL     deepseek-chat
   ============================================================ */

const BASE = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1/chat/completions'
const KEY = process.env.AI_KEY || ''
const MODEL = process.env.AI_MODEL || 'deepseek-chat'

const TIMEOUT = 6000
const MAX_LEN = 24

/** 把练习数据说清楚，模型才知道该拿什么做类比 */
function buildPrompt(s) {
  const kg = Math.round(Number(s.kg) || 0)
  const ton = (kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 3).replace(/0+$/, '').replace(/\.$/, '')
  return [
    '你是健身小程序里写分享文案的人。',
    '根据今天的训练总量，写一句给本人看的中文短句，18 个字以内。',
    '要求：',
    '1. 用一个具体的物体做类比，比如「挪动了一条鲸鱼」；',
    '2. 语气俏皮、鼓励，不喊口号、不用感叹号堆砌、不加引号、不加表情；',
    '3. 只说一句话，不要解释，不要换行；',
    '4. 不要出现「相当于」「今日相当于」「今天相当于」这类字眼。',
    '',
    '今天的数据：',
    '- 训练总量：' + kg + ' kg（约 ' + ton + ' 吨）',
    '- 完成组数：' + (Number(s.sets) || 0) + ' 组',
    '- 项目数：' + (Number(s.count) || 0) + ' 个'
  ].join('\n')
}

function post(url, body) {
  return new Promise(function (resolve, reject) {
    let u
    try {
      u = new URL(url)
    } catch (e) {
      reject(e)
      return
    }
    const payload = JSON.stringify(body)
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: 'Bearer ' + KEY
        },
        timeout: TIMEOUT
      },
      function (res) {
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', function (c) { raw += c })
        res.on('end', function () {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error('HTTP ' + res.statusCode + ' ' + raw.slice(0, 200)))
            return
          }
          try {
            resolve(JSON.parse(raw))
          } catch (e) {
            reject(new Error('返回不是 JSON'))
          }
        })
      }
    )
    req.on('timeout', function () {
      req.destroy(new Error('超时'))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/** 模型偶尔会带引号、换行、前缀，这里洗一遍 */
function tidy(text) {
  let t = String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/^(这句话|文案|回答)[:：]\s*/, '')
    .trim()
  t = t.replace(/(?:今日|今天)相当于/g, '').replace(/^[，,、\s]+/, '').trim()
  if (/相当于/.test(t)) return ''
  if (t.length > MAX_LEN) t = t.slice(0, MAX_LEN)
  return t
}

exports.main = async (event) => {
  event = event || {}
  const kg = Math.round(Number(event.kg) || 0)

  /* 没配密钥就直接告诉端上留空，不报错 */
  if (!KEY) return { ok: false, reason: '未配置 AI_KEY' }
  if (kg <= 0) return { ok: false, reason: '没有训练量' }

  try {
    const res = await post(BASE, {
      model: MODEL,
      messages: [
        { role: 'system', content: '你很会写短句，只输出一句话本身。' },
        { role: 'user', content: buildPrompt(event) }
      ],
      temperature: 1.1,
      max_tokens: 80
    })

    const choice = res && res.choices && res.choices[0]
    const text = tidy(choice && choice.message && choice.message.content)
    if (!text) return { ok: false, reason: '模型没有返回内容' }
    return { ok: true, text: text }
  } catch (e) {
    return { ok: false, reason: (e && e.message) || '请求失败' }
  }
}
