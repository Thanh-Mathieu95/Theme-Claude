// node tools/make-sounds.mjs — tổng hợp các vòng âm thanh nền (tự tạo, không lấy mẫu của ai)
// vào sounds/*.wav: 22.050 Hz, 16-bit, mono, lặp liền mạch.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const N = SR * 8 // độ dài thô
const X = SR // 1 giây hoà trộn đuôi vào đầu
const L = N - X // độ dài vòng lặp
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'sounds')

let seed = 7
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff
const white = () => Float32Array.from({ length: N }, () => rnd() * 2 - 1)
// lọc thông thấp một cực: a nhỏ = trầm hơn
const lp = (x, a) => {
  const y = new Float32Array(x.length)
  let s = 0
  for (let i = 0; i < x.length; i++) y[i] = s += a * (x[i] - s)
  return y
}
const mix = (...parts) => {
  const y = new Float32Array(N)
  for (const [x, g] of parts) for (let i = 0; i < N; i++) y[i] += x[i] * g
  return y
}
// hoà đuôi vào đầu (đẳng công suất) để vòng lặp không nghe tiếng nối
const loop = x => {
  const y = new Float32Array(L)
  for (let i = 0; i < L; i++) {
    const f = i / X
    y[i] = i < X ? x[i] * Math.sqrt(f) + x[L + i] * Math.sqrt(1 - f) : x[i]
  }
  return y
}
// đường bao lặp đúng theo độ dài vòng
const shape = (y, env) => y.map((v, i) => v * env(i / L))
const save = (name, y) => {
  let peak = 0
  for (const v of y) peak = Math.max(peak, Math.abs(v))
  const data = Buffer.alloc(44 + L * 2)
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + L * 2, 4)
  data.write('WAVEfmt ', 8)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(SR, 24)
  data.writeUInt32LE(SR * 2, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(L * 2, 40)
  for (let i = 0; i < L; i++) data.writeInt16LE(Math.round((y[i] / peak) * 0.25 * 32767), 44 + i * 2)
  writeFileSync(join(out, `${name}.wav`), data)
  console.log(name, `${(data.length / 1024) | 0} KiB`)
}
const TAU = Math.PI * 2

mkdirSync(out, { recursive: true })

// Mưa: tiếng rào cao + nền trầm + giọt lách tách
{
  const w = white()
  const hiss = mix([w, 1], [lp(w, 0.15), -1])
  const y = loop(mix([hiss, 0.5], [lp(white(), 0.4), 0.3]))
  for (let d = 0; d < 160; d++) {
    const at = Math.floor(rnd() * (L - 600))
    const f = 1200 + rnd() * 2400
    const g = 0.15 + rnd() * 0.3
    for (let i = 0; i < 500; i++) y[at + i] += Math.sin((TAU * f * i) / SR) * Math.exp(-i / 70) * g
  }
  save('rain', y)
}
// Sóng: nền trầm dâng lên rồi rút, mỗi vòng một con sóng lớn và một con sóng nhỏ
{
  const y = loop(mix([lp(white(), 0.03), 8], [lp(white(), 0.25), 0.35]))
  save('waves', shape(y, t => 0.2 + 0.8 * (0.5 - 0.5 * Math.cos(TAU * t)) ** 2 + 0.25 * (0.5 - 0.5 * Math.cos(TAU * 2 * t + 1)) ** 2))
}
// Thác: tiếng ào đều, hơi rung nhẹ
{
  const y = loop(mix([lp(white(), 0.3), 1], [lp(white(), 0.05), 2.5]))
  save('waterfall', shape(y, t => 0.9 + 0.1 * Math.sin(TAU * 3 * t)))
}
// Gió: nền rất trầm, lúc mạnh lúc yếu
{
  const y = loop(mix([lp(lp(white(), 0.03), 0.03), 30], [lp(white(), 0.1), 0.12]))
  save('wind', shape(y, t => 0.35 + 0.45 * (0.5 - 0.5 * Math.cos(TAU * t)) + 0.2 * (0.5 - 0.5 * Math.cos(TAU * 3 * t + 2))))
}
// Đêm: hai con dế kêu từng hồi trên nền yên
{
  const y = loop(mix([lp(white(), 0.04), 0.6]))
  for (const [f, pulse, groups, g] of [[4200, 28, 8, 0.5], [3500, 22, 5, 0.3]]) {
    for (let i = 0; i < L; i++) {
      const t = i / SR
      const on = (((i / L) * groups) % 1) < 0.55 ? 1 : 0
      const beat = Math.max(0, Math.sin(TAU * pulse * t)) ** 2
      y[i] += Math.sin(TAU * f * t) * beat * on * g * 0.25
    }
  }
  save('night', y)
}
