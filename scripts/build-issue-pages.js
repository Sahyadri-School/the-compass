#!/usr/bin/env node
// Generates a small, static, JS-free landing page per issue — issues/<id>.html
// — from data/issues.json. These exist so search engines (and anyone sharing
// a link to one specific issue) have a real crawlable page with a title,
// description, and a direct download link, instead of only the single-page
// app at index.html where every issue lives behind client-side JS. They're
// also what the RSS feed (build-feed.js) and the preview viewer's "Copy
// citation" button (assets/main.js) link to as each issue's canonical URL.
//
// Runs automatically in the deploy workflow, after build-issues-index.js.
// GENERATED — the issues/ folder is gitignored, like previews/; nothing
// here is meant to be hand-edited or committed.

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://sahyadri-school.github.io/the-compass/";
const ISSUES_FILE = path.join(__dirname, "..", "data", "issues.json");
const OUT_DIR = path.join(__dirname, "..", "issues");

const MONTH_ORDER = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isRemote = file => /^https?:\/\//i.test(file || "");
// From issues/<id>.html, a site-root-relative path like "pdfs/x.pdf" needs
// one more "../" to reach it; a remote URL is used as-is.
const fileHref = is => isRemote(is.file) ? is.file : `../${is.file}`;
const imageHref = is => isRemote(is.cover) ? is.cover : (is.cover ? `${SITE_URL}${is.cover}` : "");

function page(is){
  const title = `Volume ${is.id} — ${is.month} ${is.year} | The Compass`;
  const description = `Volume ${is.id} of The Compass (${is.month} ${is.year}), a free online magazine of mathematics and science for teachers and students, published by the Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI).`;
  const canonical = `${SITE_URL}issues/${is.id}.html`;
  const image = imageHref(is);
  const sizeNote = is.size ? ` (${esc(is.size)})` : "";

  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `The Compass, Volume ${is.id}`,
    datePublished: `${is.year}-${String(MONTH_ORDER[is.month] || 1).padStart(2, "0")}-01`,
    url: canonical,
    license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    isPartOf: { "@type": "Periodical", name: "The Compass" },
    publisher: {
      "@type": "Organization",
      name: "Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI)"
    },
    ...(image ? { image } : {})
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A7%AD%3C/text%3E%3C/svg%3E">
<meta property="og:type" content="article">
<meta property="og:site_name" content="The Compass">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{
  --parchment:#F3E7CD;--ink:#3A2513;--ink-soft:#654428;--sepia:#8A5A2B;
  --brass:#A97D3B;--card-border:rgba(58,37,19,.35);
  --serif:"Cormorant Garamond","Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  --sans:"Source Sans 3","Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif;
}
@media (prefers-color-scheme:dark){
  :root{--parchment:#1C140C;--ink:#F1E4C8;--ink-soft:#C9B48C;--sepia:#D0A165;--brass:#C99A5B;--card-border:rgba(201,180,140,.3)}
}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font-family:var(--sans);line-height:1.65;color:var(--ink);background:var(--parchment);padding:24px}
.wrap{max-width:38rem;margin:0 auto}
a{color:inherit}
.home{font-size:.95rem;color:var(--ink-soft);text-decoration:none}
.home:hover{text-decoration:underline}
h1{font-family:var(--serif);font-weight:700;font-size:clamp(2rem,6vw,2.8rem);line-height:1.05;margin:20px 0 4px}
.date{font-family:var(--serif);font-style:italic;color:var(--sepia);font-size:1.3rem;margin:0 0 20px}
.btn{
  display:inline-flex;align-items:center;gap:.6rem;min-height:3rem;padding:.75rem 1.5rem;
  border-radius:3px;border:1px solid var(--ink);background:var(--ink);color:var(--parchment);
  font:600 1rem/1.2 var(--sans);text-decoration:none;margin:8px 0 28px;
}
.cite{
  border:1px solid var(--card-border);border-radius:4px;padding:16px 18px;margin:28px 0;
  background:color-mix(in srgb, var(--parchment) 92%, var(--ink) 8%);
}
.cite p{font-size:.92rem;margin:0 0 10px;white-space:pre-wrap}
.cite button{
  font:600 .85rem/1 var(--sans);padding:.5rem .85rem;border-radius:3px;border:1px solid var(--ink);
  background:transparent;color:var(--ink);cursor:pointer;
}
.cite button:hover{background:rgba(138,90,43,.1)}
footer{margin-top:40px;font-size:.85rem;color:var(--ink-soft)}
footer a{text-decoration:underline}
</style>
</head>
<body>
<div class="wrap">
  <a class="home" href="../index.html#archive">&larr; Back to The Compass</a>
  <h1>Volume ${esc(is.id)}</h1>
  <p class="date">${esc(is.month)} ${is.year}</p>
  <p>Free to download and share with teachers and students, with attribution, published by the Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI).</p>
  <a class="btn" href="${esc(fileHref(is))}">Download PDF${sizeNote}</a>

  <div class="cite">
    <p id="citeText">${esc(citeText(is))}</p>
    <button type="button" id="citeBtn">Copy citation</button>
  </div>

  <p><a href="../index.html#archive">See every issue in the archive &rarr;</a></p>

  <footer>
    <p>Magazine content licensed <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>. Contact: <a href="mailto:compass.math.2024@gmail.com">compass.math.2024@gmail.com</a></p>
  </footer>
</div>
<script>
(function(){
  var btn = document.getElementById("citeBtn"), text = document.getElementById("citeText");
  if (!btn || !navigator.clipboard) return;
  btn.addEventListener("click", function(){
    navigator.clipboard.writeText(text.textContent).then(function(){
      var was = btn.textContent; btn.textContent = "Copied!";
      setTimeout(function(){ btn.textContent = was; }, 1800);
    }).catch(function(){});
  });
})();
</script>
</body>
</html>
`;
}

// Matches citeText() in assets/main.js exactly, so the preview viewer's
// "Copy citation" button and this page's always agree.
function citeText(is){
  return `The Compass, Volume ${is.id} (${is.month} ${is.year}). Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI). ${SITE_URL}issues/${is.id}.html`;
}

function indexPage(issues){
  const rows = issues.map(is =>
    `    <li><a href="${esc(is.id)}.html">Volume ${esc(is.id)} — ${esc(is.month)} ${is.year}</a></li>`
  ).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>All issues | The Compass</title>
<meta name="description" content="Every issue of The Compass, the free online magazine of mathematics and science published by the Community Mathematics Centre, Schools of the KFI.">
<link rel="canonical" href="${SITE_URL}issues/">
<style>
  body{font-family:"Source Sans 3",system-ui,sans-serif;max-width:38rem;margin:40px auto;padding:0 24px;line-height:1.7;color:#3A2513;background:#F3E7CD}
  @media (prefers-color-scheme:dark){body{color:#F1E4C8;background:#1C140C}}
  a{color:inherit}
  li{margin-bottom:.4em}
</style>
</head>
<body>
  <p><a href="../index.html">&larr; Back to The Compass</a></p>
  <h1>All issues</h1>
  <ul>
${rows}
  </ul>
</body>
</html>
`;
}

function main(){
  if (!fs.existsSync(ISSUES_FILE)){
    console.log(`No ${ISSUES_FILE} found — run build-issues-index.js first.`);
    return;
  }
  const issues = JSON.parse(fs.readFileSync(ISSUES_FILE, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const is of issues){
    fs.writeFileSync(path.join(OUT_DIR, `${is.id}.html`), page(is));
  }
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), indexPage(issues));
  console.log(`Wrote ${issues.length} issue page(s) to issues/, plus issues/index.html`);
}

main();
