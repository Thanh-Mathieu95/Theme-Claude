// 12 cảnh pixel 320x180 tự vẽ. Mỗi cảnh là một hàm draw() trả về chuỗi SVG.
// Các ô liền nhau cùng màu gộp thành một <path> để chuỗi gọn (giới hạn 131.072 ký tự).

const W = 320
const H = 180

let seed = 1
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
const pick = list => list[int(0, list.length - 1)]

// ── Bảng vẽ: giữ thứ tự (cái sau đè cái trước) ─────────────────────────────
let parts = []
let runs = []
const paths = () => runs.map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
const flush = () => {
  parts.push(paths())
  runs = []
}
const put = (c, x, y, w = 1, h = 1) => {
  if (w <= 0 || h <= 0) return
  const d = `M${x} ${y}h${w}v${h}h${-w}z`
  const last = runs[runs.length - 1]
  if (last && last[0] === c) last[1] += d
  else runs.push([c, d])
}
// Nhóm có chuyển động: tw nhấp nháy, dr trôi ngang, fa rơi, pu thở sáng tối
const group = (cls, style, fn) => {
  flush()
  fn()
  parts.push(`<g class="${cls}"${style ? ` style="${style}"` : ''}>${paths()}</g>`)
  runs = []
}
const CSS =
  '.tw{animation:tw 4s steps(2) infinite}@keyframes tw{50%{opacity:.15}}' +
  '.dr{animation:dr 90s steps(40) infinite alternate}@keyframes dr{to{transform:translateX(10px)}}' +
  '.fa{animation:fa 14s linear infinite}@keyframes fa{to{transform:translateY(180px)}}' +
  '.pu{animation:pu 7s ease-in-out infinite alternate}@keyframes pu{to{opacity:.45}}' +
  '@media (prefers-reduced-motion:reduce){.tw,.dr,.fa,.pu{animation:none}}'
const scene = (s, fn) => () => {
  seed = s
  parts = []
  runs = []
  fn()
  flush()
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges"><style>${CSS}</style>${parts.join('')}</svg>`
}

// ── Nét vẽ dùng chung ─────────────────────────────────────────────────────
const bands = (colors, y0, y1) => {
  const h = (y1 - y0) / colors.length
  colors.forEach((c, i) => {
    const a = Math.round(y0 + i * h)
    put(c, 0, a, W, Math.round(y0 + (i + 1) * h) - a)
  })
}
const disc = (c, cx, cy, r) => {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy))
    put(c, cx - w, cy + dy, 2 * w, 1)
  }
}
const dots = (n, x0, x1, y0, y1, colors, wMax = 1, h = 1) => {
  for (let i = 0; i < n; i++) put(pick(colors), int(x0, x1), int(y0, y1), int(1, wMax), h)
}
const twinkle = (n, x0, x1, y0, y1, colors, wMax = 1) =>
  [0, 1.3, 2.6].forEach(d => group('tw', `animation-delay:${d}s`, () => dots(n, x0, x1, y0, y1, colors, wMax)))
const clouds = (spots, top, shade) =>
  group('dr', '', () => {
    for (const [cx, cy, n, spread] of spots) {
      for (let i = 0; i < n; i++) {
        const x = cx + int(0, spread)
        const y = cy + int(0, 7)
        const w = int(6, 18)
        const h = int(3, 6)
        put(shade, x, y + 1, w, h)
        put(top, x, y, w, h - 1)
      }
    }
  })
