#!/usr/bin/env node
// Pixel Scenes for Windows Terminal.
//
//   node terminal-theme.mjs --list               list the 16 scenes
//   node terminal-theme.mjs <scene>              apply a scene (name or number) to the "Claude - Pixel Scenes" profile
//   node terminal-theme.mjs <scene> --opacity 0.25
//   node terminal-theme.mjs --remove             remove the profile and its color schemes
//   node terminal-theme.mjs --export <scene> <file.png>   only write the background image
//
// Applying a scene writes the background image to %LOCALAPPDATA%\PixelScenes, adds a matching
// color scheme, and creates or updates ONE profile in Windows Terminal's settings.json. Every other
// profile and setting is left as it was. settings.json is backed up once, before the first change,
// to settings.json.bak-pixel-scenes. Windows Terminal reloads its settings by itself, so an open
// tab on that profile changes at once.
//
// --settings <path> points at another settings.json (used for testing).

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync, crc32 } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const { THEMES } = await import(pathToFileURL(join(here, '..', '..', 'hooks', 'scenes.js')).href)

const PROFILE_NAME = 'Claude - Pixel Scenes'
const PROFILE_GUID = '{5c1e7a3e-9d2b-4f61-8c4a-7a1e0b9c3d21}' // fixed, so re-running updates instead of adding
const SCHEME_PREFIX = 'Pixel Scenes - '

const args = process.argv.slice(2)
const flag = name => {
  const i = args.indexOf(name)
  if (i < 0) return undefined
  const value = args[i + 1]
  args.splice(i, 2)
  return value
}
const fail = message => {
  console.error(message)
  process.exit(1)
}
const findScene = key => THEMES.find((t, i) => t.id === key || String(i + 1) === key)

// ── colors ────────────────────────────────────────────────────────────────
const hex = (h, s, l) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = n => {
    const k = (n + h / 30) % 12
    return Math.round((l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}
// A dark scheme tinted with the scene's hue; ANSI colors stay recognizable (red is red, green is green).
export const schemeOf = t => {
  const h = t.hue
  const s = Math.min(70, t.sat * 1.8)
  return {
    name: SCHEME_PREFIX + t.title,
    background: hex(h, s, 10),
    foreground: hex(h, 25, 92),
    cursorColor: t.accent.toUpperCase(),
    selectionBackground: hex(h, s, 28),
    black: hex(h, s, 14),
    red: '#FF5F7A',
    green: '#4FE3A0',
    yellow: '#FFD866',
    blue: '#6FA3FF',
    purple: '#C792FF',
    cyan: '#4FE0F0',
    white: hex(h, 18, 82),
    brightBlack: hex(h, 18, 50),
    brightRed: '#FF8AA0',
    brightGreen: '#8AF5C4',
    brightYellow: '#FFE89A',
    brightBlue: '#A0C2FF',
    brightPurple: '#DDB8FF',
    brightCyan: '#8AF0FA',
    brightWhite: '#FFFFFF',
  }
}

// ── background image ──────────────────────────────────────────────────────
// Rasterizes the scene's SVG (rectangles only) at 6x: 1920x1080, hard pixel edges.
export const pngOf = (t, S = 6) => {
  const W = 320
  const H = 180
  const buf = new Float32Array(W * H * 3)
  for (const [, c, d] of t.draw().matchAll(/<path fill="#(\w+)" d="([^"]+)"/g)) {
    const rgb = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16))
    const a = c.length === 8 ? parseInt(c.slice(6), 16) / 255 : 1
    for (const [, x, y, w, h] of d.matchAll(/M(-?\d+) (-?\d+)h(\d+)v(\d+)/g))
      for (let j = Math.max(0, +y); j < Math.min(H, +y + +h); j++)
        for (let i = Math.max(0, +x); i < Math.min(W, +x + +w); i++)
          for (let k = 0; k < 3; k++) buf[(j * W + i) * 3 + k] = buf[(j * W + i) * 3 + k] * (1 - a) + rgb[k] * a
  }
  const w = W * S
  const h = H * S
  const row = w * 3 + 1
  const raw = Buffer.alloc(row * h)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const q = (((j / S) | 0) * W + ((i / S) | 0)) * 3
      for (let k = 0; k < 3; k++) raw[j * row + 1 + i * 3 + k] = Math.round(buf[q + k])
    }
  const chunk = (type, data) => {
    const b = Buffer.concat([Buffer.from(type), data])
    const o = Buffer.alloc(8 + b.length)
    o.writeUInt32BE(data.length, 0)
    b.copy(o, 4)
    o.writeUInt32BE(crc32(b), 4 + b.length)
    return o
  }
  const ih = Buffer.alloc(13)
  ih.writeUInt32BE(w, 0)
  ih.writeUInt32BE(h, 4)
  ih.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ih),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Windows Terminal settings ─────────────────────────────────────────────
