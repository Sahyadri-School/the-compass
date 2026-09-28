# The Compass — website

Online magazine of the Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI).

The core site is a single file, `index.html` — no build step, runs on GitHub Pages as is. A few supporting pages (submissions, 404) and files (SEO, housekeeping) sit alongside it; see the folder layout below.

## Folder layout

```
the-compass/
├── .github/
│   ├── workflows/deploy-pages.yml    ← builds & deploys to Pages, runs checks
│   └── ISSUE_TEMPLATE/               ← bug report & content suggestion forms
├── .pages.yml                     ← Pages CMS config (see "Adding a new issue")
├── index.html
├── submit.html                   ← "Write for us" submissions page
├── 404.html                      ← styled not-found page
├── robots.txt
├── sitemap.xml
├── CONTRIBUTING.md                ← workflow notes for editors
├── README.md
├── scripts/
│   └── build-issues-index.js      ← combines data/issues/* into data/issues.json
├── data/
│   ├── issues.json                ← GENERATED — don't edit directly, see below
│   └── issues/                    ← the real source: one file per issue
│       ├── 3-3.json
│       ├── 3-2.json
│       └── …
├── pdfs/                         ← magazine PDFs go here
│   ├── The-Compass-Vol-3-3.pdf
│   ├── The-Compass-Vol-3-2.pdf
│   └── …
└── covers/                       ← optional cover images
    └── vol-3-3.jpg
```

PDF file names must match the `file` entries in the `ISSUES` list near the bottom of `index.html`.

## Repo hygiene

- `main` is protected against force-pushes and deletion.
- Site deploys are handled by `.github/workflows/deploy-pages.yml` — GitHub Pages is set to "Deploy from GitHub Actions" in **Settings → Pages**, not "Deploy from a branch".
- Every push runs a `checks` job first: an internal-link checker and a Lighthouse CI report (accessibility/performance). Both are informational — neither blocks a deploy — so check the Actions run summary occasionally for anything they flag.
- Issue templates live in `.github/ISSUE_TEMPLATE/` — bug reports and content-correction suggestions get a structured form; the config also points people submitting *articles* to `submit.html` instead.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for the day-to-day editing workflow.

## Publishing on GitHub Pages

1. Create a new public repository on GitHub (for example `the-compass`).
2. Add all the files in this repo — `index.html`, `submit.html`, `404.html`, `robots.txt`, `sitemap.xml`, `README.md` — plus the `pdfs` folder (see the note on large files below).
3. In the repository, open **Settings → Pages**. Under "Build and deployment", choose **GitHub Actions** as the source (the workflow at `.github/workflows/deploy-pages.yml` handles the rest — no branch/folder to pick).
4. After a minute or two the site is live at `https://<your-username>.github.io/the-compass/`.

## Large PDF files: important

GitHub has file-size limits that matter for a magazine archive:

- **Uploading through the GitHub website is limited to 25 MB per file.** A 45 MB PDF must be added with **GitHub Desktop** or the `git` command line instead.
- GitHub warns about files over 50 MB and **refuses files over 100 MB**.
- Don't use Git LFS for the PDFs: GitHub Pages doesn't serve LFS files.
- A GitHub Pages site should stay under about 1 GB in total.

If issues grow past 100 MB, or the archive gets close to 1 GB, attach the PDFs to a **GitHub Release** instead (each file there can be up to 2 GB) and put the release download link in the `file` field. Downloads still work; the progress bar just changes to a "Starting download…" indicator, because the browser can't measure files hosted on a different address.

## Adding a new issue

Issue data lives in `data/issues.json` (not in `index.html` anymore), so there are two ways to add one:

### Option A — Pages CMS (recommended, no code editing)

