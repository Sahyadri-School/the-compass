#!/usr/bin/env node
// Regenerates sitemap.xml from data/issues.json, so every per-issue page
// (see build-issue-pages.js) is listed alongside the site's static pages.
// GENERATED — runs automatically in the deploy workflow, after
// build-issue-pages.js. Don't hand-edit; add a static entry below in
// STATIC_URLS, or an issue just by adding it the normal way (see README.md
// → "Adding a new issue") — this script picks it up automatically.

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://sahyadri-school.github.io/the-compass/";
const ISSUES_FILE = path.join(__dirname, "..", "data", "issues.json");
const OUT_FILE = path.join(__dirname, "..", "sitemap.xml");

const STATIC_URLS = [
  { loc: SITE_URL, changefreq: "monthly", priority: "1.0" },
  { loc: `${SITE_URL}submit.html`, changefreq: "yearly", priority: "0.6" },
  { loc: `${SITE_URL}issues/`, changefreq: "monthly", priority: "0.5" }
];

function urlEntry({ loc, changefreq, priority }){
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function main(){
  const issues = fs.existsSync(ISSUES_FILE) ? JSON.parse(fs.readFileSync(ISSUES_FILE, "utf8")) : [];
  const issueUrls = issues.map(is => ({
    loc: `${SITE_URL}issues/${is.id}.html`,
    changefreq: "yearly",
    priority: "0.7"
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...STATIC_URLS, ...issueUrls].map(urlEntry).join("\n") +
    `\n</urlset>\n`;

  fs.writeFileSync(OUT_FILE, xml);
  console.log(`Wrote sitemap.xml with ${STATIC_URLS.length + issueUrls.length} URL(s).`);
}

main();
