---
name: terminal-theme
description: Put one of the 16 Pixel Scenes pixel-art scenes behind Windows Terminal, with a matching color scheme, so Claude Code in the terminal gets the same look as the desktop app. Use when the user asks to theme, skin or change the background or colors of their terminal or Windows Terminal with a pixel scene, to switch the terminal to another scene, to make the terminal look like the /scene theme, or to remove that terminal theme.
---

# Terminal theme (Pixel Scenes)

The Pixel Scenes plugin draws its scenes in the Claude desktop and mobile apps only; a terminal cannot draw a plugin's theme. This skill gives the terminal the same look a different way: it sets one Windows Terminal profile, **Claude - Pixel Scenes**, to use a scene as its background image together with a color scheme made from that scene's palette.

Everything goes through one script beside this file, `terminal-theme.mjs`, run with Node.js (which Claude Code already needs). Run it by its full path in this skill's base directory.

## What the script changes

- Writes the scene as a 1920×1080 PNG to `%LOCALAPPDATA%\PixelScenes\`.
- In Windows Terminal's `settings.json`: adds or updates the one profile **Claude - Pixel Scenes** (fixed GUID, so it is never duplicated) and one color scheme named `Pixel Scenes - <scene title>`. No other profile or setting is touched.
- Before its first change it copies `settings.json` to `settings.json.bak-pixel-scenes` beside it.
- Windows Terminal reloads its settings by itself; an open tab on that profile changes at once.

The background image is still; the animation exists only in the desktop app.

## Steps

1. **Check the platform.** Windows Terminal is Windows only. On macOS or Linux, offer the image instead: `node "<base>/terminal-theme.mjs" --export <scene> <file.png>` writes the PNG, and the user sets it as their terminal's background by hand (iTerm2: Settings > Profiles > Window > Background Image).
2. **Pick the scene.** If the user did not name one, run `node "<base>/terminal-theme.mjs" --list` and let them choose. A scene is given by name (`neon`) or number (`9`). Scenes made for dark mode only suit a terminal best: `pho-dem`, `neon`, `tre-dem`, `hem-pho`, `cuc-quang`.
3. **Say what will change and get a yes**, in one or two sentences: one profile and one color scheme are added to Windows Terminal, the original settings are backed up first. Skip asking when the user already asked for exactly this.
4. **Apply:** `node "<base>/terminal-theme.mjs" <scene>`. Add `--opacity <0..1>` for the image strength (default 0.3; lower is easier to read).
5. **Tell the user how to open it:** in Windows Terminal, click the ▾ next to the + on the tab bar and choose **Claude - Pixel Scenes**; the tab starts `claude`. To open it by default: Settings > Startup > Default profile > Claude - Pixel Scenes > Save.

## Other requests

| The user wants | Run |
| --- | --- |
| another scene | `node "<base>/terminal-theme.mjs" <scene>` (the same profile is updated) |
| the text easier to read | the same scene again with `--opacity 0.2` |
| to remove it | `node "<base>/terminal-theme.mjs" --remove` (drops the profile and its schemes; keeps any scheme another profile uses) |
| everything exactly as before | copy `settings.json.bak-pixel-scenes` over `settings.json` in the same folder. Say that this also undoes any change made since the backup |

## When it fails

- **settings.json not found**: Windows Terminal is not installed or never opened. Ask the user to open it once.
- **settings.json has comments or trailing commas**: the script refuses to rewrite it rather than lose them. Offer the values for the user to paste through Settings > Open JSON file.
- **The tab opens but `claude` is not found**: Claude Code is not on the PATH for `cmd.exe`. Change the profile's command line in Windows Terminal's settings to how the user starts Claude Code.
