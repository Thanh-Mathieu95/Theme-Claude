import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { paletteOf, THEMES } from './scenes.js'
import type { SceneTheme } from './scenes.js'

const DEFAULT = 'pho-bien'
const LIST = THEMES.map((t, i) => `${i + 1}. ${t.id} — ${t.title}`).join('\n')
const HELP =
  'Gõ /scene <số hoặc tên> để đổi, /scene next để sang cảnh kế.\n' +
  'Âm thanh nền: /scene sound off để tắt, /scene sound on để bật.'

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

// Vòng âm thanh đang phát; đổi cảnh hoặc tắt tiếng thì dừng nó trước
let playing: AbortController | undefined
const silence = () => {
  playing?.abort()
  playing = undefined
}
const isSoundOn = async ($: EngineInterface) => (await $.store.get('sound')) !== false
// Windows: engine không có trình phát, nên nhờ PowerShell phát lặp file .wav;
// tiến trình con sống cùng vòng lặp, dừng vòng lặp là tắt tiếng.
const PLAY_WAV = '$p = New-Object System.Media.SoundPlayer $env:PIXEL_SCENE_WAV; $p.PlayLooping(); Start-Sleep -Seconds 86400'
const ambience = async ($: EngineInterface, t: SceneTheme) => {
  silence()

  if (!(await isSoundOn($))) {
    return
  }
  const stop = new AbortController()
  playing = stop
  const complain = (err: unknown) => $.ui.toast(`Không phát được âm thanh: ${String(err)}`)

  if (/^[A-Za-z]:[\\/]/.test($.plugin.root)) {
    const child = $.process
      .spawn({
        argv: ['powershell', '-NoProfile', '-NonInteractive', '-Command', PLAY_WAV],
        env: { PIXEL_SCENE_WAV: `${$.plugin.root}\\sounds\\${t.sound}.wav` },
      })
      [Symbol.asyncIterator]()
    stop.signal.addEventListener('abort', () => void child.return?.(undefined as never))
    void (async () => {
      try {
        while (!(await child.next()).done) {
          // PowerShell không in gì; chỉ chờ nó kết thúc hoặc bị dừng
        }
      } catch (err) {
        if (!stop.signal.aborted) complain(err)
      }
    })()

    return
  }
  // Không chờ: vòng lặp chỉ kết thúc khi bị dừng
  void $.audio.play({ asset: `sounds/${t.sound}.wav` }, { shouldLoop: true, gain: 1, signal: stop.signal }).catch(complain)
}
const current = async ($: EngineInterface) => find(String((await $.store.get('scene')) ?? DEFAULT)) ?? THEMES[0]!

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: 'Đổi cảnh nền pixel: /scene <số hoặc tên>, /scene next, /scene sound on|off',
    })
    const saved = await current($)
    const set = await $.theme.set(look(saved))

    if (set.isDrawn) {
      await ambience($, saved)
    } else {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('session.end', ($, e, next) => {
    silence()

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') {
      return { text: `${LIST}\n\n${HELP}\nÂm thanh đang ${(await isSoundOn($)) ? 'bật' : 'tắt'}.` }
    }

    if (arg === 'sound' || arg === 'sound on' || arg === 'sound off') {
      const enabled = arg === 'sound' ? !(await isSoundOn($)) : arg === 'sound on'
      await $.store.set('sound', enabled)
      await ambience($, await current($))

      return { text: enabled ? 'Đã bật âm thanh nền.' : 'Đã tắt âm thanh nền.' }
    }
    const now = await current($)
    const picked = arg === 'next' ? THEMES[(THEMES.indexOf(now) + 1) % THEMES.length] : find(arg)

    if (picked === undefined) {
      return { text: `Không có cảnh "${arg}".\n${LIST}` }
    }
    await $.theme.set(look(picked))
    await $.store.set('scene', picked.id)
    await ambience($, picked)

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
