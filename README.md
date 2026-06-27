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
## Current Project Status

**Status as of June 27, 2026:** Active machinist-helper repo.

CNC Work Helper is the practical shop helper for CNC lathe work. It is separate from Helper and Green Hat. This repo is for more capable shop-floor utilities, saved jobs, setup references, calculators, plotting aids, and draft G-code assistance.

Where it stands:

- Core workflow is built around job notes, setup reference, lathe move calculations, tool/feed libraries, saved jobs, import/export, and offline use.
- Generated G-code and plots are draft aids only and must remain clearly safety-labeled.
- This repo can support experienced-user tools that would be too advanced for Green Hat.
- MGP build/version information must remain visible and cannot be removed.

Next practical focus:

- Improve reliability, validation, saved-job flow, calculator clarity, and safety checks before adding larger new features.

## Assistant Change Guidelines

Before making code or file changes in this repo:

1. Clarify the machinist-helper goal, assumptions, constraints, and measurable success criteria.
2. Use structured output for technical explanations, setup guidance, troubleshooting, risks, and workflow changes.
3. Compare options before changing calculators, G-code assistance, references, storage, dependencies, or AI behavior.
4. Keep brainstorming practical and shop-floor focused; do not use it to bypass machining safety or validation.
5. Give technical explanations when changing calculations, G-code checks, plotting, setup logic, references, or assistant fallback paths.
6. Draft concise documentation or handoff notes for user-facing workflow changes.
7. Use a troubleshooting checklist before fixing bugs in setup notes, saved jobs, calculators, import/export, or PWA behavior.
8. Add learning-path style content only when it supports safe app usage; keep full lessons in the tutorial repo.
9. Assess risks before adding automation, AI fallback, generated G-code, calculation changes, or reference changes.
10. Optimize only for a named goal such as reliability, readability, speed, offline use, or shop-floor clarity.

Permanent rule: MGP must remain visible in build/version information and cannot be removed, hidden, renamed, or replaced.

