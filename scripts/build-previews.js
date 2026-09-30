#!/usr/bin/env node
// Renders every page of each locally hosted issue PDF to a JPEG, so the site
// can show the real cover and let visitors read through the whole issue in
// the page viewer without downloading a 10-20 MB file first.
//
// Output (not committed -- regenerated when a PDF changes, so it always
// matches the current PDF, including corrected versions):
//   previews/<id>/cover.jpg        small cover for the archive / current issue
//   previews/<id>/1.jpg ... N.jpg  every page, in order
//   previews/<id>/meta.json        { pages: N, front: F }
//
// `front` is how many front-matter pages come before the body's page "1".
// These magazines number the front matter in roman numerals (the cover is
// unnumbered) and start the body at page 1, so the viewer can show the same
// page numbers the printed contents use. It's read from the footers of the
// first 14 pages; if it can't be worked out, front = 0 and the viewer just
// numbers pages 1..N.
//
// Needs poppler's command line tools (pdftoppm, pdftotext, pdfinfo):
//   Ubuntu/Debian: sudo apt-get install poppler-utils     macOS: brew install poppler
//
// Run by .github/workflows/deploy-pages.yml before issues.json is built.
// An issue whose PDF can't be rendered is skipped (the site then keeps its
// drawn cover and shows no Preview tag for it).

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile, execFileSync } = require("child_process");
const { promisify } = require("util");
const run = promisify(execFile);

const ROOT = path.join(__dirname, "..");
const ISSUES_DIR = path.join(ROOT, "data", "issues");
const OUT_DIR = path.join(ROOT, "previews");

const PAGE_WIDTH = 720;      // px -- sharp enough to read body text and formulas
const COVER_WIDTH = 420;     // px, thumbnail cover
const JPEG_OPTS = "quality=70,progressive=y,optimize=y";
const SCAN_PAGES = 14;       // how far into the PDF to look for where the body starts
const CONCURRENCY = Math.max(1, Math.min(4, os.cpus().length));
const BIG = { maxBuffer: 64 * 1024 * 1024 };

const isRemote = f => /^https?:\/\//i.test(f);

function haveTool(cmd){
  try{ execFileSync(cmd, ["-v"], { stdio: "ignore" }); return true; }
  catch(e){ return e.code !== "ENOENT"; }   // poppler tools print their version and may exit non-zero
}

// The printed page number in a page's footer: "... Page iii" / "Page 12",
// or a bare numeral on the page's last line.
function printedNumber(text){
  const withWord = [...text.matchAll(/Page\s+([ivxlc]+|\d+)/gi)];
  if (withWord.length) return withWord[withWord.length - 1][1];
  const lines = text.trim().split("\n");
  const last = (lines[lines.length - 1] || "").trim();
  const bare = /^([ivxlc]{1,6}|\d{1,3})$/i.exec(last);
  return bare ? bare[1] : null;
}

async function pageCount(pdf){
  const { stdout } = await run("pdfinfo", [pdf]);
  const m = /^Pages:\s+(\d+)/m.exec(stdout);
  if (!m) throw new Error("could not read the page count");
  return +m[1];
}

async function frontMatterLength(pdf, total){
  const { stdout } = await run("pdftotext", ["-f", "1", "-l", String(Math.min(SCAN_PAGES, total)), pdf, "-"], BIG);
  const pages = stdout.split("\f");
  for (let i = 1; i < pages.length; i++)                       // pages[i] is PDF page i+1; the cover (page 1) is never numbered
    if (printedNumber(pages[i]) === "1") return i;             // i pages come before the body's page 1
  return 0;
}

async function renderIssue(is){
  const pdf = path.join(ROOT, is.file);
  const tmp = path.join(OUT_DIR, `${is.id}.tmp`), final = path.join(OUT_DIR, String(is.id));
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  try{
    const total = await pageCount(pdf);
    const front = await frontMatterLength(pdf, total);

    // every page in one pass (faster than one process per page)
    await run("pdftoppm", ["-jpeg", "-jpegopt", JPEG_OPTS, "-scale-to-x", String(PAGE_WIDTH), "-scale-to-y", "-1", pdf, path.join(tmp, "p")], BIG);
    for (const f of fs.readdirSync(tmp)){                      // poppler names them p-001.jpg ...; we want 1.jpg ...
      const m = /^p-(\d+)\.jpg$/.exec(f);
      if (m) fs.renameSync(path.join(tmp, f), path.join(tmp, `${parseInt(m[1], 10)}.jpg`));
    }
    await run("pdftoppm", ["-jpeg", "-jpegopt", JPEG_OPTS, "-f", "1", "-l", "1", "-singlefile", "-scale-to-x", String(COVER_WIDTH), "-scale-to-y", "-1", pdf, path.join(tmp, "cover")], BIG);

    const made = fs.readdirSync(tmp).filter(f => /^\d+\.jpg$/.test(f)).length;
    if (made !== total) throw new Error(`rendered ${made} of ${total} pages`);
    fs.writeFileSync(path.join(tmp, "meta.json"), JSON.stringify({ pages: total, front }) + "\n");

    fs.rmSync(final, { recursive: true, force: true });
    fs.renameSync(tmp, final);                                 // only appears once fully written
    const bytes = fs.readdirSync(final).reduce((s, f) => s + fs.statSync(path.join(final, f)).size, 0);
    return { ok: true, id: is.id, total, front, bytes };
  }catch(e){
    fs.rmSync(tmp, { recursive: true, force: true });
    return { ok: false, id: is.id, error: String(e.stderr || e.message).trim().slice(0, 200) };
  }
}

async function main(){
  if (!haveTool("pdftoppm") || !haveTool("pdftotext") || !haveTool("pdfinfo")){
    console.error("poppler tools not found. Install poppler (Ubuntu: sudo apt-get install poppler-utils, macOS: brew install poppler).");
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(ISSUES_DIR)){ console.log("No data/issues/ folder -- nothing to do."); return; }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const todo = [];
  for (const f of fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json"))){
    let is;
    try{ is = JSON.parse(fs.readFileSync(path.join(ISSUES_DIR, f), "utf8")); }
    catch(e){ console.error(`Skipping ${f}: ${e.message}`); continue; }
    if (!is.file || isRemote(is.file)) { console.log(`  skip  ${is.id}  (not a local PDF)`); continue; }
    if (!fs.existsSync(path.join(ROOT, is.file))) { console.error(`  MISSING ${is.id}  ${is.file}`); process.exitCode = 1; continue; }
    todo.push(is);
  }

  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length){
      const r = await renderIssue(todo[next++]);
      results.push(r);
      console.log(r.ok
        ? `  ok    ${r.id}  ${r.total} pages (front matter ${r.front})  ${(r.bytes / 1048576).toFixed(1)} MB`
        : `  FAIL  ${r.id}  ${r.error}`);
    }
  }));

  const ok = results.filter(r => r.ok), bad = results.filter(r => !r.ok);
  const pages = ok.reduce((s, r) => s + r.total, 0), mb = ok.reduce((s, r) => s + r.bytes, 0) / 1048576;
  console.log(`\nRendered ${pages} pages for ${ok.length} issue(s), ${mb.toFixed(0)} MB total${bad.length ? `, ${bad.length} failed` : ""}.`);
  if (bad.length) process.exitCode = 1;
}

main();
