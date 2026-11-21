/**
 * 分享卡上那句俏皮话
 *
 * 取文案的顺序（每一步失败都往下掉，拿不到就留空，不再写本地兜底）：
 *   1. 本地缓存 —— 同一天同一训练量只生成一次，重进页面不换词
 *   2. 云开发 AI+（wx.cloud.extend.AI）—— 不用自己买 API key，走云开发环境额度
 *   3. 云函数 cloud/caption —— 只有自己配了 AI_KEY 才会真的生成，没配就返回 ok:false
 *
 * 基础库 < 3.15.1 时 wx.cloud.extend.AI 不存在，会静默跳过第 2 步。
 */

const CACHE_KEY = 'workout_caption_v1'
const CLOUD_FN = 'caption'
const MAX_LEN = 24
const WAIT_MS = 5000

/**
 * 云开发 AI+ 的模型，按顺序试，第一个出词的记住（存本地，下次直接用）。
 * 环境里开了哪个只有控制台知道，所以不写死单个：
 *   hy4-preview        混元 4，AI+ 里最先开放的一批
 *   deepseek-v4-flash  平台主推默认款
 *   hunyuan-exp        老基础库时期唯一免费的体验模型
 * 在控制台「AI → 生文模型」里看到别的名字，加到最前面即可。
 */
const MODEL_KEY = 'workout_caption_model_v1'
const AI_MODELS = ['hy4-preview', 'deepseek-v4-flash', 'hunyuan-exp']

/* 分享卡不再出现「今日相当于……」这类字眼：缓存、旧分享链接、模型输出都统一洗掉 */
function stripEquivalent(text) {
  return String(text || '')
    .replace(/(?:今日|今天)相当于/g, '')
    .replace(/^[，,、\s]+/, '')
    .trim()
}

/** 模型偶尔还会写成「训练量相当于一头鲸鱼」，这种整句丢掉，不再补写文案 */
function hasEquivalent(text) {
  return /相当于/.test(String(text || ''))
}

/**
 * 文案里的类比物 -> 卡通图。
 * 顺序有意义：先匹配更具体的词（「火车」不能落到「车」上）。
 * 这里没有的物件就返回 ''，海报上不画图，文案占满整行。
 * 「象」（大象）按需求不配图：文案照旧会说大象，但不出图。
 */
const QUIP_WORDS = [
  { key: 'train', words: ['火车', '高铁', '列车', '地铁', '机车'] },
  { key: 'whale', words: ['鲸', '鱼'] },
  { key: 'cow', words: ['牛'] },
  { key: 'piano', words: ['钢琴'] },
  { key: 'fridge', words: ['冰箱'] },
  { key: 'bottle', words: ['桶装水', '水桶', '水'] },
  { key: 'car', words: ['汽车', '轿车', '卡车', '车'] }
]

/** 从一句文案里认出类比物，返回 images/quip-<key>.png 的 key，认不出返回 '' */
function iconOf(text) {
  const t = String(text || '')
  if (!t) return ''
  for (let i = 0; i < QUIP_WORDS.length; i++) {
    const words = QUIP_WORDS[i].words
    for (let j = 0; j < words.length; j++) {
      if (t.indexOf(words[j]) >= 0) return QUIP_WORDS[i].key
    }
  }
  return ''
}

/** 喂给模型的提示词（云函数里有一份同样的，云函数是独立部署单元不好复用） */function buildPrompt(info) {
  const kg = Math.round(Number(info && info.kg) || 0)
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
    '- 完成组数：' + (Number(info.sets) || 0) + ' 组',
    '- 项目数：' + (Number(info.count) || 0) + ' 个'
  ].join('\n')
}

/** 模型偶尔会带引号、换行、前缀，这里洗一遍 */
function tidy(text) {
  let t = String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/^(这句话|文案|回答)[:：]\s*/, '')
    .trim()
  t = stripEquivalent(t)
  if (hasEquivalent(t)) return ''
  if (t.length > MAX_LEN) t = t.slice(0, MAX_LEN)
  return t
}

function keyOf(info) {
  return String(info.date || '') + '|' + Math.round(Number(info.kg) || 0)
}

function readCache() {
  try {
    const v = wx.getStorageSync(CACHE_KEY)
    return v && typeof v === 'object' ? v : {}
  } catch (e) {
    return {}
  }
}

function writeCache(map) {
  try {
    wx.setStorageSync(CACHE_KEY, map)
  } catch (e) {}
}

/** 只留最近 30 条，别让缓存无限长 */
function save(info, text) {
  const map = readCache()
  map[keyOf(info)] = { t: text, ts: Date.now() }
  const keys = Object.keys(map)
  if (keys.length > 30) {
    keys.sort(function (a, b) { return (map[a].ts || 0) - (map[b].ts || 0) })
    keys.slice(0, keys.length - 30).forEach(function (k) { delete map[k] })
  }
  writeCache(map)
}

function cloudReady() {
  try {
    const app = getApp()
    return !!(app && app.globalData && app.globalData.cloudReady && wx.cloud)
  } catch (e) {
    return false
  }
}

/* ---------------- 通道 A：云开发 AI+（无需 API key） ---------------- */

function aiModel() {
  try {
    if (!cloudReady() || !wx.cloud.extend || !wx.cloud.extend.AI) return null
    const ai = wx.cloud.extend.AI
    if (typeof ai.createModel !== 'function') return null
    return ai.createModel('cloudbase')
  } catch (e) {
    return null
  }
}

/**
 * 走云开发环境自带的大模型额度。
 * 基础库 < 3.15.1、环境没开 AI+、模型名不对 —— 都返回 ''，由上层往下掉。
 */
