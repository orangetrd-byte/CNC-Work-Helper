# CNC Lathe Work Helper PWA

Offline phone-friendly PWA for CNC lathe work notes, manual movement calculations, a tool library, saved calculations, and draft G-code output.

## Phase 1 Features

- Notes-first workflow
- Manual X/Z lathe movement calculator
- Example: touch off at `X24.000`, cut a `3.000` circle/diameter, face at `Z0.000`, plunge `.500` with `DB .187 x .015`
- Output: `X3.000 Z-.500`
- Shows radial X travel: `(24.000 - 3.000) / 2 = 10.500`
- Tool library for inserts
- Saved calculations and notes using localStorage
- G-code Output tab for draft movement code
- Offline service worker

## Important Safety Note

The G-code output is draft movement code only. Always verify:

- Machine mode
- X diameter/radius mode
- Work offset
- Tool offset
- Clearance
- Feed and speed
- Spindle direction
- Insert orientation
- Collision risk

## GitHub Pages Install

1. Upload `index.html`, `manifest.json`, `sw.js`, and `README.md` to a GitHub repository.
2. Enable GitHub Pages from the repository settings.
3. Open the Pages URL on the phone.
4. Use browser menu → Add to Home Screen / Install App.

## Files

- `index.html` — full app
- `manifest.json` — PWA install metadata
- `sw.js` — offline cache service worker
- `README.md` — project notes


## Update

- G-code output now auto-generates after a manual move calculation.
- G-code updates live when approach X/Z, feed, speed, tool call, or comment changes.
- Added a rough SVG plot for the generated movement path. Solid line = feed move, dashed line = rapid retract.

Safety: the plot and code are draft aids only. Always verify machine mode, offsets, clearances, spindle, feed, and setup before running.
