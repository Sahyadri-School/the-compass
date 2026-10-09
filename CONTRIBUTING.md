# Contributing to The Compass website

This repo holds the website only — for submitting *articles or content* to the
magazine itself, see [submit.html](submit.html) or email
compass.math.2024@gmail.com. This file is about editing the site's code.

## Workflow

- `main` is the live branch — anything pushed here deploys automatically via
  the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`.
- `main` is protected: force-pushes and branch deletion are blocked. Direct
  pushes are still allowed for now since there's a single maintainer: for
  small, safe edits (typo fixes, adding an issue to `index.html`), pushing
  straight to `main` is fine.
- For anything larger, or once more than one person is editing, open a pull
  request instead: create a branch, push it, and open a PR against `main` so
  changes get a review before going live.

## Making common changes

- **Add a new issue** — use Pages CMS (no code editing needed), or add a
  file under `data/issues/` by hand (never edit `data/issues.json`
  directly — it's auto-generated and gets overwritten on every deploy).
  See the "Adding a new issue" section in [README.md](README.md).
- **Edit submission guidelines** — edit `submit.html` directly; it's a
  self-contained file independent of `index.html`.
- **Change site design or behaviour** — the styling is in `index.html`'s
  `<style>` block; the page's logic is in `assets/main.js` (loaded with
  `defer`, so it only starts after the three libraries just above it in
  `index.html` have loaded). There's no build step, so changes take effect
  as soon as they're pushed and the Actions workflow finishes (usually
  under a minute).

## Before pushing

- Run `python3 -m http.server 8000` and visit `http://localhost:8000` to
  sanity-check changes (don't just double-click `index.html` — see
  "Testing on your own computer" in [README.md](README.md) for why).
- If you edited `assets/main.js`, it's worth pasting it into a JS linter or
  running `node --check assets/main.js` from the repo root to catch syntax
  errors before they go live.

## Getting help

Contact compass.math.2024@gmail.com for anything not covered here.