const streaks = (n, y0, y1, colors) => {
  for (let i = 0; i < n; i++) put(pick(colors), int(-10, 300), int(y0, y1), int(14, 44), int(1, 2))
}
// Đồi lượn sóng; trả về độ cao đỉnh theo từng x
const ridge = (color, base, amp, { f = 1, rough = 2, bottom = H } = {}) => {
  const p1 = rnd() * 6.28
  const p2 = rnd() * 6.28
  const tops = []
  for (let x = 0; x < W; x += 2) {
    const wave = (0.6 * Math.sin((x / W) * 6.28 * f + p1) + 0.4 * Math.sin((x / W) * 17 * f + p2) + 1) / 2
    const t = Math.round(base - amp * wave - rnd() * rough)
    put(color, x, t, 2, bottom - t)
    tops[x] = tops[x + 1] = t
  }
  return tops
}
// Núi nhọn: list = [đỉnh x, cao, nửa chân]; cap = màu tuyết
const peaks = (color, base, list, { cap, capFrac = 0.35, bottom = H } = {}) => {
  const cols = []
  for (let x = 0; x < W; x += 2) {
    let best = 0
    let full = 1
    for (const [cx, h, half] of list) {
      const v = h * (1 - Math.abs(x - cx) / half)
      if (v > best) {
        best = v
        full = h
      }
    }
    const t = Math.round(base - best - rnd() * 2)
    cols.push([x, t, Math.round(best - full * (1 - capFrac) - rnd() * 3)])
    put(color, x, t, 2, bottom - t)
  }
  if (cap) for (const [x, t, snow] of cols) put(cap, x, t, 2, snow)
}
const pine = (c, x, base, h) => {
  for (let j = 0; j < h - 2; j++) {
    const w = Math.floor(((j % 4) + j / 2) / 1.6)
    put(c, x - w, base - h + j, 2 * w + 1, 1)
  }
  put(c, x, base - 2, 1, 2)
}
const pines = (n, xs, baseOf, hMin, hMax, colors) => {
  const list = Array.from({ length: n }, () => {
    const x = int(...pick(xs))
    return [x, baseOf(x), int(hMin, hMax)]
  }).sort((a, b) => a[1] - b[1])
  for (const [x, base, h] of list) pine(pick(colors), x, base, h)
}
const palm = (c, x, base, h) => {
  let tx = x
  for (let j = 0; j < h; j++) {
    tx = x + Math.round(Math.sin((j / h) * 1.5) * 4)
    put(c, tx, base - j, 2, 1)
  }
  const ty = base - h
  for (const [dx, curve] of [[1, 7], [-1, 7], [1, 14], [-1, 14], [1, 40], [-1, 40]]) {
    for (let k = 0; k < 14; k++) put(c, tx + dx * k, ty - 3 + Math.round((k * k) / curve), 2, k < 9 ? 2 : 1)
  }
}
const birds = (c, list) => {
  for (const [x, y] of list) {
    put(c, x, y, 2, 1)
    put(c, x + 2, y + 1, 1, 1)
    put(c, x + 3, y, 2, 1)
  }
}
// Dãy nhà dạng bóng, cửa sổ sáng đèn. Trả về [x, rộng, cao] từng toà.
const skyline = (base, { hMin, hMax, wMin = 6, wMax = 16, wall, lit = [], litP = 0.3, roof }) => {
  const bs = []
  for (let x = -int(0, 4); x < W; ) {
    const w = int(wMin, wMax)
    bs.push([x, w, int(hMin, hMax)])
    x += w + int(-2, 0)
  }
  for (const [x, w, h] of bs) {
    const c = pick(wall)
    put(c, x, base - h, w, h + 1)
    if (h > hMax * 0.75 && w > 7) {
      put(c, x + 2, base - h - 3, w - 4, 3)
      put(c, x + (w >> 1), base - h - 8, 1, 5)
    }
  }
  if (roof) for (const [x, w, h] of bs) put(roof, x, base - h, w, 1)
  for (const c of lit) {
    for (const [x, w, h] of bs) {
      for (let wy = base - h + 3; wy < base - 2; wy += 3) {
        for (let wx = x + 1; wx < x + w - 1; wx += 2) {
          if (rnd() < litP / lit.length) put(c, wx, wy, 1, 2)
        }
      }
    }
  }
  return bs
}
// Toà nhà ban ngày: mặt sáng, mặt khuất, mái, cửa sổ
const STYLES = [
  ['#ffffff', '#c3d4e8', '#5b8fd0', '#e6eef8'],
  ['#eaf2fb', '#b4c8e0', '#4f7fc0', '#ffffff'],
  ['#f6e7cc', '#d6bd94', '#a8794a', '#fff6e2'],
  ['#6fa8e8', '#4a82cc', '#d4eaff', '#9cc6f4'],
  ['#58c4d0', '#3a9aa8', '#d8f6f8', '#8adce4'],
  ['#f2b8a0', '#d08e78', '#8a4a3a', '#fbd6c6'],
  ['#d9e3ee', '#a9b9cc', '#3f6aa8', '#f2f6fa'],
]
const tower = (x, base, w, h) => {
  const [wall, shade, glass, roof] = pick(STYLES)
  const top = base - h
  const side = Math.max(1, Math.round(w / 3))
  const face = w - side
  put(wall, x, top, face, h)
  put(shade, x + face, top, side, h)
  put(roof, x, top, w, 1)
  if (h > 18 && w > 5) {
    put(wall, x + 1, top - 3, face - 1, 3)
    put(shade, x + face, top - 3, side - 1 || 1, 3)
    put(roof, x + 1, top - 3, w - 2, 1)
    if (rnd() < 0.5) put(shade, x + (w >> 1), top - 7, 1, 4)
  }
  if (rnd() < 0.5) for (let y = top + 2; y < base - 1; y += 2) put(glass, x + 1, y, face - 2, 1)
  else for (let cx = x + 1; cx < x + face - 1; cx += 2) put(glass, cx, top + 2, 1, h - 3)
  put(shade, x, base - 1, w, 1)
}
// Hạt rơi (tuyết, mưa, cánh hoa): lặp lại sau đúng một màn hình
const falling = (n, colors, style, w = 1, h = 1) =>
  group('fa', style, () => {
    for (let i = 0; i < n; i++) {
      const c = pick(colors)
      const x = int(0, W - 1)
      const y = int(0, H - 1)
      put(c, x, y, w, h)
      put(c, x, y - H, w, h)
    }
  })

// ── Phong cảnh ────────────────────────────────────────────────────────────
const hoNui = scene(21, () => {
  bands(['#2a7fd8', '#3a8fe0', '#4d9fe8', '#66b0ee', '#84c2f3', '#a6d5f7', '#c6e5fa'], 0, 86)
  clouds([[6, 6, 10, 60], [230, 10, 12, 70], [130, 28, 4, 40]], '#ffffff', '#d9eafa')
  peaks('#8fa9cf', 88, [[40, 42, 60], [112, 60, 70], [192, 50, 65], [262, 64, 75], [322, 40, 50]], { cap: '#ffffff' })
  peaks('#5f7fae', 92, [[0, 30, 50], [80, 26, 45], [152, 22, 50], [232, 30, 55], [302, 34, 50]], { cap: '#eef5fc', capFrac: 0.25 })
  ridge('#2f6b4a', 96, 6, { bottom: 99 })
  bands(['#3f9bd6', '#4aa6dc', '#58b2e2', '#6cc0e8', '#86cfee'], 98, 166)
  dots(30, 0, 319, 100, 112, ['#6f8fc0', '#9db6dc', '#ffffff'], 8)
  twinkle(16, 0, 319, 104, 150, ['#ffffff'], 2)
  const g = ridge('#3d8f4a', 160, 10)
  dots(60, 0, 319, 164, 178, ['#56a85a', '#2f7a40', '#f6e27a', '#ffffff'], 2)
  pines(30, [[0, 105], [215, 319]], x => g[x] + int(6, 16), 16, 34, ['#1f5a35', '#256a3c', '#1a4c2e'])
})