function askCloudAI(info) {
  /* SDK 在参数不对时可能同步抛错（不是 reject），必须整体包住，
     否则会把异常抛到页面生命周期里，分享页直接白屏 */
  try {
    return askCloudAI0(info)
  } catch (e) {
    return Promise.resolve('')
  }
}

function askCloudAI0(info) {
  const model = aiModel()
  if (!model) {
    warnOnce('wx.cloud.extend.AI 不可用（基础库 < 3.15.1 或未开云开发），文案留空')
    return Promise.resolve('')
  }
  const messages = [
    { role: 'system', content: '你很会写短句，只输出一句话本身。' },
    { role: 'user', content: buildPrompt(info) }
  ]

  /* 上次成功的模型排最前，省掉一轮 model not found 的往返 */
  const list = [readModel()].concat(AI_MODELS).filter(function (m, i, arr) {
    return m && arr.indexOf(m) === i
  })

  const tryAt = function (i) {
    if (i >= list.length) {
      warnOnce('云开发 AI 没出词（模型未开通 / 基础库 < 3.15.1 / 未开 AI+），文案留空')
      return Promise.resolve('')
    }
    const id = list[i]
    let p
    /* 参数不对时 generateText 可能同步抛错，不能让它中断整条链 */
    try {
      p = once(model, id, messages)
    } catch (e) {
      p = Promise.resolve('')
    }
    return p.then(
      function (text) {
        if (!text) return tryAt(i + 1)
        writeModel(id)
        return text
      },
      function () {
        return tryAt(i + 1)
      }
    )
  }

  return tryAt(0)
}

/** 用某个模型要一次，拿不到就返回 ''（换下一个模型再试） */
function once(model, id, messages) {
  /* 两种入参风格 SDK 版本间有差异，都带上，各取所需 */
  const args = { model: id, messages: messages, data: { model: id, messages: messages } }

  /* 非流式最省事；没有 generateText 的老版本退到 streamText 拼接 */
  if (typeof model.generateText === 'function') {
    return model.generateText(args).then(function (res) { return tidy(res && res.text) })
  }
  if (typeof model.streamText !== 'function') return Promise.resolve('')

  return model.streamText(args).then(function (res) {
    const stream = res && res.textStream
    if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') return ''
    const it = stream[Symbol.asyncIterator]()
    let buf = ''
    const step = function () {
      return it.next().then(function (r) {
        if (r.done) return tidy(buf)
        buf += r.value
        /* 已经够长就不用再等了 */
        if (buf.length >= MAX_LEN) return tidy(buf)
        return step()
      })
    }
    return step()
  })
}

function readModel() {
  try {
    return String(wx.getStorageSync(MODEL_KEY) || '')
  } catch (e) {
    return ''
  }
}

/* 降级不打扰用户，但在开发者工具控制台留一句，方便判断到底是哪一环没通 */
let warned = false
function warnOnce(msg) {
  if (warned) return
  warned = true
  try {
    console.warn('[caption]', msg)
  } catch (e) {}
}

function writeModel(id) {
  try {
    if (readModel() !== id) wx.setStorageSync(MODEL_KEY, id)
  } catch (e) {}
}

/* ---------------- 通道 B：云函数（自己配了 AI_KEY 才有用） ---------------- */

function askFunction(info) {
  if (!cloudReady() || !wx.cloud.callFunction) return Promise.resolve('')
  return new Promise(function (resolve) {
    wx.cloud.callFunction({
      name: CLOUD_FN,
      data: {
        kg: Math.round(Number(info.kg) || 0),
        sets: Number(info.sets) || 0,
        count: Number(info.count) || 0
      },
      success(res) {
        const r = (res && res.result) || {}
        resolve(r.ok ? tidy(r.text) : '')
      },
      fail() {
        resolve('')
      }
    })
  })
}

/** 两条远程通道依次尝试，任何一个给出文案就返回 */
function remote(info) {
  return askCloudAI(info)
    .catch(function () { return '' })
    .then(function (text) {
      if (text) return text
      return askFunction(info).catch(function () { return '' })
    })
}

/**
 * 取文案
 * @param {{date:string, kg:number, sets:number, count:number}} info
 * @param {(text:string, source:'ai'|'cache'|'none')=>void} cb
 */
function get(info, cb) {
  info = info || {}
  const key = keyOf(info)
  const hit = readCache()[key]
  if (hit && hit.t) {
    if (!hasEquivalent(hit.t)) {
      cb(hit.t, 'cache')
      return
    }
    /* 旧缓存里带着过时字眼，删掉重新要一句 */
    const map = readCache()
    delete map[key]
    writeCache(map)
  }

  let done = false
  const finish = function (text, source) {
    if (done) return
    done = true
    cb(text, source)
  }
  /* 拿不到文案就交空串，由页面决定不画这一块；远端后来补上还能再回填 */
  const empty = function () { cb('', 'none') }

  if (!(Number(info.kg) > 0)) {
    empty()
    return
  }

  const timer = setTimeout(empty, WAIT_MS)

  remote(info).then(
    function (text) {
      clearTimeout(timer)
      if (!text) {
        empty()
        return
      }
      save(info, text)
      finish(text, 'ai')
    },
    function () {
      clearTimeout(timer)
      empty()
    }
  )
}

/** 丢掉某一天的缓存（点「重新生成」时用，让模型重新想一句） */
function forget(info) {
  const map = readCache()
  const k = keyOf(info || {})
  if (map[k]) {
    delete map[k]
    writeCache(map)
  }
}

module.exports = {
  get: get,
  clean: stripEquivalent,
  hasEquivalent: hasEquivalent,
  forget: forget,
  iconOf: iconOf
}
