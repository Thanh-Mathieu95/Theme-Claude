import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { paletteOf, THEMES } from './scenes.js'
import type { SceneTheme } from './scenes.js'

const DEFAULT = 'pho-bien'
const LIST = THEMES.map((t, i) => `${i + 1}. ${t.id} — ${t.title}`).join('\n')
const HELP =
  'Gõ /scene <số hoặc tên> để đổi, /scene next để sang cảnh kế.\n' +
  'Lớp kính sau đoạn chat: /scene glass 0 (trong suốt) … 1 (đặc), /scene glass auto (theo từng cảnh).'

// Tìm theo tên hoặc số thứ tự
const find = (key: string) => THEMES.find((t, i) => t.id === key || String(i + 1) === key)

// Khi lớp kính mỏng hơn mức cảnh cần, phủ một dải tối dịu sau cột chat (giữa màn hình),
// hai mép vẫn rõ. Cảnh dùng được cả hai chế độ thì dải đổi sang màu sáng ở chế độ sáng.
const scrimOf = (t: SceneTheme, glass: number) => {
  // Never darker than the scene's own glass would be: at most 80% of the gap, capped at 0.5
  const strength = glass >= t.veil ? 0 : Math.min(0.5, (t.veil - glass) * 0.8)

  if (strength === 0) {
    return ''
  }
  const p = paletteOf(t)
  const dark = t.tint ?? p.dark?.gray?.anchors?.['surface-0'] ?? '#000000'
  const light = p.light?.gray?.anchors?.['surface-0']
  const stops = (id: string, c: string) =>
    `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".25" stop-color="${c}" stop-opacity="${strength}"/><stop offset=".75" stop-color="${c}" stop-opacity="${strength}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`
  const lightRule = light === undefined ? '' : '@media (prefers-color-scheme:light){.scrim{fill:url(#scrim-l)}}'

  return `<defs>${stops('scrim-d', dark)}${light === undefined ? '' : stops('scrim-l', light)}</defs><style>.scrim{fill:url(#scrim-d)}${lightRule}</style><rect class="scrim" x="0" y="0" width="320" height="180"/>`
}

const drawn = new Map<string, string>()
const svgOf = (t: SceneTheme, glass: number) => {
  const key = `${t.id}:${glass}`
  let svg = drawn.get(key)

  if (svg === undefined) {
    svg = t.draw().slice(0, -'</svg>'.length) + scrimOf(t, glass) + '</svg>'
    drawn.set(key, svg)
  }

  return svg
}

// glass: độ đậm lớp kính sau đoạn chat do người dùng chọn (0 = trong suốt); không đặt thì theo từng cảnh
const look = (t: SceneTheme, glass?: number): ThemeSetArgs => ({
  colors: makeColors(paletteOf(t)).theme,
  backdrop: {
    scene: t.id,
    glass: {
      blur: glass === 0 ? 0 : 12,
      opacity: glass ?? t.veil,
      ...(t.tint === undefined ? {} : { tint: t.tint }),
    },
  },
})
const glassOf = async ($: EngineInterface) => {
  const v = await $.store.get('glass')

  return typeof v === 'number' ? v : undefined
}

const current = async ($: EngineInterface) => find(String((await $.store.get('scene')) ?? DEFAULT)) ?? THEMES[0]!

// In a terminal the app draws no theme. If the Windows Terminal profile from the terminal-theme
// skill is installed, switch its background too; otherwise change nothing there.
const switchTerminal = async ($: EngineInterface, t: SceneTheme) => {
  if (!/^[A-Za-z]:[\\/]/.test($.plugin.root)) {
    return ''
  }
  const script = `${$.plugin.root}\\skills\\terminal-theme\\terminal-theme.mjs`
  try {
    const { exitCode, stdout, stderr } = await $.process.run(['node', script, t.id, '--if-installed'])

    if (exitCode !== 0) {
      return `\nKhông đổi được nền Windows Terminal: ${stderr.trim() || stdout.trim()}`
    }

    if (stdout.includes('not in Windows Terminal')) {
      return '\nTerminal chưa có profile Claude - Pixel Scenes: hãy nhờ Claude "đặt cảnh này làm nền Windows Terminal".'
    }

    return stdout.includes('tab: other')
      ? '\nĐã đổi nền profile Claude - Pixel Scenes, nhưng tab này là profile khác nên không thấy thay đổi.' +
          '\nMở đúng tab: bấm ▾ cạnh dấu + trên thanh tab, chọn Claude - Pixel Scenes.'
      : '\nĐã đổi luôn nền Windows Terminal (profile Claude - Pixel Scenes).'
  } catch (err) {
    return `\nKhông đổi được nền Windows Terminal: ${String(err)}`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: 'Đổi cảnh nền pixel: /scene <số hoặc tên>, /scene next, /scene để xem danh sách',
    })
    // In a terminal nothing draws the theme; that is expected, so no status line about it.
    await $.theme.set(look(await current($), await glassOf($)))

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') {
      return { text: `${LIST}\n\n${HELP}` }
    }
    if (arg.startsWith('glass')) {
      const value = arg.slice(5).trim()
      const n = Number(value)

      if (value === 'auto') {
        await $.store.delete('glass')
      } else if (value !== '' && n >= 0 && n <= 1) {
        await $.store.set('glass', n)
      } else {
        return { text: 'Dùng: /scene glass <số từ 0 đến 1>, ví dụ /scene glass 0 (trong suốt), hoặc /scene glass auto.' }
      }
      await $.theme.set(look(await current($), await glassOf($)))

      return { text: value === 'auto' ? 'Lớp kính trở về mức riêng của từng cảnh.' : `Lớp kính sau đoạn chat: ${n}.` }
    }
    const now = await current($)
    const picked = arg === 'next' ? THEMES[(THEMES.indexOf(now) + 1) % THEMES.length] : find(arg)

    if (picked === undefined) {
      return { text: `Không có cảnh "${arg}".\n${LIST}` }
    }
    const set = await $.theme.set(look(picked, await glassOf($)))
    await $.store.set('scene', picked.id)
    const terminal = set.isDrawn ? '' : await switchTerminal($, picked)

    return { text: `Đã đổi sang cảnh ${picked.title}.${terminal}` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const t = find(String(e.props.scene))

    if (t === undefined || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    const glass = e.props.glass === false ? 1 : e.props.glass.opacity

    return <Svg source={svgOf(t, glass)} alt={`Cảnh pixel: ${t.title}`} />
  })
}