const hoangHonBien = scene(5, () => {
  bands(['#3b2a6e', '#5a3080', '#8a3a8a', '#b8487e', '#de5f6e', '#f47f5a', '#fba24e', '#fdc35a', '#fee08a'], 0, 106)
  streaks(12, 18, 84, ['#7a3a88', '#a04a86', '#f6a070', '#ffc98a'])
  disc('#ffd76a', 160, 102, 20)
  disc('#fff1b8', 160, 102, 16)
  bands(['#c8506e', '#a8447a', '#84407e', '#643a7c', '#4a3274', '#38286a'], 106, 166)
  for (let y = 107; y < 152; y += 2) {
    const w = int(6, 22)
    put('#ffd76a', 160 - (w >> 1) + int(-3, 3), y, w, 1)
  }
  twinkle(12, 100, 220, 108, 150, ['#fff1b8'], 3)
  ridge('#2a1c3a', 160, 5, { rough: 1 })
  for (const [x, base, h] of [[38, 170, 50], [62, 174, 36], [268, 168, 54], [294, 174, 34]]) palm('#1c1228', x, base, h)
  birds('#3b2a6e', [[96, 44], [108, 50], [210, 36], [224, 42], [236, 38]])
})

const rungSuong = scene(9, () => {
  bands(['#cfe3d6', '#d8e9db', '#e2efe0', '#ebf3e4', '#f2f6e8'], 0, 72)
  disc('#fffbe6', 222, 40, 12)
  group('dr', 'animation-duration:40s', () => birds('#7fa594', [[60, 30], [72, 36], [84, 28]]))
  ;['#b4cfc0', '#8fb4a2', '#659683', '#3f7563', '#235645'].forEach((c, i) => {
    const base = 74 + i * 22
    const g = ridge(c, base, 12, { rough: 1, f: 1 + i * 0.3 })
    pines(34, [[0, 319]], x => g[x] + 3, 9 + i * 4, 15 + i * 7, [c])
    group('pu', `animation-delay:${i * 1.5}s`, () => {
      put('#ffffff44', 0, base + 8, W, 5)
      put('#ffffff22', 0, base + 4, W, 4)
    })
  })
  const g = ridge('#163c30', 176, 5, { rough: 1 })
  pines(12, [[0, 70], [250, 319]], x => g[x] + 6, 36, 60, ['#163c30', '#103026'])
})

const saMac = scene(14, () => {
  bands(['#27467a', '#4a5c94', '#8a6aa0', '#c97f95', '#f09a7a', '#f8b870', '#fcd88a'], 0, 104)
  dots(26, 0, 319, 0, 30, ['#ffffff', '#d8dcff'])
  twinkle(8, 0, 319, 0, 34, ['#ffffff'])
  group('dr', '', () => streaks(5, 40, 70, ['#d890a0', '#f6b890']))
  disc('#ffdf9a', 232, 80, 16)
  disc('#fff0c0', 232, 80, 13)
  for (const [x, w, h] of [[26, 44, 36], [124, 26, 24], [248, 54, 42]]) {
    put('#b0586a', x, 104 - h, w, h)
    put('#b0586a', x - 4, 104 - (h >> 1), w + 8, h >> 1)
    put('#8e4660', x + Math.round(w * 0.65), 104 - h, Math.round(w * 0.35), h)
    put('#c8707a', x, 104 - h, w, 1)
  }
  put('#e89a54', 0, 104, W, H - 104)
  ridge('#e89a54', 114, 10, { rough: 0 })
  ridge('#d67c42', 130, 12, { rough: 0, f: 1.5 })
  ridge('#b05c32', 148, 12, { rough: 0 })
  ridge('#7a3a26', 166, 10, { rough: 0, f: 2 })
  for (const [x, base, h] of [[48, 172, 28], [92, 178, 16], [238, 174, 32], [286, 180, 18], [172, 180, 12]]) {
    const c = '#22403a'
    const a = Math.round(h * 0.45)
    put(c, x, base - h, 3, h)
    put(c, x - 4, base - a, 4, 2)
    put(c, x - 4, base - a - Math.round(h * 0.3), 2, Math.round(h * 0.3))
    put(c, x + 3, base - a - 3, 4, 2)
    put(c, x + 5, base - a - 3 - Math.round(h * 0.25), 2, Math.round(h * 0.25))
  }
})

const cucQuang = scene(33, () => {
  bands(['#050a1e', '#08102a', '#0b1736', '#0e2042', '#122a4c', '#163452'], 0, 112)
  dots(90, 0, 319, 0, 100, ['#ffffff', '#bcd4ff'])
  twinkle(14, 0, 319, 0, 90, ['#ffffff'])
  for (const [shift, delay] of [[0, 0], [70, 3.5]]) {
    group('pu', `animation-delay:${delay}s`, () => {
      const cols = []
      for (let x = 0; x < W; x += 2) {
        cols.push([x, Math.round(34 + shift * 0.2 + 14 * Math.sin((x + shift) / 40) + 8 * Math.sin((x + shift) / 17)), int(16, 38)])
      }
      for (const [x, y, len] of cols) put('#7b5cff33', x, y - len, 2, len >> 1)
      for (const [x, y, len] of cols) put('#35e89a55', x, y - (len >> 1), 2, len >> 1)
      for (const [x, y] of cols) put('#9dffd0aa', x, y - 2, 2, 3)
    })
  }
  peaks('#22335e', 114, [[50, 34, 60], [152, 46, 70], [252, 38, 65]], { cap: '#c6d6f2' })
  const g = ridge('#9fb6dc', 130, 10, { rough: 0 })
  pines(16, [[0, 319]], x => g[x] + 3, 10, 18, ['#14233e'])
  const g2 = ridge('#c9d8ef', 148, 12, { rough: 0, f: 1.5 })
  pines(12, [[0, 150], [240, 319]], x => g2[x] + 4, 16, 28, ['#0d1b2e'])
  put('#3a2418', 196, g2[200] - 6, 18, 10)
  put('#f4f8fd', 194, g2[200] - 9, 22, 3)
  put('#ffcf5a', 202, g2[200] - 3, 3, 4)
  put('#ffcf5a44', 198, g2[200] + 4, 12, 3)
  ridge('#e8eff9', 168, 8, { rough: 0 })
})

