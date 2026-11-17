import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { paletteOf, THEMES } from './scenes.js'
import type { SceneTheme } from './scenes.js'

const DEFAULT = 'pho-bien'
const LIST = THEMES.map((t, i) => `${i + 1}. ${t.id} — ${t.title}`).join('\n')
const HELP = 'Gõ /scene <số hoặc tên> để đổi, /scene next để sang cảnh kế.'

// Tìm theo tên hoặc số thứ tự
const find = (key: string) => THEMES.find((t, i) => t.id === key || String(i + 1) === key)

const drawn = new Map<string, string>()
const svgOf = (t: SceneTheme) => {
  let svg = drawn.get(t.id)

  if (svg === undefined) {
    svg = t.draw()
    drawn.set(t.id, svg)
  }

  return svg
}

const look = (t: SceneTheme): ThemeSetArgs => ({
  colors: makeColors(paletteOf(t)).theme,
  backdrop: { scene: t.id, glass: { blur: 12, opacity: t.veil, ...(t.tint === undefined ? {} : { tint: t.tint }) } },
})

const current = async ($: EngineInterface) => find(String((await $.store.get('scene')) ?? DEFAULT)) ?? THEMES[0]!

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: 'Đổi cảnh nền pixel: /scene <số hoặc tên>, /scene next, /scene để xem danh sách',
    })
    const set = await $.theme.set(look(await current($)))

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') {
      return { text: `${LIST}\n\n${HELP}` }
    }
    const now = await current($)
    const picked = arg === 'next' ? THEMES[(THEMES.indexOf(now) + 1) % THEMES.length] : find(arg)

    if (picked === undefined) {
      return { text: `Không có cảnh "${arg}".\n${LIST}` }
    }
    await $.theme.set(look(picked))
    await $.store.set('scene', picked.id)

    return { text: `Đã đổi sang cảnh ${picked.title}.` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const t = find(String(e.props.scene))

    if (t === undefined || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={svgOf(t)} alt={`Cảnh pixel: ${t.title}`} />
  })
}
