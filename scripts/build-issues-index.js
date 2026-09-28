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

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "data", "issues");
const OUT_FILE = path.join(__dirname, "..", "data", "issues.json");

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