const hoaAnhDao = scene(44, () => {
  bands(['#7fb8ee', '#98c6f2', '#b4d4f5', '#cfe0f6', '#e6e2f2', '#f7dde8', '#fbd3df'], 0, 100)
  clouds([[14, 10, 8, 60], [240, 16, 8, 60]], '#ffffff', '#f3dfee')
  peaks('#7d8fc4', 102, [[166, 74, 100]], { cap: '#ffffff', capFrac: 0.38 })
  ridge('#6f9a7a', 104, 6, { bottom: 107 })
  bands(['#8fc0ea', '#9ccaee', '#aad4f2', '#bcdff5'], 106, 166)
  dots(26, 90, 240, 108, 126, ['#a9b6dc', '#ffffff'], 10)
  twinkle(12, 0, 319, 110, 150, ['#ffffff'], 2)
  ridge('#5aa85a', 160, 8)
  dots(50, 0, 319, 164, 178, ['#74c06a', '#f7a8c4', '#3f8a4a'], 2)
  for (const [x, base, h] of [[42, 174, 36], [98, 178, 26], [252, 172, 40], [302, 178, 28]]) {
    put('#5a3a34', x, base - h, 3, h)
    put('#5a3a34', x - 5, base - h + 4, 6, 2)
    put('#5a3a34', x + 2, base - h + 8, 7, 2)
    for (let i = 0; i < 26; i++) {
      put(pick(['#f7a8c4', '#fbc4d8', '#f48fb4', '#ffe0ec']), x + int(-16, 12), base - h + int(-13, 8), int(3, 8), int(2, 4))
    }
  }
  falling(36, ['#fbc4d8', '#ffe0ec'], 'animation-duration:18s')
  falling(24, ['#f7a8c4'], 'animation-duration:26s', 2, 1)
})

// ── Thành phố ─────────────────────────────────────────────────────────────
const phoBien = scene(11, () => {
  bands(['#1565c8', '#1a72d4', '#2180de', '#2b8ee6', '#3a9cec', '#52abf0', '#70bbf4', '#93cdf7'], 0, 72)
  ridge('#8fb4e6', 72, 6, { bottom: 73, f: 3 })
  bands(['#4fb4ee', '#3fa8ea', '#35a0e6', '#2f9be0', '#38b0e0', '#45c2e0', '#5cd0e0', '#74dbe2', '#8ae4e4'], 72, 180)
  clouds([[-6, 2, 16, 70], [0, 34, 9, 40], [220, 0, 18, 90], [250, 26, 10, 60], [110, 14, 3, 24], [60, 56, 4, 50]], '#ffffff', '#d6e8fa')
  const landX = y => Math.round(105 + (y - 74) * 0.6 + Math.sin(y / 7) * 4)
  twinkle(28, 2, 100, 78, 150, ['#ffffff'], 2)
  for (let y = 74; y < H; y += 2) put('#f2e6b8', landX(y) - 2, y, 3, 2)
  for (let y = 74; y < H; y += 2) put('#9db7cf', landX(y) + 1, y, W, 2)
  for (let i = 0; i < 40; i++) {
    const y = int(80, 150)
    put('#7fbf5a', int(landX(y) + 4, 316), y, int(2, 5), 2)
  }
  const list = Array.from({ length: 150 }, () => {
    const base = int(76, 152)
    return [base, int(landX(base) + 3, 318), int(4, 9)]
  }).sort((a, b) => a[0] - b[0])
  for (const [base, x, w] of list) {
    const depth = (base - 76) / 76
    tower(x, base, w, int(5 + Math.round(depth * 8), 10 + Math.round(depth * 30)))
  }
  const cols = []
  for (let x = 0; x < W; x += 2) cols.push([x, Math.round(160 - 14 * Math.sin((x / W) * Math.PI) + int(0, 3))])
  for (const [x, t] of cols) put('#5fae3a', x, t, 2, H - t)
  for (const [x, t] of cols) put('#8fd04e', x, t, 2, 1)
  for (let i = 0; i < 260; i++) {
    const x = int(0, 318)
    put(pick(['#8fd04e', '#3f8a2c', '#4a9a32']), x, int(Math.round(164 - 14 * Math.sin((x / W) * Math.PI)), 178), 2, 2)
  }
})

const phoDem = scene(8, () => {
  bands(['#070b1f', '#0a1030', '#0e1740', '#131f50', '#1a2a60', '#24376e'], 0, 122)
  dots(80, 0, 319, 0, 90, ['#ffffff', '#bcd4ff'])
  twinkle(12, 0, 319, 0, 80, ['#ffffff'])
  disc('#2a3a78', 250, 34, 15)
  disc('#f4f1d8', 250, 34, 11)
  dots(5, 244, 254, 28, 40, ['#d6d2b4'], 3, 2)
  skyline(128, { hMin: 20, hMax: 60, wall: ['#1c2a5a', '#223268'], lit: ['#ffd76a'], litP: 0.1 })
  const bs = skyline(136, { hMin: 16, hMax: 86, wMin: 8, wMax: 20, wall: ['#0d1430', '#111a3c', '#0a1028'], lit: ['#ffd76a', '#ffefb0', '#7fd4ff'], litP: 0.3 })
  group('tw', '', () => {
    for (const [x, w, h] of bs) put('#ffd76a', x + int(1, w - 2), 136 - int(4, h - 2), 1, 2)
  })
  group('tw', 'animation-delay:2s', () => {
    for (const [x, w, h] of bs) if (h > 60) put('#ff5a5a', x + (w >> 1), 136 - h - 9, 1, 1)
  })
  bands(['#0c1434', '#0a1230', '#08102a', '#070d24'], 137, 180)
  dots(90, 0, 319, 139, 178, ['#ffd76a66', '#7fd4ff55', '#ffefb066'], 5)
  twinkle(10, 0, 319, 140, 176, ['#ffd76a88'], 4)
})

