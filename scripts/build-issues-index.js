#!/usr/bin/env node
// Combines data/issues/*.json (one file per issue — what Pages CMS edits,
// since only `type: collection` supports auto-sorting in its list view)
// into data/issues.json (a single array — what index.html actually fetches
// at runtime, since a static site can't list a folder's contents itself).
//
// Runs automatically in the deploy workflow on every push, so it's always
// in sync. DO NOT hand-edit data/issues.json directly — those edits will
// be silently overwritten the next time this runs. Edit or add files under
// data/issues/ instead (or use Pages CMS, which does that for you).
//
// Flag: --with-previews
//   Also folds in the images made by scripts/build-previews.js: for each
//   issue that has a previews/<id>/ folder it adds
//   `preview: { pages, front }` (page count, and how many front-matter pages
//   come before the body's page 1) and, unless the issue already sets its own
//   `cover`, points `cover` at previews/<id>/cover.jpg. The deploy workflow
//   passes this flag. It is opt-in so the committed data/issues.json never
//   refers to images that only exist after a deploy (previews/ is not in git).

const fs = require("fs");
const path = require("path");

const WITH_PREVIEWS = process.argv.includes("--with-previews");
const PREVIEWS_DIR = path.join(__dirname, "..", "previews");
const SRC_DIR = path.join(__dirname, "..", "data", "issues");
const OUT_FILE = path.join(__dirname, "..", "data", "issues.json");

// Matches fmtMB() in assets/main.js exactly, so a size computed here and
// one detected client-side (detectSizes()) never disagree.
function fmtMB(bytes){
  const mb = bytes / 1048576;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

const MONTH_ORDER = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
};

function main(){
  if (!fs.existsSync(SRC_DIR)){
    console.log(`No ${SRC_DIR} folder found — writing an empty issues.json.`);
    fs.writeFileSync(OUT_FILE, "[]\n");
    return;
  }

  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith(".json"));
  const issues = [];

  for (const file of files){
    const full = path.join(SRC_DIR, file);
    try{
      const raw = fs.readFileSync(full, "utf8");
      const data = JSON.parse(raw);
      issues.push(data);
    }catch(e){
      console.error(`Skipping ${file}: ${e.message}`);
    }
  }

  // Fill in `size` for local PDFs that don't already set one, so it's
  // correct on first paint (and for crawlers/no-JS) instead of only
  // appearing after the client's own HEAD-request check (see detectSizes()
  // in assets/main.js, which still runs as a fallback for anything missed
  // here — e.g. an issue added by hand before its PDF was committed).
  for (const is of issues){
    if (is.size || !is.file || /^https?:\/\//i.test(is.file)) continue;
    const full = path.join(__dirname, "..", is.file);
    if (!fs.existsSync(full)) continue;
    is.size = fmtMB(fs.statSync(full).size);
  }

  if (WITH_PREVIEWS){
    let n = 0;
    for (const is of issues){
      const dir = path.join(PREVIEWS_DIR, String(is.id));
      if (!fs.existsSync(dir)) continue;
      let meta;
      try{ meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")); }catch(e){ continue; }
      if (!meta.pages || !fs.existsSync(path.join(dir, `${meta.pages}.jpg`))) continue;   // incomplete -> leave the issue without a preview
      is.preview = { pages: meta.pages, front: meta.front || 0 };
      if (!is.cover && fs.existsSync(path.join(dir, "cover.jpg"))) is.cover = `previews/${is.id}/cover.jpg`;
      n++;
    }
    console.log(`Attached previews to ${n} of ${issues.length} issue(s).`);
  }

  // Sort newest-first (matches the site's own client-side sort — this is
  // mostly for tidiness when someone opens issues.json directly).
  issues.sort((a, b) =>
    (b.year - a.year) ||
    ((MONTH_ORDER[b.month] || 0) - (MONTH_ORDER[a.month] || 0)) ||
    ((b.number || 0) - (a.number || 0))
  );

  fs.writeFileSync(OUT_FILE, JSON.stringify(issues, null, 2) + "\n");
  console.log(`Wrote ${issues.length} issue(s) to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main();