This repo ships a `.pages.yml` config for [Pages CMS](https://pagescms.org), a free, open-source editor that works directly against a GitHub repo — it's just a web form, no code involved.

📄 **[docs/how-to-add-an-issue.pdf](docs/how-to-add-an-issue.pdf)** — a one-page printable guide for anyone on the editorial team doing this without touching code or GitHub directly.

1. Go to [app.pagescms.org](https://app.pagescms.org) and sign in with GitHub.
2. Install the Pages CMS GitHub App on this repo (first time only).
3. Open the repo — it'll pick up `.pages.yml` automatically.
4. Click **"Magazine issues"**, then **Add**.
5. Fill in the form — every field has a short explanation underneath it saying exactly what to type or upload. In short:
   - **Volume number** and **Issue number** — which volume this belongs to, and which issue within it (1st, 2nd, 3rd…).
   - **Month published** and **Year published** — pick from the dropdown / type the year.
   - **Issue code** — just Volume, a dash, Issue number (e.g. Volume 3 Issue 4 → `3-4`).
   - **Upload the issue (PDF)** — click to upload the actual magazine PDF.
   - **Cover picture** is optional — you can leave it blank and the site will draw a simple placeholder cover automatically.
6. Click **Save**. That's it — the new issue publishes automatically and is usually visible on the website within a minute or two.

You don't need to worry about the order you add issues in: the website automatically sorts by year and month, so whichever issue is dated latest is shown as the current issue — even if it wasn't the last one you added. Pages CMS's own "Magazine issues" list is sorted the same way (newest first) automatically too, so what you see while browsing there matches what visitors see on the site.

### Option B — edit the JSON by hand

Add a new file under `data/issues/`, named after the issue's code (e.g. `data/issues/3-4.json`):

```json
{ "id":"3-4", "volume":3, "number":4, "month":"October", "year":2026, "file":"pdfs/The-Compass-Vol-3-4.pdf", "size":"", "cover":"" }
```

- `size` — leave empty and the site reads the real file size once it's online, or type it yourself (`"45 MB"`).
- `cover` — leave empty for a generated cover, or give an image path such as `"covers/vol-3-4.jpg"` (an A4-shaped image around 600 × 850 px works well).
- Put the PDF itself in the `pdfs/` folder with the matching file name.

**Don't edit `data/issues.json` directly** — it's a generated file, combined automatically from everything in `data/issues/` by `scripts/build-issues-index.js`, which runs on every push (see `.github/workflows/deploy-pages.yml`). Direct edits to `data/issues.json` get overwritten the next time anything deploys. Always add or edit the individual files under `data/issues/` instead — whether by hand or through Pages CMS.

Issues can be added in any order — the website works out which is the current one automatically. Pages CMS's own "Magazine issues" list also sorts newest-first automatically, since each issue is its own file (that's what enables the sorting — see the comments at the top of `.pages.yml` for the technical reasoning if you're curious).

## Search

The Archive section has a search box that filters issues live by volume, month, or year — driven entirely by the `data/issues.json` data, no extra setup needed.

## Write for us

`submit.html` is a standalone page with submission guidelines for teachers and students who want to contribute. It's linked from the main nav ("Write for us") and the footer. Edit the topics list, guidelines, and the contact email directly in that file — it's independent of `index.html` and needs no build step either.

## Testing on your own computer

Opening `index.html` by double-clicking works, but file sizes and the download progress bar only appear when the site is served from a web address. To preview properly, run this in the folder and open `http://localhost:8000`:

```
python3 -m http.server 8000
```

## What's inside

- 3D brass compass: three.js. The case turns as you scroll, and the needle swings and settles back to north.
- Antique world map: d3 and Natural Earth data, drawn with engraved coastlines and portolan rhumb lines.
- Fonts: Cormorant Garamond (headings) and Source Sans 3 (body text), from Google Fonts.
- Accessibility: works with keyboard and screen readers, and respects the "reduce motion" setting. If 3D isn't available, a flat compass is shown instead.
- Dark mode: a toggle in the nav (moon/sun icon) switches the site's reading chrome — nav, sections, footer, forms — between light and dark. It defaults to the visitor's OS preference and remembers their choice via `localStorage`. The hero (compass + map) stays the same in both themes by design, like a book's cover art.