const neon = scene(19, () => {
  bands(['#12062e', '#1e0a44', '#2e0e5a', '#451470', '#641a80', '#8a2288', '#b02c8c'], 0, 124)
  dots(30, 0, 319, 0, 40, ['#ffffff88'])
  skyline(132, { hMin: 30, hMax: 84, wall: ['#3a1466', '#441a72'], lit: ['#ff6ad5'], litP: 0.1 })
  const bs = skyline(152, { hMin: 40, hMax: 122, wMin: 14, wMax: 28, wall: ['#140a2e', '#1a0c38', '#100826'], lit: ['#3df5ff', '#ff4fd8', '#ffe45e'], litP: 0.22 })
  for (const [delay, colors] of [[0, ['#3df5ff', '#ffe45e']], [3, ['#ff4fd8', '#9d6bff']]]) {
    group('pu', `animation-delay:${delay}s`, () => {
      for (const [x, w, h] of bs) {
        if (rnd() < 0.5) continue
        const c = pick(colors)
        put(c, x, 152 - h, w, 1)
        put(c, x + int(2, w - 5), 152 - h + int(6, 16), 2, int(10, 22))
        put(c, x + 2, 152 - int(8, 14), w - 4, 1)
      }
    })
  }
  bands(['#1a0c38', '#160a30', '#120828'], 153, 180)
  dots(90, 0, 319, 155, 178, ['#3df5ff66', '#ff4fd866', '#ffe45e55'], 6)
  falling(70, ['#b8c8ff55'], 'animation-duration:1.4s', 1, 4)
})

const phoHoangHon = scene(27, () => {
  bands(['#40246e', '#6a2c7c', '#a03a7c', '#d2506c', '#f0704e', '#fa9440', '#fdb94a', '#fed870'], 0, 128)
  streaks(10, 14, 70, ['#8a3a88', '#c05a7c', '#ffb070'])
  disc('#ffe9a0', 160, 106, 32)
  disc('#fff6d0', 160, 106, 26)
  birds('#40246e', [[70, 40], [84, 46], [240, 30], [252, 38]])
  skyline(130, { hMin: 14, hMax: 52, wall: ['#7a2c62', '#8a3468'] })
  skyline(137, { hMin: 16, hMax: 92, wMin: 8, wMax: 18, wall: ['#22102e', '#2a1438'], lit: ['#ffd76a'], litP: 0.1 })
  bands(['#b8446a', '#8e3a70', '#6a3070', '#4a2868'], 138, 180)
  for (let y = 140; y < 178; y += 2) {
    const w = int(10, 40)
    put('#fdb94a', 160 - (w >> 1) + int(-4, 4), y, w, 1)
  }
  twinkle(10, 90, 230, 140, 176, ['#fff6d0'], 4)
})

const phoTuyet = scene(52, () => {
  bands(['#1c2452', '#28306a', '#3a3f84', '#55529a', '#7668ac', '#9a84ba', '#c0a4c6'], 0, 120)
  dots(30, 0, 319, 0, 40, ['#ffffff'])
  skyline(126, { hMin: 16, hMax: 52, wall: ['#4a4c8a', '#54569a'], lit: ['#ffd9a0'], litP: 0.1, roof: '#e6ecfa' })
  skyline(144, { hMin: 14, hMax: 72, wMin: 10, wMax: 22, wall: ['#262a56', '#2e3264', '#20244c'], lit: ['#ffc86a', '#ffe2a8'], litP: 0.35, roof: '#f4f8ff' })
  put('#dfe8f8', 0, 144, W, H - 144)
  const g = ridge('#dfe8f8', 150, 5, { rough: 0 })
  pines(10, [[0, 319]], x => g[x] + int(6, 20), 14, 26, ['#1f3a44', '#27485a'])
  ridge('#f4f8ff', 172, 6, { rough: 0, f: 2 })
  for (const x of [36, 118, 204, 286]) {
    put('#1a1c38', x, 148, 1, 16)
    put('#ffe08a', x - 1, 146, 3, 2)
    put('#ffe08a44', x - 3, 148, 7, 4)
  }
  falling(60, ['#ffffff'], 'animation-duration:16s')
  falling(36, ['#ffffffaa'], 'animation-duration:24s', 2, 2)
})

const cauCang = scene(61, () => {
  bands(['#6f9fe0', '#8db4ea', '#adc8f0', '#cddaf2', '#ead9e6', '#f8d2c6', '#fcc9a4'], 0, 114)
  disc('#ffe6a8', 70, 106, 15)
  disc('#fff4c8', 70, 106, 12)
  clouds([[196, 14, 8, 70], [16, 24, 5, 50]], '#ffffff', '#f6dfe0')
  skyline(115, { hMin: 8, hMax: 36, wMin: 5, wMax: 10, wall: ['#9aa8d4', '#a8b4dc', '#8c9acc'] })
  bands(['#f0b8a0', '#d8a8b0', '#b09ac0', '#8a90c8', '#6f86c8', '#5a78c0'], 116, 180)
  for (let y = 118; y < 150; y += 2) {
    const w = int(6, 18)
    put('#fff4c8', 70 - (w >> 1) + int(-3, 3), y, w, 1)
  }
  twinkle(14, 0, 319, 120, 176, ['#fff4c8'], 3)
  const c = '#3a2f52'
  const cable = x => (x < 92 ? 126 - (x / 92) * 56 : x > 232 ? 126 - ((W - x) / 88) * 56 : 70 + 52 * (1 - ((x - 162) / 70) ** 2))
  for (let x = 4; x < W; x += 6) {
    const y = Math.round(cable(x))
    put('#6a5d88', x, y, 1, 126 - y)
  }
  for (let x = 0; x < W; x++) put(c, x, Math.round(cable(x)), 1, 2)
  put(c, 0, 126, W, 3)
  put('#6a5d88', 0, 129, W, 1)
  for (const x of [90, 230]) {
    put(c, x, 66, 5, 114)
    put(c, x - 1, 78, 7, 2)
    put(c, x - 1, 100, 7, 2)
    put(c, x - 2, 150, 9, 30)
  }
  put('#ffffff', 146, 158, 18, 3)
  put('#e04848', 147, 161, 16, 1)
  put('#dfe6f5', 151, 153, 7, 5)
  put('#3a2f52', 153, 154, 3, 2)
  dots(8, 166, 190, 160, 162, ['#ffffffaa'], 4)
})

