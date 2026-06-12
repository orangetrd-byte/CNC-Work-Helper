# CNC Work Helper Phase Plan

## Summary

CNC Work Helper is the advanced machinist utility and reference app. It should remain separate from Green Hat and focus on faster expert workflows: notes, setup references, movement calculations, tool/feed libraries, plotting, saved jobs, and draft G-code aids.

Default constraints:

- Keep the app static and offline-capable on GitHub Pages.
- Keep data local with import/export backup.
- Keep beginner training content in Green Hat.
- Keep production planning and traveler scheduling in CNC Cell Planner.

## Phase 1: Advanced Utility Stability

- Stabilize job notes, setup references, movement calculator, tool/feed libraries, plotting, and draft G-code output.
- Keep safety warnings prominent around generated code and plots.
- Preserve saved job workflows: new, save, load, duplicate, recent, import, and export.
- Avoid auto-save behavior that surprises users during refresh or startup.

## Phase 2: Calculator And Reference Depth

- Improve lathe movement calculations using diameter-based X.
- Improve tool label parsing, speed/feed lookup, and custom saved library workflows.
- Expand advanced reference material where it helps experienced users work faster.
- Keep beginner explanation-heavy material out unless it belongs in Green Hat.

## Phase 3: Plotting And Verification

- Improve rough plot clarity for stock, target, plunge, and path preview.
- Add better pre-run verification prompts for offsets, X diameter/radius mode, tool orientation, spindle/feed, and clearance.
- Keep plots and generated G-code clearly labeled as draft aids only.

## Phase 4: Power-User Workflow

- Improve reusable setup templates, saved libraries, and faster job duplication.
- Improve export/import recovery for full app data and individual jobs.
- Add stronger editor/checker features only if they remain clearly scoped as verification aids.

## Acceptance Rules

- Generated code and plots must never be presented as machine-ready without verification.
- Advanced reference content belongs here, not in Green Hat.
- Every PWA-facing change that affects cached files must bump the visible version and `sw.js` cache name.
- Before editing, confirm local `main` is clean and aligned with `origin/main`.
