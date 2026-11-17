import type { makeColors } from './make-colors.js'

export type SceneTheme = {
  id: string
  title: string
  veil: number
  tint?: string
  hue: number
  sat: number
  accent: string
  only?: 'dark'
  draw: () => string
}

export const THEMES: SceneTheme[]
export function paletteOf(theme: SceneTheme): Parameters<typeof makeColors>[0]
