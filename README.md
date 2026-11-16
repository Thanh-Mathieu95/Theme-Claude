# Pixel Scenes — animated pixel-art themes for Claude

Sixteen hand-drawn, animated pixel-art backdrops for the Claude desktop and mobile apps. Each scene comes with its own matching color palette, a frosted veil tuned so text stays readable, and an optional ambient sound loop. Switch between them with one command: `/scene`.

Everything in this repository is original. The scenes are drawn in code, pixel by pixel, and the sounds are synthesized from noise and sine waves — no photos, artwork or audio samples from anyone else.

![Landscape scenes](docs/landscapes.png)

![City scenes](docs/cities.png)

![Side-framed scenes](docs/framed.png)

The screenshots are still frames. In the app the scenes move.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [The 16 scenes](#the-16-scenes)
- [Ambient sound](#ambient-sound)
- [Readability and accessibility](#readability-and-accessibility)
- [Limitations](#limitations)
- [Customizing](#customizing)
- [Development](#development)
- [Uninstall](#uninstall)
- [License](#license)

## Features

- **16 scenes in three groups**: 6 landscapes, 6 cities, and 4 "side-framed" scenes whose artwork sits at the left and right edges so the conversation never covers it.
- **Real animation**: drifting clouds, sparkling water, falling snow, rain, petals and leaves, pulsing neon signs and aurora, twinkling stars and windows. All of it is CSS inside the SVG — no scripts.
- **A color palette per scene**: the app's surfaces, text and accent color are tinted to match the scene. Ten scenes support both light and dark mode; six night scenes are dark-only.
- **A veil tuned per scene**: the frosted panel behind the conversation has its own strength for every scene, measured from how bright that scene is. Night scenes also tint the veil with their own color.
- **Ambient sound, optional**: rain, waves, waterfall, wind or night crickets, depending on the scene. One command turns it off, and the choice is remembered.
- **Your choice persists**: the scene and the sound setting are saved and restored in every new session.
- **Small and self-contained**: one hooks module, no dependencies, no network access. The largest scene is about 87 KB of SVG.

## Requirements

- **Claude desktop app or Claude mobile app** to see the themes. A recent version with plugin (mod) support is required.
- **Claude Code** to install the plugin (the install command runs at a Claude Code prompt).
- For sound: **Windows** (uses the built-in PowerShell sound player) or **macOS**. See [Ambient sound](#ambient-sound).

The terminal and editor extensions do not draw themes. The plugin loads there without errors, but nothing changes visually.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install pixel-scenes --marketplace Thanh-Mathieu95/Theme-Claude
```

Or from a shell:

```
claude plugin install pixel-scenes --marketplace Thanh-Mathieu95/Theme-Claude
```

You will be asked two things:

1. `Add marketplace?` — answer `y`. This adds this repository as a plugin source.
2. A scope — press Enter to accept the **user** scope, which makes the theme available in every session.

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, choose **Plugins**, **Add marketplace**, enter `Thanh-Mathieu95/Theme-Claude`, then **Add plugin**.

After installing, start a new session in the desktop app. The default scene (`pho-bien`, the coastal city) appears right away.

## Usage

Type these in the message box of a session:

| Command | What it does |
| --- | --- |
| `/scene` | Lists all 16 scenes and shows whether sound is on or off |
| `/scene 9` | Switches to scene number 9 |
| `/scene neon` | Switches to a scene by its name |
| `/scene next` | Switches to the next scene in the list |
| `/scene sound off` | Turns ambient sound off |
| `/scene sound on` | Turns ambient sound on |
| `/scene sound` | Toggles ambient sound |

The command's replies are written in Vietnamese; the scene names below are the ones you type.

## The 16 scenes

"Modes" says which app color modes the scene has a palette for. A dark-only scene asks the app to draw in dark mode.

### Landscapes

| # | Name | Scene | Motion | Sound | Modes |
| --- | --- | --- | --- | --- | --- |
| 1 | `ho-nui` | Snowy peaks over a mountain lake, pine forest | drifting clouds, sparkling water | wind | light + dark |
| 2 | `hoang-hon-bien` | Sunset over the sea, palm silhouettes | sparkling sun path | waves | dark |
| 3 | `rung-suong` | Misty pine forest at dawn | breathing fog, drifting birds | wind | light + dark |
| 4 | `sa-mac` | Desert dunes and mesas at dusk | twinkling stars, drifting clouds | wind | light + dark |
| 5 | `cuc-quang` | Aurora over snowy hills and a cabin | pulsing aurora, twinkling stars | wind | dark |
| 6 | `hoa-anh-dao` | Cherry blossoms by a lake under a snowy peak | falling petals, sparkling water | waves | light + dark |

### Cities

| # | Name | Scene | Motion | Sound | Modes |
| --- | --- | --- | --- | --- | --- |
| 7 | `pho-bien` | Coastal city seen from a green hill (default) | drifting clouds, sparkling water | waves | light + dark |
| 8 | `pho-dem` | Night skyline under a full moon, reflected in water | twinkling windows and stars | night crickets | dark |
| 9 | `neon` | Neon city in the rain | falling rain, pulsing neon signs | rain | dark |
| 10 | `pho-hoang-hon` | Skyline silhouette against a huge setting sun | sparkling river | waves | dark |
| 11 | `pho-tuyet` | Snowy city at dusk, street lamps, pines | falling snow | wind | dark |
| 12 | `cau-cang` | Suspension bridge and harbor at sunrise | drifting clouds, sparkling water | waves | light + dark |

### Side-framed scenes

The artwork is concentrated at the left and right edges; the middle is a calm sky, so the conversation covers nothing.

| # | Name | Scene | Motion | Sound | Modes |
| --- | --- | --- | --- | --- | --- |
| 13 | `tre-dem` | Bamboo grove at night with two red lanterns | glowing lanterns, fireflies | night crickets | dark |
| 14 | `hem-pho` | Two rows of lit towers framing a dusk sky | pulsing neon signs, blinking string lights | night crickets | dark |
| 15 | `thac-doi` | Twin waterfalls on rock cliffs, lake and far peaks | shimmering falls, mist, clouds | waterfall | light + dark |
| 16 | `la-thu` | Two autumn maples framing a golden field | falling leaves | wind | light + dark |

## Ambient sound

Each scene plays one of five seamless 7-second loops: **rain**, **waves**, **waterfall**, **wind** or **night** (crickets). Switching scenes switches the loop.

- Sound is **on by default**. `/scene sound off` stops it immediately and it stays off in later sessions until you turn it back on.
- Sound only starts when a surface is actually drawing the theme, so a terminal-only session stays silent.
- The loops are synthesized by `tools/make-sounds.mjs` (filtered noise and sine bursts). They sound simpler than field recordings, by design: no samples are bundled.

Platform notes:

| Platform | How it plays | Notes |
| --- | --- | --- |
| Windows | PowerShell's built-in `System.Media.SoundPlayer`, in a child process that ends with the session | Volume is fixed by the file; use the Windows volume mixer to adjust it |
| macOS | The engine's own player (`afplay`) | |
| Linux | Not supported | The engine has no player there; the theme works, silently |

If a loop cannot start, the plugin shows a toast naming the reason instead of failing silently.

## Readability and accessibility

- **Veil strength is measured, not guessed.** For each scene, the opacity of the frosted panel behind the conversation was chosen from the contrast between the theme's text colors and the brightest (or darkest) parts of the scene behind it.
- **Reduced motion is respected.** If your operating system is set to reduce motion, every scene is drawn still.
- **Animation is deliberately slow and small.** Clouds take 90 seconds to drift a few pixels; only the rain in `neon` is fast.
- **Each scene has alt text** describing it.
- **Palettes are checked.** Every palette is generated with the app's own color helper and verified to be one the desktop app will paint.

## Limitations

- **Fonts cannot be changed.** A Claude theme controls colors and the backdrop only.
- **The terminal and editor extensions draw no theme.** This is a desktop and mobile look.
- **Bright daytime scenes in dark mode.** `ho-nui`, `hoa-anh-dao`, `pho-bien`, `cau-cang`, `thac-doi` and `la-thu` have bright skies. Their veil is kept lighter than strict contrast would ask for, so the middle of the window is not a dark slab; white text over the brightest patches is weaker there. They read best in light mode.
- **Narrow windows crop the sides.** Scenes are scaled to fill the window, so a tall, narrow window cuts off the left and right edges — which is where the side-framed scenes keep their artwork.
- **Permission prompts keep the app's own look.**
- **Command replies are in Vietnamese.**

## Customizing

All scenes live in one file, [`hooks/scenes.js`](hooks/scenes.js). Each is a short function built from shared helpers (`bands`, `ridge`, `peaks`, `skyline`, `pines`, `clouds`, `twinkle`, `falling`, …) on a 320×180 pixel grid.

To add a scene:

1. Write a new `scene(seed, () => { … })` function in `hooks/scenes.js`. Keep the SVG under 131,072 characters.
2. Add an entry to the `THEMES` array at the bottom of that file:

   ```js
   { id: 'my-scene', sound: 'wind', veil: 0.5, title: 'My scene', hue: 210, sat: 30, accent: '#2f7fd6', draw: myScene },
   ```

   | Field | Meaning |
   | --- | --- |
   | `id` | The name typed after `/scene` (letters, digits, `-`) |
   | `title` | Shown in the list and used as alt text |
   | `sound` | One of `rain`, `waves`, `waterfall`, `wind`, `night` |
   | `veil` | Opacity of the panel behind the conversation, 0 to 1. Brighter scenes need more |
   | `tint` | Optional raw color for the veil. Only for single-mode scenes, since it does not follow light/dark |
   | `hue`, `sat` | Hue and saturation of the app's tinted grays |
   | `accent` | The accent color (links, buttons, code keywords) |
   | `only` | `'dark'` for a scene made for dark mode only |

To change the veil blur for every scene, edit `glass: { blur: 12, … }` in [`hooks/register.tsx`](hooks/register.tsx). To change the default scene, edit `DEFAULT` in the same file.

## Development

```
git clone https://github.com/Thanh-Mathieu95/Theme-Claude
claude --plugin-dir Theme-Claude
```

`--plugin-dir` loads the plugin straight from the folder and hot-reloads it as you edit.

| Task | Command |
| --- | --- |
| Validate the manifest and hooks module | `claude plugin validate .` |
| Type-check (after the engine has loaded the plugin once, which writes its types) | `npx -p typescript tsc -p .` |
| Regenerate the sound loops | `node tools/make-sounds.mjs` |

Repository layout:

```
.claude-plugin/plugin.json        plugin manifest
.claude-plugin/marketplace.json   makes this repository installable
hooks/hooks.json                  names the hooks module
hooks/register.tsx                /scene command, theme, sound, backdrop hook
hooks/scenes.js                   the 16 scenes, palettes and scene list
hooks/make-colors.js              the app's color helper (copied, unmodified)
sounds/*.wav                      five synthesized ambient loops
tools/make-sounds.mjs             generator for the loops
docs/*.png                        preview images for this README
```

## Uninstall

```
/plugin uninstall pixel-scenes
```

The app's own look returns in the next session.

## License

[MIT](LICENSE) © Nguyen Duong Cong Thanh. The pixel art and the ambient sounds are original work and are covered by the same license.
