# CNC Lathe Helper PWA

Offline phone-friendly PWA for CNC lathe work notes and Phase 1 manual movement calculations.

## Phase 1

Manual movement calculator:

- Touch-off / current X diameter
- Target circle / final diameter
- Z face value
- Plunge depth from face
- Z direction
- Insert width and radius
- Saved calculations
- Saved work notes
- Local-only storage
- Offline service worker

## Example

Touch off at `X24.000`, target circle/diameter `3.000`, face at `Z0.000`, plunge depth `.500`, DB `.187 x .015` insert.

Output:

```text
Move to: X3.000 Z-.500
Radial X travel: 10.500
```

Math:

```text
Radial X travel = (24.000 - 3.000) / 2 = 10.500
Target Z = 0.000 - .500 = Z-.500
```

## Install on GitHub Pages

1. Upload `index.html`, `manifest.json`, and `sw.js` to the repository root.
2. Enable GitHub Pages for the repository.
3. Open the GitHub Pages URL on the phone.
4. Use browser menu → Add to Home Screen / Install app.

## Notes

This app does not generate G-code yet. Phase 2 can add a code builder after the manual move math is trusted.
Always verify machine setup, control mode, diameter/radius display, tool orientation, clearance, and offsets before moving or cutting.
