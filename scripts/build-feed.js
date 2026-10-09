#!/usr/bin/env node
// Generates feed.xml (RSS 2.0), one item per issue, so readers can
// subscribe instead of checking the site for new issues. GENERATED — runs
// automatically in the deploy workflow, after build-issue-pages.js (each
// item links to that issue's own page). Don't hand-edit.

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://sahyadri-school.github.io/the-compass/";
const ISSUES_FILE = path.join(__dirname, "..", "data", "issues.json");
const OUT_FILE = path.join(__dirname, "..", "feed.xml");

const MONTH_ORDER = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Issues only record a month and year, not a day — the 1st at midnight UTC
// is an arbitrary but stable choice, consistent every time this regenerates.
function pubDate(is){
  const d = new Date(Date.UTC(is.year, (MONTH_ORDER[is.month] || 1) - 1, 1));
  return d.toUTCString();
}

function item(is){
  const link = `${SITE_URL}issues/${is.id}.html`;
  return `    <item>
      <title>${esc(`Volume ${is.id} — ${is.month} ${is.year}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate(is)}</pubDate>
      <description>${esc(`The Compass, Volume ${is.id} (${is.month} ${is.year}) — free to download, with attribution.`)}</description>
    </item>`;
}

function main(){
  if (!fs.existsSync(ISSUES_FILE)){
    console.log(`No ${ISSUES_FILE} found — writing a feed with no items.`);
  }
  const issues = fs.existsSync(ISSUES_FILE) ? JSON.parse(fs.readFileSync(ISSUES_FILE, "utf8")) : [];
  // data/issues.json is already sorted newest-first by build-issues-index.js.
  const items = issues.map(item).join("\n");
  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Compass</title>
    <link>${SITE_URL}</link>
    <description>Free online magazine of mathematics and science for teachers and students, published by the Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI).</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  fs.writeFileSync(OUT_FILE, xml);
  console.log(`Wrote feed.xml with ${issues.length} item(s).`);
}

main();