const findSettings = () => {
  const local = process.env.LOCALAPPDATA ?? ''
  const candidates = [
    join(local, 'Packages', 'Microsoft.WindowsTerminal_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    join(local, 'Packages', 'Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe', 'LocalState', 'settings.json'),
    join(local, 'Microsoft', 'Windows Terminal', 'settings.json'),
  ]
  return candidates.find(existsSync)
}
const readSettings = path => {
  const raw = readFileSync(path, 'utf8')
  try {
    return { raw, json: JSON.parse(raw) }
  } catch {
    fail(
      `${path} has comments or trailing commas, which this script will not rewrite.\n` +
        'Remove them in Windows Terminal (Settings > Open JSON file), or add the profile by hand.',
    )
  }
}
const writeSettings = (path, raw, json) => {
  const backup = `${path}.bak-pixel-scenes`
  if (!existsSync(backup)) copyFileSync(path, backup)
  const indent = (raw.match(/\n( +)"/) ?? [, '    '])[1]
  writeFileSync(path, JSON.stringify(json, null, indent) + (raw.endsWith('\n') ? '\n' : ''))
  return backup
}

// ── commands ──────────────────────────────────────────────────────────────
const settingsFlag = flag('--settings')
const opacityFlag = flag('--opacity')
const exportTo = flag('--export')

if (args.includes('--list') || (args.length === 0 && exportTo === undefined)) {
  THEMES.forEach((t, i) => console.log(`${String(i + 1).padStart(2)}. ${t.id.padEnd(15)} ${t.title}`))
  if (args.length === 0 && !process.argv.includes('--list')) console.log('\nUsage: node terminal-theme.mjs <scene> | --list | --remove')
  process.exit(0)
}

if (exportTo !== undefined) {
  const t = findScene(exportTo) ?? fail(`No scene "${exportTo}". Run with --list.`)
  const out = args[0] ?? `${t.id}.png`
  writeFileSync(out, pngOf(t))
  console.log(`Wrote ${out} (1920x1080).`)
  process.exit(0)
}

if (process.platform !== 'win32' && settingsFlag === undefined) {
  fail('Windows Terminal is Windows only. On another terminal, use --export <scene> <file.png> and set the image by hand.')
}
const settings = settingsFlag ?? findSettings() ?? fail('Windows Terminal settings.json not found. Open Windows Terminal once, then run this again.')
const { raw, json } = readSettings(settings)
json.profiles ??= {}
json.profiles.list ??= []

if (args.includes('--remove')) {
  const before = json.profiles.list.length + (json.schemes ?? []).length
  json.profiles.list = json.profiles.list.filter(p => p.guid !== PROFILE_GUID)
  const inUse = new Set(json.profiles.list.map(p => p.colorScheme))
  json.schemes = (json.schemes ?? []).filter(s => !s.name?.startsWith(SCHEME_PREFIX) || inUse.has(s.name))
  if (json.profiles.list.length + json.schemes.length === before) {
    console.log('Nothing to remove.')
    process.exit(0)
  }
  writeSettings(settings, raw, json)
  console.log(`Removed "${PROFILE_NAME}" and its color schemes from ${settings}.`)
  process.exit(0)
}

const t = findScene(args[0]) ?? fail(`No scene "${args[0]}". Run with --list.`)
const opacity = opacityFlag === undefined ? 0.3 : Number(opacityFlag)
if (!(opacity >= 0 && opacity <= 1)) fail('--opacity must be a number from 0 to 1.')

const imageDir = join(process.env.LOCALAPPDATA ?? dirname(settings), 'PixelScenes')
mkdirSync(imageDir, { recursive: true })
const image = join(imageDir, `${t.id}.png`)
writeFileSync(image, pngOf(t))

const scheme = schemeOf(t)
// Drop this script's earlier schemes unless another profile still uses one, then add the new one.
const inUse = new Set(json.profiles.list.filter(p => p.guid !== PROFILE_GUID).map(p => p.colorScheme))
json.schemes = (json.schemes ?? [])
  .filter(s => !s.name?.startsWith(SCHEME_PREFIX) || inUse.has(s.name))
  .filter(s => s.name !== scheme.name)
  .concat(scheme)
const fields = {
  colorScheme: scheme.name,
  backgroundImage: image,
  backgroundImageStretchMode: 'uniformToFill',
  backgroundImageAlignment: 'center',
  backgroundImageOpacity: opacity,
}
const existing = json.profiles.list.find(p => p.guid === PROFILE_GUID)
if (existing) {
  Object.assign(existing, fields)
} else {
  json.profiles.list.push({
    guid: PROFILE_GUID,
    name: PROFILE_NAME,
    commandline: 'cmd.exe /k claude',
    hidden: false,
    font: { face: 'Cascadia Mono', size: 12 },
    ...fields,
  })
}
const backup = writeSettings(settings, raw, json)
console.log(`${existing ? 'Updated' : 'Added'} "${PROFILE_NAME}" with scene ${t.id} (${t.title}).`)
console.log(`Image: ${image}`)
console.log(`Backup of the original settings: ${backup}`)