// ── Cảnh khung: hình dồn về hai bên, giữa để trống cho đoạn chat ───────────
const mput = (right, c, x, y, w = 1, h = 1) => put(c, right ? W - x - w : x, y, w, h)
// Tán lá: các mảng nhỏ trong một hình bầu dục, tô từ màu tối đến màu sáng
const canopy = (right, cx, cy, rx, ry, n, colors) =>
  colors.forEach((c, k) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28
      const r = Math.sqrt(rnd())
      mput(right, c, Math.round(cx + Math.cos(a) * r * rx) - k * 2, Math.round(cy + Math.sin(a) * r * ry) - k * 2, int(3, 8), int(2, 4))
    }
  })

const treDem = scene(71, () => {
  bands(['#06141c', '#081a24', '#0a202c', '#0c2734', '#0e2e3a', '#10343e'], 0, H)
  dots(40, 60, 260, 0, 120, ['#ffffff66', '#bfe8d8'])
  disc('#143640', 232, 30, 12)
  disc('#e8f0d8', 232, 30, 8)
  ridge('#0a1c1c', 174, 5)
  for (const right of [false, true]) {
    for (let i = 0; i < 7; i++) {
      const x = int(0, 64)
      mput(right, '#123a30', x, 0, 2, H)
      for (let y = int(0, 12); y < H; y += int(12, 18)) mput(right, '#0c2a22', x, y, 2, 1)
    }
    for (const x0 of [3, 12, 22, 31, 43, 54]) {
      const x = x0 + int(-2, 2)
      const w = int(3, 4)
      const c = pick(['#1f6a40', '#2a7e4c', '#19583a'])
      mput(right, c, x, 0, w, H)
      mput(right, '#4fae6a', x, 0, 1, H)
      for (let y = int(2, 14); y < H; y += int(13, 19)) {
        mput(right, '#0f3a26', x, y, w, 1)
        mput(right, '#6fcf86', x, y + 1, w, 1)
        if (rnd() < 0.5) {
          const out = rnd() < 0.65
          for (let l = 0; l < 3; l++) {
            for (let k = 0; k < 9; k++) {
              mput(right, l === 1 ? '#3f9a5a' : '#2f8a4e', out ? x + w + k : x - k - 2, y - 3 + l * 3 + Math.round(k * (l - 1) * 0.5), 2, 1)
            }
          }
        }
      }
    }
  }
  for (const [x, y] of [[70, 38], [248, 58]]) {
    put('#0a0f10', x, 0, 1, y - 1)
    put('#3a2a1a', x - 2, y - 1, 5, 1)
    put('#c8341e', x - 3, y, 7, 9)
    put('#f2603a', x - 2, y + 1, 5, 7)
    put('#ffd76a', x - 1, y + 3, 3, 3)
    put('#3a2a1a', x - 2, y + 9, 5, 1)
    put('#e8452e', x, y + 10, 1, 4)
  }
  group('pu', '', () => {
    put('#ffb04a2a', 62, 31, 17, 22)
    put('#ffb04a2a', 240, 51, 17, 22)
  })
  twinkle(7, 0, 319, 30, 170, ['#d8ff7a'])
})

const hemPho = scene(83, () => {
  bands(['#1a1440', '#2a1c5a', '#44287a', '#6a3a90', '#9a4f96', '#cc6a8c', '#f08a7a', '#f8b07a'], 0, 158)
  dots(30, 60, 260, 0, 50, ['#ffffff'])
  skyline(158, { hMin: 6, hMax: 26, wMin: 5, wMax: 10, wall: ['#5a2a6a', '#6a3276'] })
  put('#2a1838', 0, 158, W, 22)
  dots(24, 60, 250, 160, 178, ['#f8b07a44', '#ff6ad544'], 8)
  for (const right of [false, true]) {
    for (const [x0, x1, top, wall, edge] of [[30, 62, int(24, 40), '#241640', '#3a2460'], [0, 38, 0, '#160e2c', '#2a1a4a']]) {
      mput(right, wall, x0, top, x1 - x0, H - top)
      mput(right, edge, x1 - 2, top, 2, H - top)
      mput(right, edge, x0, top, x1 - x0, 2)
      if (top > 0) {
        mput(right, wall, x0 + 8, top - 10, 9, 10)
        mput(right, wall, x0 + 22, top - 16, 1, 16)
      }
      for (let y = top + 6; y < H - 8; y += 9) {
        mput(right, edge, x0, y + 6, x1 - x0 - 2, 1)
        for (let x = x0 + 3; x < x1 - 6; x += 6) {
          const r = rnd()
          mput(right, r < 0.35 ? '#ffd76a' : r < 0.5 ? '#7fe4ff' : r < 0.6 ? '#ff8ad8' : '#0c0820', x, y, 3, 4)
        }
      }
    }
  }
  const signs = [[0, [[62, 50, '#ff4fd8', 26], [253, 70, '#3df5ff', 30]]], [3, [[62, 98, '#ffe45e', 18], [253, 36, '#ff4fd8', 20]]]]
  for (const [delay, list] of signs) {
    group('pu', `animation-delay:${delay}s`, () => {
      for (const [x, y, c, h] of list) {
        put(c + '33', x - 3, y - 3, 11, h + 6)
        put(c, x, y, 5, h)
        put('#12062e', x + 1, y + 2, 3, h - 4)
        for (let k = y + 4; k < y + h - 4; k += 4) put(c, x + 1, k, 3, 2)
      }
    })
  }
  const wire = x => Math.round(16 + 10 * (1 - ((x - 160) / 122) ** 2))
  for (let x = 38; x < 282; x++) put('#0c0820', x, wire(x), 1, 1)
  group('tw', '', () => {
    for (let x = 46; x < 280; x += 16) put(pick(['#ffd76a', '#ff8ad8', '#7fe4ff']), x, wire(x) + 1, 2, 2)
  })
})

