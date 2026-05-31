# CNC Lathe Work Helper PWA

Offline phone-friendly PWA for CNC lathe job notes, setup references, manual movement calculations, tool/feed libraries, rough plotting, saved jobs, import/export, and draft G-code output.

## Features

- Notes-first job workflow
- Job records with part number, material, operation, machine, tool notes, and setup notes
- Setup tab for saved work offset, stock, chuck/jaw, stickout, coolant, inspection, and reference notes
- New Job, Save Job, Load Job, Duplicate Job, and Recent Jobs drawer
- Auto-save to localStorage and auto-resume on reload
- Manual X/Z lathe movement calculator using diameter-based X
- Example: touch off at `X24.000`, target `X3.000`, face `Z0.000`, plunge `.500`
- Output: `X3.000 Z-.500` and radial travel `10.500`
- Clear Calculator button for resetting move values quickly
- Premade and custom tool library
- Active tool dropdown on the calculator and G-code screens
- Tool label parsing such as `DB .187 x .015`
- Premade and custom speed/feed values
- Auto-updating draft G-code output with safe-start style lines and copy button
- Rough SVG plot for stock/target/plunge path preview
- Export current job JSON, export all data JSON, and import JSON job files
- Manifest and service worker for offline PWA use
- PWA icon metadata includes a 192x192 PNG manifest icon and SVG app icons

## Safety Note

The plot and generated G-code are draft aids only. Always verify machine mode, X diameter/radius mode, work offset, tool offset, clearances, spindle direction, feed, insert orientation, setup, and collision risk before running code.

## GitHub Pages Install

1. Upload `index.html`, `styles.css`, `app.js`, `job-loader.js`, `manifest.json`, `sw.js`, `README.md`, and the `icons/` folder to a GitHub repository.
2. Enable GitHub Pages from the repository settings.
3. Open the Pages URL on the phone.
4. Use the browser menu to add to home screen or install the app.

## Local Testing

Open `index.html` directly for basic testing, or serve the folder with a local static server to test the service worker.

## Files

- `index.html` - app shell
- `styles.css` - mobile-first UI
- `app.js` - job storage, calculator, G-code, plot, import/export
- `job-loader.js` - saved-job picker and calculator utility behavior
- `manifest.json` - PWA install metadata
- `sw.js` - offline cache service worker
- `icons/` - app, favicon, and UI icon assets
- `README.md` - project notes
