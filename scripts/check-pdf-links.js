#!/usr/bin/env node
// Checks that every issue's PDF link is actually reachable and returns a
// PDF -- not an HTML error/interstitial page -- catching problems the
// normal (offline, internal-only) link checker can't see: a PDF missing from
// a deploy or misnamed in an issue's entry, or -- if an issue ever points at
// an external host such as Google Drive -- a share link being revoked, a file
// being deleted or moved, or sharing permissions changing.
//
// Run on a schedule by .github/workflows/check-pdf-links.yml, which opens
// or updates a GitHub issue if anything's broken.

const fs = require("fs");
const path = require("path");

const ISSUES_DIR = path.join(__dirname, "..", "data", "issues");
const REPORT_FILE = path.join(__dirname, "..", "link-check-report.json");
const SITE_ORIGIN = "https://sahyadri-school.github.io/the-compass";

function isExternal(file){
  return /^https?:\/\//i.test(file);
}

function resolveUrl(file){
  return isExternal(file) ? file : `${SITE_ORIGIN}/${file.replace(/^\.?\//, "")}`;
}

async function checkOne(is){
  const url = resolveUrl(is.file);
  try{
    const res = await fetch(url, { redirect: "follow" });
    // Drain the body so slow/large responses don't hang the connection open;
    // we only need the headers.
    if (res.body && typeof res.body.cancel === "function") { try{ await res.body.cancel(); }catch(e){} }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    // A real PDF response should not come back as an HTML page -- Google
    // Drive serves an HTML page both for "access denied / file not found"
    // and, for larger files, a "can't scan for viruses" confirmation
    // interstitial. Either way, that's not a working direct download, so
    // it's worth flagging for a human to check.
    const ok = res.ok && !contentType.includes("text/html");
    return { id: is.id, url, status: res.status, contentType, ok };
  }catch(e){
    return { id: is.id, url, status: null, contentType: null, ok: false, error: e.message };
  }
}

async function main(){
  if (!fs.existsSync(ISSUES_DIR)){
    console.log(`No ${ISSUES_DIR} folder found -- nothing to check.`);
    fs.writeFileSync(REPORT_FILE, JSON.stringify({ checkedAt: new Date().toISOString(), results: [], broken: [] }, null, 2));
    return;
  }

  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json"));
  const issues = files
    .map(f => {
      try{ return JSON.parse(fs.readFileSync(path.join(ISSUES_DIR, f), "utf8")); }
      catch(e){ console.error(`Skipping ${f}: ${e.message}`); return null; }
    })
    .filter(Boolean);

  const results = [];
  for (const is of issues){
    if (!is.file) continue;
    results.push(await checkOne(is));
  }

  const broken = results.filter(r => !r.ok);

  console.log(`Checked ${results.length} issue link(s).`);
  for (const r of results){
    console.log(`  ${r.ok ? "OK  " : "FAIL"}  ${r.id}  (${r.status ?? "network error"})  ${r.url}`);
  }

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify({ checkedAt: new Date().toISOString(), results, broken }, null, 2)
  );

  if (broken.length){
    console.error(`\n${broken.length} broken link(s) found -- see ${path.relative(process.cwd(), REPORT_FILE)}`);
    process.exitCode = 1;
  }
}

main();