const thacDoi = scene(92, () => {
  bands(['#6fb2ea', '#86c0ee', '#9fcef2', '#b8dcf5', '#d0e8f8', '#e4f2fa'], 0, 126)
  clouds([[110, 10, 5, 90]], '#ffffff', '#e0eefa')
  peaks('#b9cfe6', 126, [[110, 22, 60], [170, 30, 70], [230, 20, 55]], { cap: '#ffffff', capFrac: 0.3, bottom: 127 })
  bands(['#9fdbe6', '#8fd0e0', '#7cc6dc', '#6abcd8', '#58b0d2'], 126, H)
  twinkle(12, 60, 260, 130, 176, ['#ffffff'], 3)
  for (const right of [false, true]) {
    const p = rnd() * 6
    const edge = []
    for (let y = 0; y < H; y += 2) {
      edge.push([y, Math.round(46 + 10 * Math.sin(y / 21 + p) + 5 * Math.sin(y / 7 + p) + (y > 150 ? (y - 150) * 0.5 : 0) + rnd() * 2)])
    }
    for (const [y, w] of edge) mput(right, '#6a7480', 0, y, w, 2)
    for (const [y, w] of edge) mput(right, '#8a94a0', w - 4, y, 4, 2)
    for (const [y, w] of edge) if ((y >> 1) % 7 < 2) mput(right, '#58626e', int(0, 8), y, w - int(12, 20), 2)
    for (const [y, w] of edge) if (y % 34 < 4) mput(right, '#4f9a4a', w - int(10, 16), y, 18, 2)
    canopy(right, 22, 6, 30, 9, 26, ['#2f6a3a', '#3f8a46', '#5aa85a'])
    mput(right, '#cfeaf8', 16, 20, 9, 138)
    mput(right, '#ffffff', 18, 20, 2, 138)
    mput(right, '#a8d4ee', 22, 20, 1, 138)
    mput(right, '#e4f4fb', 6, 159, 30, 2)
    mput(right, '#ffffff', 10, 156, 22, 3)
  }
  for (const d of [0, 1.3, 2.6]) {
    group('tw', `animation-delay:${d}s`, () => {
      for (const right of [false, true]) {
        for (let i = 0; i < 14; i++) mput(right, pick(['#ffffff', '#8fc4e6']), int(16, 24), int(22, 150), 1, int(3, 6))
      }
    })
  }
  group('pu', '', () => {
    for (const right of [false, true]) {
      mput(right, '#ffffff66', 2, 148, 44, 8)
      mput(right, '#ffffff44', 0, 142, 52, 6)
    }
  })
})

const laThu = scene(104, () => {
  bands(['#f4d9b0', '#f7e0bc', '#f9e7c8', '#fbedd4', '#fdf2de', '#fef6e8'], 0, 142)
  disc('#fffbea', 160, 70, 14)
  ridge('#f0c8a0', 130, 10, { rough: 0 })
  ridge('#e8a878', 142, 10, { rough: 0, f: 1.5 })
  ridge('#d9a24a', 154, 5, { rough: 1 })
  dots(70, 0, 319, 158, 178, ['#e8b85a', '#c8862e', '#f2d27a'], 3)
  for (let y = 156; y < H; y += 2) {
    const w = Math.round(6 + (y - 156) * 1.4)
    put('#f2dcae', 160 - (w >> 1), y, w, 2)
  }
  for (const right of [false, true]) {
    for (let y = 30; y < H; y += 2) {
      const x = Math.round(20 + 6 * Math.sin(y / 40 + (right ? 1 : 0)))
      const w = Math.round(7 + (y - 30) / 28)
      mput(right, '#4a2c22', x, y, w, 2)
      mput(right, '#6a4030', x + w - 2, y, 2, 2)
    }
    for (let k = 0; k < 26; k++) {
      mput(right, '#4a2c22', 26 + k, 64 - Math.round(k * 0.9), 3, 2)
      mput(right, '#4a2c22', 24 + k, 94 - Math.round(k * 0.5), 2, 2)
    }
    canopy(right, 30, 22, 42, 26, 120, ['#a8321e', '#d6552a', '#f08a2e', '#f6b83a'])
    canopy(right, 56, 52, 20, 11, 30, ['#c8441e', '#f08a2e', '#f6c84a'])
    canopy(right, 50, 84, 12, 6, 8, ['#d6552a', '#f6b83a'])
    canopy(right, 24, 175, 32, 4, 16, ['#a8321e', '#e8782a'])
  }
  falling(14, ['#e8782a', '#d6552a'], 'animation-duration:20s', 2, 1)
  falling(10, ['#f6b83a'], 'animation-duration:28s', 2, 2)
})

