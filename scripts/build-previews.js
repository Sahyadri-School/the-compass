#!/usr/bin/env node
// Renders a cover thumbnail and a short "preview" of each locally hosted
// issue PDF to JPEG files, so the site can show the real cover and let
// visitors flip through the front matter (cover, statement of intent,
// contents) before deciding to download a 10-20 MB file.
//
// Output (not committed -- regenerated on every deploy, so it always
// matches the current PDF, including corrected versions):
//   previews/<id>/cover.jpg        small cover for the archive / current issue
//   previews/<id>/1.jpg ... N.jpg  preview pages, in reading order
//
// How many pages count as "front matter": these magazines number the
// front matter in roman numerals (ii, iii, iv ...) and start the body at
// page "1", so the preview runs from the cover up to the page before the
// first page numbered 1 (clamped to 3-8 pages). If that can't be worked
// out, it falls back to the first 4 pages.
//
// Needs poppler's command line tools (pdftoppm, pdftotext):
//   Ubuntu/Debian: sudo apt-get install poppler-utils     macOS: brew install poppler
//
// Run by .github/workflows/deploy-pages.yml before issues.json is built.
// An issue whose PDF can't be rendered is skipped (the site then falls
// back to its generated cover and shows no Preview button for it).

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ISSUES_DIR = path.join(ROOT, "data", "issues");
const OUT_DIR = path.join(ROOT, "previews");

const PAGE_WIDTH = 720;      // px, preview pages (wide enough to read the contents)
const COVER_WIDTH = 420;     // px, thumbnail cover
const JPEG_OPTS = "quality=72,progressive=y,optimize=y";
const MIN_PAGES = 3, MAX_PAGES = 8, FALLBACK_PAGES = 4, SCAN_LIMIT = 14;

const isRemote = f => /^https?:\/\//i.test(f);

function haveTool(cmd){
  try{ execFileSync(cmd, ["-v"], { stdio: "ignore" }); return true; }
  catch(e){ return e.code !== "ENOENT"; }   // poppler tools print their version and may exit non-zero
}

function pageText(pdf, p){
  return execFileSync("pdftotext", ["-f", String(p), "-l", String(p), pdf, "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

// The printed page number in a page's footer: "... Page iii" / "Page 12",
// or a bare numeral on its own last line.
function printedNumber(text){
  const withWord = [...text.matchAll(/Page\s+([ivxlc]+|\d+)/gi)];
  if (withWord.length) return withWord[withWord.length - 1][1];
  const lines = text.trim().split("\n");
  const last = (lines[lines.length - 1] || "").trim();
  const bare = /^([ivxlc]{1,6}|\d{1,3})$/i.exec(last);
  return bare ? bare[1] : null;
}

function frontMatterPages(pdf){
  for (let p = 2; p <= SCAN_LIMIT; p++){
    let text;
    try{ text = pageText(pdf, p); }catch(e){ break; }          // ran past the end of a very short PDF
    if (printedNumber(text) === "1") return Math.min(MAX_PAGES, Math.max(MIN_PAGES, p - 1));
  }
  return FALLBACK_PAGES;
}

function render(pdf, page, width, outBase){
  execFileSync("pdftoppm", [
    "-jpeg", "-jpegopt", JPEG_OPTS, "-f", String(page), "-l", String(page),
    "-singlefile", "-scale-to-x", String(width), "-scale-to-y", "-1", pdf, outBase
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function main(){
  if (!haveTool("pdftoppm") || !haveTool("pdftotext")){
    console.error("pdftoppm/pdftotext not found. Install poppler (Ubuntu: sudo apt-get install poppler-utils, macOS: brew install poppler).");
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(ISSUES_DIR)){ console.log("No data/issues/ folder -- nothing to do."); return; }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const issues = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json")).map(f => {
    try{ return JSON.parse(fs.readFileSync(path.join(ISSUES_DIR, f), "utf8")); }
    catch(e){ console.error(`Skipping ${f}: ${e.message}`); return null; }
  }).filter(Boolean);

  let failed = 0, done = 0, totalBytes = 0;
  for (const is of issues){
    if (!is.file || isRemote(is.file)) { console.log(`  skip  ${is.id}  (not a local PDF)`); continue; }
    const pdf = path.join(ROOT, is.file);
    if (!fs.existsSync(pdf)) { console.error(`  MISSING ${is.id}  ${is.file}`); failed++; continue; }

    const tmp = path.join(OUT_DIR, `${is.id}.tmp`), final = path.join(OUT_DIR, String(is.id));
    try{
      fs.mkdirSync(tmp, { recursive: true });
      const n = frontMatterPages(pdf);
      render(pdf, 1, COVER_WIDTH, path.join(tmp, "cover"));
      for (let p = 1; p <= n; p++) render(pdf, p, PAGE_WIDTH, path.join(tmp, String(p)));
      fs.renameSync(tmp, final);                              // only appears once fully written
      const bytes = fs.readdirSync(final).reduce((s, f) => s + fs.statSync(path.join(final, f)).size, 0);
      totalBytes += bytes; done++;
      console.log(`  ok    ${is.id}  ${n} preview pages + cover  (${(bytes / 1024).toFixed(0)} KB)`);
    }catch(e){
      fs.rmSync(tmp, { recursive: true, force: true });
      console.error(`  FAIL  ${is.id}  ${String(e.stderr || e.message).trim().slice(0, 160)}`);
      failed++;
    }
  }
  console.log(`\nPreviews built for ${done} issue(s), ${(totalBytes / 1048576).toFixed(1)} MB total${failed ? `, ${failed} failed` : ""}.`);
  if (failed) process.exitCode = 1;
}

main();
