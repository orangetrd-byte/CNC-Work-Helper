# CNC Work Helper PWA

A phone-friendly offline PWA for CNC work notes and quick turret calculations.

## Features

- Offline installable PWA
- Local saved notes using `localStorage`
- Saved calculation history
- OD / ID diameter calculator
- Plunge / groove Z edge calculator
- Export saved data as JSON
- GitHub Pages friendly

## Files

```text
index.html
manifest.json
sw.js
README.md
```

## Basic machining logic

Turning X is diameter based.

```text
OD target X = start diameter - radial depth × 2
ID target X = start diameter + radial depth × 2
```

Example:

```text
Start OD = 24.000
Radial depth = .186
X = 24.000 - (.186 × 2)
X = 23.628
```

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload these files to the root of the repo.
3. Go to Settings → Pages.
4. Set source to the main branch and root folder.
5. Open the GitHub Pages URL on the phone.
6. Use browser menu → Add to Home Screen / Install App.

## Notes

This calculator is a helper, not a replacement for setup verification. Always verify turret orientation, tool side, offset direction, compensation, safe clearance, and control format before running a program.