// text: [chữ chính, chữ phụ, chữ mờ] ở chế độ tối, theo không khí của cảnh
// tint: màu lớp mờ, chỉ đặt cho cảnh một chế độ (màu thô không tự đổi theo sáng/tối)
// veil: độ đậm lớp mờ sau chữ, đo theo độ sáng của cảnh (cảnh càng sáng càng cần đậm)
// hue/sat: tông xám của giao diện; accent: màu nhấn; only: cảnh chỉ hợp một chế độ
export const THEMES = [
  { id: 'ho-nui', text: ['#eaf4ff', '#b8d6f2', '#8fb4d8'], veil: 0.35, title: 'Hồ núi tuyết', hue: 210, sat: 30, accent: '#2f7fd6', draw: hoNui },
  { id: 'hoang-hon-bien', text: ['#ffe9d6', '#f6b99a', '#d49a9a'], tint: '#3a1c4a', veil: 0.5, title: 'Hoàng hôn trên biển', hue: 280, sat: 30, accent: '#e8703a', only: 'dark', draw: hoangHonBien },
  { id: 'rung-suong', text: ['#e8f5ec', '#b5dcc2', '#8ebfa0'], veil: 0.5, title: 'Rừng thông sương sớm', hue: 150, sat: 22, accent: '#2f8a66', draw: rungSuong },
  { id: 'sa-mac', text: ['#fff0dc', '#f2c89a', '#cfa27a'], veil: 0.45, title: 'Sa mạc chiều tà', hue: 20, sat: 28, accent: '#d6703a', draw: saMac },
  { id: 'cuc-quang', text: ['#e6fff4', '#9ff0cc', '#7fc4b0'], tint: '#0c2a3a', veil: 0.55, title: 'Cực quang', hue: 220, sat: 45, accent: '#2fc48a', only: 'dark', draw: cucQuang },
  { id: 'hoa-anh-dao', text: ['#ffeff5', '#f7bcd2', '#d49ab2'], veil: 0.35, title: 'Hồ hoa anh đào', hue: 335, sat: 30, accent: '#d6457f', draw: hoaAnhDao },
  { id: 'pho-bien', text: ['#eaf6ff', '#a8dcf2', '#86b8d4'], veil: 0.35, title: 'Thành phố biển', hue: 215, sat: 38, accent: '#2f7fd6', draw: phoBien },
  { id: 'pho-dem', text: ['#fff6de', '#f2d488', '#b8a880'], tint: '#101c48', veil: 0.25, title: 'Phố đêm', hue: 228, sat: 45, accent: '#e0a82e', only: 'dark', draw: phoDem },
  { id: 'neon', text: ['#ffe8fb', '#ff9deb', '#c58fd8'], tint: '#3a0f5a', veil: 0.25, title: 'Phố neon mưa', hue: 275, sat: 50, accent: '#d63fc0', only: 'dark', draw: neon },
  { id: 'pho-hoang-hon', text: ['#ffebdd', '#ffb888', '#d69a9a'], tint: '#4a1c3c', veil: 0.3, title: 'Phố lúc hoàng hôn', hue: 300, sat: 32, accent: '#e8703a', only: 'dark', draw: phoHoangHon },
  { id: 'pho-tuyet', text: ['#f2f4ff', '#c8ccf6', '#a2a6d6'], tint: '#262c62', veil: 0.6, title: 'Phố tuyết', hue: 235, sat: 32, accent: '#6f7fe0', only: 'dark', draw: phoTuyet },
  { id: 'cau-cang', text: ['#f4eeff', '#d2c4f2', '#a9a0d0'], veil: 0.35, title: 'Cầu cảng bình minh', hue: 240, sat: 26, accent: '#5a6fd0', draw: cauCang },
  { id: 'tre-dem', text: ['#fff0d8', '#ffc27a', '#b8a27e'], tint: '#0a2a2a', veil: 0.25, title: 'Rặng tre đêm đèn lồng', hue: 170, sat: 20, accent: '#e8703a', only: 'dark', draw: treDem },
  { id: 'hem-pho', text: ['#e8fdff', '#8af0fa', '#a69cd8'], tint: '#2a1650', veil: 0.35, title: 'Hẻm phố lên đèn', hue: 270, sat: 40, accent: '#d63fc0', only: 'dark', draw: hemPho },
  { id: 'thac-doi', text: ['#eafbff', '#a6e4f2', '#84bcd0'], veil: 0.35, title: 'Thác đôi', hue: 200, sat: 30, accent: '#2f8fb8', draw: thacDoi },
  { id: 'la-thu', text: ['#fff1de', '#ffc48a', '#d2a27c'], veil: 0.35, title: 'Lá thu', hue: 30, sat: 30, accent: '#d6602a', draw: laThu },
]

const hex = (h, s, l) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = n => {
    const k = (n + h / 30) % 12
    return Math.round((l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Đầu vào cho makeColors: tông xám nhuộm theo màu chủ đạo của cảnh. */
export const paletteOf = ({ title, hue: h, sat: s, accent, only, text }) => {
  const d = Math.min(70, s * 1.8) // nền tối đậm màu hơn để lớp mờ mang tông của cảnh
  const dark = {
    gray: {
      anchors: {
        'surface-0': hex(h, d, 10),
        'surface-1': hex(h, d, 13),
        'surface-2': hex(h, d, 16),
        'surface-3': hex(h, d, 18),
        'text-primary': text?.[0] ?? hex(h, 25, 93),
        'text-secondary': text?.[1] ?? hex(h, 18, 80),
        'text-muted': text?.[2] ?? hex(h, 14, 67),
      },
    },
  }
  const light = {
    gray: {
      anchors: {
        'surface-0': hex(h, s, 89),
        'surface-1': hex(h, s, 92.5),
        'surface-2': hex(h, s, 96),
        'text-primary': hex(h, 30, 13),
        'text-secondary': hex(h, 20, 27),
        'text-muted': hex(h, 15, 35),
      },
    },
  }
  const roles = { accent, danger: '#d6453d', success: '#2f9e6b', warning: '#d99a1c', pro: '#8a5cd6' }

  return only === 'dark' ? { label: title, roles, dark, only } : { label: title, roles, light, dark }
}
