# Straighten NYC Grid

A tiny Chrome extension that rotates Google Maps so Manhattan's street grid runs straight up-and-down. It applies a CSS transform to the rendered map element — tiles, labels, satellite imagery all rotate together.

## Installation (unpacked)

1. Unzip this folder somewhere permanent.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the extension from the puzzle-piece menu so the icon is reachable.

## Usage

1. Open [google.com/maps](https://www.google.com/maps) and navigate to NYC.
2. Click the extension icon and toggle **Rotate map**.
3. Default rotation is **-28.9°**, the angle of the Commissioners' Plan grid. Drag the slider to fine-tune; use **Reset** to snap back.

The rotation is purely visual. Your cursor still hits the real map underneath — clicks, drags, and zoom keep working, they're just rotated.

## Notes

- The map canvas is scaled up slightly (~1.36×) to cover the corners that would otherwise show empty space after rotation. This means you see a bit less of the surrounding map, which is the only way to do this without cutting into the rendered area.
- Targets `#scene` (and a couple of fallback selectors) — Google occasionally renames things. If rotation stops working, the selector list in `content.js` is the place to update.
- No icons are bundled. Chrome will show a default puzzle-piece icon. Drop `icon16.png`, `icon48.png`, `icon128.png` into the folder and add an `"icons"` field to `manifest.json` if you want a custom one.
