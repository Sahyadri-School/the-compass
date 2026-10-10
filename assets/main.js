/* =========================================================================
   Issue data now lives in data/issues.json, not here — this lets Pages CMS
   (or hand-editing that file) add new volumes without touching this script.
   See README.md → "Adding a new issue" for both workflows.
   ========================================================================= */
let ISSUES = [];

(function(){
"use strict";
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// The compass renders much smaller on a phone (.stage caps at min(400px,86vw)
// there, vs up to 620px on desktop — see index.html), so matching desktop's
// pixel ratio, antialiasing, and dial texture resolution costs real GPU/CPU
// time there for detail nobody can see at that size. Checked once, like
// REDUCED above, rather than reactively on resize/rotate.
const MOBILE = window.matchMedia("(max-width: 700px)").matches;
const byId = id => ISSUES.find(i => i.id === id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Matches SITE_URL and citeText() in scripts/build-issue-pages.js exactly,
// so citing an issue page's own "Copy citation" button and citing it from
// here (the preview viewer) always agree.
const SITE_URL = "https://sahyadri-school.github.io/the-compass/";
function citeText(is, pageLabel){
  const page = pageLabel ? `, ${pageLabel.toLowerCase()}` : "";
  return `The Compass, Volume ${is.id} (${is.month} ${is.year})${page}. Community Mathematics Centre, Schools of the Krishnamurti Foundation India (KFI). ${SITE_URL}issues/${is.id}.html`;
}

/* ---------------------------------------------------- "New issue" badge */
// Shown only on a RETURN visit where the current issue has changed since
// the last one this browser saw — never on a first-ever visit (nothing to
// compare against) and never twice for the same issue.
const SEEN_KEY = "compass-last-seen-issue";
function isNewSinceLastVisit(curId){
  let seen = null;
  try{ seen = localStorage.getItem(SEEN_KEY); }catch(e){ /* private mode etc. */ }
  try{ localStorage.setItem(SEEN_KEY, curId); }catch(e){ /* ignore */ }
  return seen !== null && seen !== curId;
}

/* ------------------------------------------------------------------ covers */
const VOL_TINT = {1:"#3F5566", 2:"#4F6B59", 3:"#7A4A23"};
function coverSVG(is){
  const tint = VOL_TINT[is.volume] || "#7A4A23";
  const n = is.number + 4, cx = 60, cy = 90, r = 28;
  const pts = [];
  for (let k = 0; k < n; k++){
    const a = -Math.PI/2 + 2*Math.PI*k/n;
    pts.push([cx + r*Math.cos(a), cy + r*Math.sin(a)]);
  }
  const poly = pts.map(p => p.map(v => v.toFixed(2)).join(",")).join(" ");
  let star = "";
  for (let k = 0; k < n; k++){
    const a = pts[k], b = pts[(k+2) % n];
    star += `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  }
  let ticks = "";
  for (let k = 0; k < 48; k++){
    const a = 2*Math.PI*k/48, r1 = r + (k % 4 ? 5 : 3), r2 = r + 8;
    ticks += `M${(cx+r1*Math.sin(a)).toFixed(2)} ${(cy-r1*Math.cos(a)).toFixed(2)}L${(cx+r2*Math.sin(a)).toFixed(2)} ${(cy-r2*Math.cos(a)).toFixed(2)}`;
  }
  return `<svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="120" height="170" fill="#F1E3C4"/>
    <path d="M0 64 Q30 58 60 64 T120 64 M0 116 Q30 110 60 116 T120 116" fill="none" stroke="${tint}" stroke-opacity=".12" stroke-width=".6"/>
    <rect width="120" height="36" fill="${tint}"/>
    <text x="60" y="23" text-anchor="middle" font-family="Cormorant Garamond,Georgia,serif" font-weight="700" font-size="15" fill="#F3E7CD">The Compass</text>
    <circle cx="${cx}" cy="${cy}" r="${r+8}" fill="none" stroke="${tint}" stroke-width=".7"/>
    <path d="${ticks}" stroke="${tint}" stroke-width=".5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${tint}" stroke-width=".7"/>
    <polygon points="${poly}" fill="${tint}" fill-opacity=".08" stroke="${tint}" stroke-width="1"/>
    <path d="${star}" fill="none" stroke="#8E3B24" stroke-width=".7" stroke-opacity=".85"/>
    <circle cx="${cx}" cy="${cy}" r="1.8" fill="${tint}"/>
    <text x="60" y="144" text-anchor="middle" font-family="Cormorant Garamond,Georgia,serif" font-weight="700" font-size="12" fill="#3A2513">Volume ${esc(is.id)}</text>
    <text x="60" y="157" text-anchor="middle" font-family="Source Sans 3,Arial,sans-serif" font-size="7.5" fill="#654428">${esc(is.month)} ${is.year}</text>
    <rect x="4" y="4" width="112" height="162" fill="none" stroke="${tint}" stroke-opacity=".35" stroke-width=".6"/>
  </svg>`;
}
function coverMarkup(is){
  return is.cover
    ? `<img src="${esc(is.cover)}" alt="" loading="lazy" decoding="async">`
    : coverSVG(is);
}
// The cover, as a button that opens the preview viewer when preview pages
// exist for this issue (they're generated at deploy time from the PDF —
// see scripts/build-previews.js). Without them it's the plain, non-clickable
// cover it always was.
function coverBlock(is, cls){
  if (!is.preview || !is.preview.pages) return `<span class="${cls}">${coverMarkup(is)}</span>`;
  const label = `Preview Volume ${is.id}, ${is.month} ${is.year}: browse all ${is.preview.pages} pages`;
  return `<button type="button" class="${cls} cover-btn" data-preview="${esc(is.id)}" aria-label="${esc(label)}">${coverMarkup(is)}<span class="cover-chip" aria-hidden="true">${PREVIEW_ICON}Preview</span></button>`;
}

/* ------------------------------------------------------- download markup */
const PDF_ICON = `<svg class="dl-icon" viewBox="0 0 22 26" aria-hidden="true">
  <path d="M2 1h12l6 6v18H2z" fill="#F3E7CD"/>
  <path d="M14 1v6h6" fill="#D8C39A"/>
  <path d="M2 1h12l6 6v18H2z" fill="none" stroke="#3A2513" stroke-width="1.2" stroke-linejoin="round"/>
  <rect x="0" y="13" width="17" height="8" rx="1" fill="#B23A24"/>
  <text x="8.5" y="19.3" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="6.2" fill="#fff">PDF</text>
</svg>`;
const PREVIEW_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>`;
const idleLabel = is => is.size ? `Download (${is.size})` : "Download";

function dlMarkup(is, large){
  return `<div class="dl${large ? " dl--large" : ""}" data-id="${esc(is.id)}" data-state="idle">
    <button class="dl-btn" type="button" aria-describedby="msg-${esc(is.id)}${large ? "-lg" : ""}">
      <span class="dl-fill"></span>${PDF_ICON}<span class="dl-spin" aria-hidden="true"></span>
      <span class="dl-label">${esc(idleLabel(is))}</span>
    </button>
    <button class="dl-cancel" type="button" aria-label="Cancel download of Volume ${esc(is.id)}">×</button>
    <p class="dl-msg" id="msg-${esc(is.id)}${large ? "-lg" : ""}" role="status" aria-live="polite"></p>
  </div>`;
}

/* ---------------------------------------------------------------- render */
const ARCHIVE_STATE = { query:"" };

const MONTH_ORDER = {January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
function sortedIssues(){
  // Sort by date (newest first) rather than trusting array/insertion order —
  // Pages CMS's list editor tends to append new entries at the end, so we
  // can't rely on "first entry = current issue" the way hand-edited JS did.
  return [...ISSUES].sort((a,b) =>
    (b.year - a.year) ||
    ((MONTH_ORDER[b.month] || 0) - (MONTH_ORDER[a.month] || 0)) ||
    ((b.number || 0) - (a.number || 0))
  );
}

function render(){
  const heroIssue = document.getElementById("heroIssue");
  const heroStat = document.getElementById("heroStat");
  const slot = document.getElementById("currentSlot");

  if (!ISSUES.length){
    heroIssue.textContent = "No issues published yet";
    heroStat.hidden = true;
    slot.innerHTML = `<p class="note">The first issue hasn't been published yet — check back soon, or see <a href="submit.html">how to write for us</a>.</p>`;
    renderArchive();
    return;
  }

  const cur = sortedIssues()[0];
  const badge = isNewSinceLastVisit(cur.id) ? ` <span class="new-badge">New</span>` : "";
  heroIssue.innerHTML = `Current Issue: Volume ${esc(cur.id)}, ${esc(cur.month)} ${cur.year}${badge}`;

  const earliestYear = Math.min(...ISSUES.map(is => is.year));
  const count = ISSUES.length;
  heroStat.textContent = count === 1
    ? "1 issue published so far"
    : `${count} issues published since ${earliestYear}`;
  heroStat.hidden = false;

  slot.innerHTML = `
    <div class="current-grid">
      ${coverBlock(cur, "cover-lg")}
      <div class="current-copy">
        <h3 class="issue-name">Volume ${esc(cur.id)}</h3>
        <p class="issue-date">${esc(cur.month)} ${cur.year}</p>
        <p class="note">The latest issue, free to download and share with teachers and students, with attribution. This is a large file; on mobile data, Wi-Fi is recommended.</p>
        ${dlMarkup(cur, true)}
      </div>
    </div>`;

  renderArchive();
}

function issueMatches(is, state){
  if (state.query){
    const hay = `volume ${is.id} ${is.month} ${is.year}`.toLowerCase();
    if (!hay.includes(state.query.toLowerCase())) return false;
  }
  return true;
}

function renderArchive(){
  const rest = sortedIssues().slice(1);
  const past = rest.filter(is => issueMatches(is, ARCHIVE_STATE));
  const vols = [...new Set(past.map(i => i.volume))].sort((a,b) => b - a);
  const slot = document.getElementById("archiveSlot");
  const empty = document.getElementById("archiveEmpty");

  if (!past.length){
    slot.innerHTML = "";
    empty.hidden = false;
    empty.querySelector(".empty-text").textContent = rest.length
      ? "No issues match your search."
      : "No back issues yet.";
    empty.querySelector("#archiveReset").hidden = !rest.length;
    return;
  }
  empty.hidden = true;

  slot.innerHTML = vols.map(v => {
    const list = past.filter(i => i.volume === v);
    const years = [...new Set(list.map(i => i.year))].join("–");
    return `<div class="vol">
      <div class="vol-head"><h3>Volume ${v}</h3><span>${years}, ${list.length} ${list.length === 1 ? "issue" : "issues"}</span></div>
      <ul class="issues">
        ${list.map(is => `<li class="issue">
          ${coverBlock(is, "thumb")}
          <div>
            <h4>Volume ${esc(is.id)}</h4>
            <p class="date">${esc(is.month)} ${is.year}</p>
            ${dlMarkup(is, false)}
          </div>
        </li>`).join("")}
      </ul>
    </div>`;
  }).join("");
}

function initArchiveControls(){
  const input = document.getElementById("archiveSearch");
  const resetBtn = document.getElementById("archiveReset");
  input.addEventListener("input", () => {
    ARCHIVE_STATE.query = input.value.trim();
    renderArchive();
  });
  resetBtn.addEventListener("click", () => {
    ARCHIVE_STATE.query = "";
    input.value = "";
    renderArchive();
  });
}

/* ----------------------------------------------------------- file sizes */
const fmtMB = b => {
  const mb = b / 1048576;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
};
// Files hosted elsewhere (e.g. Google Drive) can't be fetched from the page
// (no CORS), so they skip size detection and go straight to the browser.
const isRemote = is => { try{ return new URL(is.file, location.href).origin !== location.origin; }catch(e){ return false; } };
function detectSizes(){
  if (!/^https?:$/.test(location.protocol)) return;
  ISSUES.forEach(async is => {
    // Most issues already have `size` baked in by build-issues-index.js at
    // deploy time (reading the real PDF on disk) — skip the HEAD request
    // entirely then, so this only fires for an issue added by hand before
    // its PDF was committed, or hosted remotely (which isRemote already
    // excludes below, since cross-origin HEAD has no usable response here).
    if (isRemote(is) || is.size) return;
    try{
      const r = await fetch(is.file, {method:"HEAD", cache:"no-cache"});
      if (!r.ok) return;
      const n = +r.headers.get("content-length");
      if (!n) return;
      is._bytes = n;
      if (!is.size) is.size = fmtMB(n);
      document.querySelectorAll(`.dl[data-id="${is.id}"]`).forEach(el => {
        if (el.dataset.state === "idle") el.querySelector(".dl-label").textContent = idleLabel(is);
      });
    }catch(e){ /* offline or blocked: keep the plain "Download" label */ }
  });
}

/* ------------------------------------------------------ download manager */
const active = new Map();   // id -> AbortController
const timers = new Map();   // id -> reset timer

function setDL(id, state, label, msg, pct){
  document.querySelectorAll(`.dl[data-id="${id}"]`).forEach(el => {
    el.dataset.state = state;
    el.querySelector(".dl-label").textContent = label;
    el.querySelector(".dl-msg").textContent = msg || "";
    const fill = el.querySelector(".dl-fill");
    fill.style.width = (pct == null ? 0 : pct) + "%";
    el.querySelector(".dl-btn").setAttribute("aria-busy", state === "loading" || state === "indeterminate" ? "true" : "false");
  });
}
function resetLater(id, ms){
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => {
    if (!active.has(id)) setDL(id, "idle", idleLabel(byId(id)), "");
  }, ms));
}
function saveBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function directDownload(is){
  // Used when progress can't be measured (opened from disk, or files hosted elsewhere).
  const a = document.createElement("a");
  a.href = is.file; a.download = is.file.split("/").pop(); a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setDL(is.id, "indeterminate", "Starting download…", "Your browser is downloading the file. Check your downloads folder.");
  resetLater(is.id, 6000);
}

async function startDownload(id){
  const is = byId(id);
  if (!is || active.has(id)) return;
  clearTimeout(timers.get(id));
  const name = is.file.split("/").pop();

  if (!/^https?:$/.test(location.protocol) || isRemote(is)) { directDownload(is); return; }

  const ctrl = new AbortController();
  active.set(id, ctrl);
  setDL(id, "loading", "Connecting…", `Preparing Volume ${id}`, 2);

  let res;
  try{
    res = await fetch(is.file, {signal: ctrl.signal});
  }catch(err){
    active.delete(id);
    if (err.name === "AbortError"){ setDL(id, "idle", idleLabel(is), "Download cancelled."); resetLater(id, 4000); return; }
    directDownload(is);      // cross-origin host or network policy: hand over to the browser
    return;
  }

  if (!res.ok){
    active.delete(id);
    const msg = res.status === 404
      ? "This issue isn't available for download yet. Please check back soon."
      : `The download stopped (error ${res.status}). Check your connection and try again.`;
    setDL(id, "error", "Try again", msg);
    return;
  }

  const total = +res.headers.get("content-length") || is._bytes || 0;
  try{
    let blob;
    if (res.body && res.body.getReader){
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0, lastPaint = 0;
      for(;;){
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        const now = performance.now();
        if (now - lastPaint > 90){
          lastPaint = now;
          if (total){
            const pct = Math.min(99, Math.round(got / total * 100));
            setDL(id, "loading", `Downloading ${pct}%`, `${fmtMB(got)} of ${fmtMB(total)}`, pct);
          } else {
            setDL(id, "indeterminate", "Downloading…", `${fmtMB(got)} received`);
          }
        }
      }
      blob = new Blob(chunks, {type:"application/pdf"});
    } else {
      setDL(id, "indeterminate", "Downloading…", "This may take a minute for large files.");
      blob = await res.blob();
    }
    active.delete(id);
    setDL(id, "done", "Downloaded", `Saved as ${name}`, 100);
    saveBlob(blob, name);
    resetLater(id, 6000);
  }catch(err){
    active.delete(id);
    if (err.name === "AbortError"){ setDL(id, "idle", idleLabel(is), "Download cancelled."); resetLater(id, 4000); return; }
    setDL(id, "error", "Try again", "The download was interrupted. Check your connection and try again.");
  }
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".dl-btn");
  if (btn){ startDownload(btn.closest(".dl").dataset.id); return; }
  const cancel = e.target.closest(".dl-cancel");
  if (cancel){
    const ctrl = active.get(cancel.closest(".dl").dataset.id);
    if (ctrl) ctrl.abort();
  }
});

/* ------------------------------------------------------------ navigation */
function initNav(){
  const nav = document.getElementById("nav");
  const btn = document.getElementById("menuBtn");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, {passive:true});
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Open menu");
  }));
}

/* -------------------------------------------------------------- theme */
function initTheme(){
  const KEY = "compass-theme";
  const toggle = document.getElementById("themeToggle");
  const root = document.documentElement;

  function apply(theme){
    if (theme === "dark" || theme === "light") root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme"); // "system": let prefers-color-scheme decide
    const isDark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  }

  let stored = null;
  try{ stored = localStorage.getItem(KEY); }catch(e){ /* private mode etc. */ }
  apply(stored || "system");

  toggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    apply(next);
    try{ localStorage.setItem(KEY, next); }catch(e){ /* ignore */ }
  });
}

/* ---------------------------------------------------- dyslexia font */
function initDyslexicFont(){
  const KEY = "compass-dyslexic";
  const toggle = document.getElementById("fontToggle");
  const root = document.documentElement;
  const show = on => {
    root.classList.toggle("dyslexic", on);
    toggle.setAttribute("aria-pressed", String(on));
  };
  show(root.classList.contains("dyslexic"));
  toggle.addEventListener("click", () => {
    const on = !root.classList.contains("dyslexic");
    show(on);
    try{ localStorage.setItem(KEY, on ? "on" : "off"); }catch(e){ /* private mode etc. */ }
  });
}

/* ------------------------------------------------------------- world map */
let landCache = null;
async function drawMap(){
  const canvas = document.getElementById("map");
  const hero = document.getElementById("hero");
  if (!window.d3 || !window.topojson) return;
  const w = hero.clientWidth, h = hero.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (!landCache){
    try{
      const topo = await (await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")).json();
      landCache = topojson.feature(topo, topo.objects.land);
    }catch(e){ landCache = false; }
  }

  const sphere = {type:"Sphere"};
  const proj = d3.geoNaturalEarth1().fitExtent([[0,0],[w,h]], sphere);
  const tmp = d3.geoPath(proj).bounds(sphere);
  const k = Math.max(w / (tmp[1][0] - tmp[0][0]), h / (tmp[1][1] - tmp[0][1])) * 1.06;
  proj.scale(proj.scale() * k).translate([w * 0.5, h * 0.52]);
  const path = d3.geoPath(proj, ctx);

  // graticule
  ctx.beginPath(); path(d3.geoGraticule().step([15,15])());
  ctx.strokeStyle = "rgba(90,58,30,.16)"; ctx.lineWidth = .6; ctx.stroke();

  if (landCache){
    // engraved "water-lining" along the coasts, clipped to the sea
    ctx.save();
    ctx.beginPath(); path(sphere); path(landCache); ctx.clip("evenodd");
    for (let i = 4; i >= 1; i--){
      ctx.beginPath(); path(landCache);
      ctx.strokeStyle = `rgba(110,72,34,${0.03 + (4 - i) * 0.018})`;
      ctx.lineWidth = i * 4.5; ctx.lineJoin = "round"; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); path(landCache);
    ctx.fillStyle = "rgba(160,112,58,.13)"; ctx.fill();
    ctx.strokeStyle = "rgba(74,48,24,.55)"; ctx.lineWidth = .9; ctx.stroke();
  }

  // neatline around the globe
  ctx.beginPath(); path(sphere);
  ctx.strokeStyle = "rgba(74,48,24,.45)"; ctx.lineWidth = 1.4; ctx.stroke();

  // portolan rhumb lines radiating from the compass
  const stage = document.getElementById("stage").getBoundingClientRect();
  const hr = hero.getBoundingClientRect();
  const cx = stage.left - hr.left + stage.width / 2;
  const cy = stage.top - hr.top + stage.height / 2;
  const R = Math.hypot(w, h);
  for (let i = 0; i < 32; i++){
    const a = i * Math.PI / 16;
    const major = i % 4 === 0, half = i % 2 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * stage.width * 0.42, cy - Math.cos(a) * stage.width * 0.42);
    ctx.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R);
    ctx.strokeStyle = major ? "rgba(74,48,24,.28)" : half ? "rgba(142,59,36,.22)" : "rgba(79,107,89,.20)";
    ctx.lineWidth = major ? 1 : .7;
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy, stage.width * 0.42, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(74,48,24,.22)"; ctx.lineWidth = .8; ctx.stroke();

  canvas.classList.add("is-drawn");
  hero.classList.add("map-ready");
}

function initMap(){
  drawMap();
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(drawMap, 180); });
  if (!REDUCED){
    const canvas = document.getElementById("map");
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight * 1.2);
        canvas.style.transform = `translate3d(0,${y * 0.22}px,0)`;
        ticking = false;
      });
    }, {passive:true});
  }
}

/* ---------------------------------------------------------- 3D compass */
function drawDial(cv){
  const g = cv.getContext("2d"), S = cv.width, c = S / 2;
  g.clearRect(0, 0, S, S);
  const P = (a, r) => [c + r * Math.sin(a), c - r * Math.cos(a)];

  const rg = g.createRadialGradient(c, c * .9, S * .05, c, c, c);
  rg.addColorStop(0, "#F6EBD0"); rg.addColorStop(.72, "#EAD7AE"); rg.addColorStop(1, "#C9A56B");
  g.fillStyle = rg; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 1600; i++){
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * c;
    g.fillStyle = `rgba(110,70,30,${Math.random() * .09})`;
    g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 1.6, 1.6);
  }

  g.strokeStyle = "#3A2513";
  [[.975,4],[.915,1.6],[.8,1.8],[.785,.8]].forEach(([r,lw]) => { g.lineWidth = lw; g.beginPath(); g.arc(c, c, c * r, 0, Math.PI * 2); g.stroke(); });

  for (let d = 0; d < 360; d++){
    const a = d * Math.PI / 180;
    const r1 = d % 10 === 0 ? c * .918 : d % 5 === 0 ? c * .935 : c * .95;
    const [x1,y1] = P(a, r1), [x2,y2] = P(a, c * .972);
    g.lineWidth = d % 10 === 0 ? 2.4 : 1.1;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  // faint 32 rhumbs
  g.lineWidth = .9; g.strokeStyle = "rgba(58,37,19,.22)";
  for (let i = 0; i < 32; i++){ const [x,y] = P(i * Math.PI / 16, c * .78); g.beginPath(); g.moveTo(c, c); g.lineTo(x, y); g.stroke(); }

  // degree numbers
  g.fillStyle = "#3A2513"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let d = 30; d < 360; d += 30){
    if (d % 90 === 0) continue;
    const a = d * Math.PI / 180, [x,y] = P(a, c * .86);
    g.save(); g.translate(x, y); g.rotate(a);
    g.font = `600 ${S * .03}px "Source Sans 3", Arial, sans-serif`; g.fillText(String(d), 0, 0); g.restore();
  }
  // cardinal letters
  [["N",0],["E",90],["S",180],["W",270]].forEach(([L,d]) => {
    const a = d * Math.PI / 180, [x,y] = P(a, c * .858);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = L === "N" ? "#8E3B24" : "#3A2513";
    g.font = `700 ${S * .072}px "Cormorant Garamond", Georgia, serif`; g.fillText(L, 0, S * .004); g.restore();
  });

  // compass rose
  function point(a, len, w, dark, light){
    const tip = P(a, len), l = P(a - Math.PI / 2, w), r = P(a + Math.PI / 2, w);
    g.beginPath(); g.moveTo(c, c); g.lineTo(...tip); g.lineTo(...l); g.closePath(); g.fillStyle = light; g.fill();
    g.beginPath(); g.moveTo(c, c); g.lineTo(...tip); g.lineTo(...r); g.closePath(); g.fillStyle = dark; g.fill();
    g.beginPath(); g.moveTo(...l); g.lineTo(...tip); g.lineTo(...r); g.strokeStyle = "#3A2513"; g.lineWidth = 1.4; g.stroke();
  }
  for (let i = 0; i < 8; i++)  point((i * 45 + 22.5) * Math.PI / 180, c * .44, c * .035, "#A9804F", "#EFE0BD");
  for (let i = 0; i < 4; i++)  point((i * 90 + 45) * Math.PI / 180, c * .57, c * .065, "#8A5A2B", "#E8D3A6");
  for (let i = 0; i < 4; i++)  point(i * Math.PI / 2, c * .75, c * .09, i === 0 ? "#8E3B24" : "#3A2513", "#F1E2C0");

  g.beginPath(); g.arc(c, c, c * .07, 0, Math.PI * 2); g.fillStyle = "#EAD7AE"; g.fill();
  g.lineWidth = 2; g.strokeStyle = "#3A2513"; g.stroke();
}

function makeEnv(renderer){
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 512;
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#FFF4DA"); gr.addColorStop(.32, "#E6BE80"); gr.addColorStop(.5, "#8A5A2B");
  gr.addColorStop(.64, "#3C2613"); gr.addColorStop(1, "#1C1008");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "rgba(255,251,238,.95)";
  g.fillRect(170, 58, 150, 110); g.fillRect(610, 36, 96, 150); g.fillRect(880, 90, 70, 60);
  const glow = g.createRadialGradient(420, 120, 10, 420, 120, 260);
  glow.addColorStop(0, "rgba(255,236,196,.8)"); glow.addColorStop(1, "rgba(255,236,196,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.encoding = THREE.sRGBEncoding;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
  return env;
}

function initCompass(){
  const stage = document.getElementById("stage");
  const hero = document.getElementById("hero");
  if (!window.THREE){ stage.classList.add("no-webgl"); return; }
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({antialias:!MOBILE, alpha:true, powerPreference:"high-performance"});
  }catch(e){ stage.classList.add("no-webgl"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
  const camBase = new THREE.Vector3(0, 4.6, 3.8);

  const key = new THREE.DirectionalLight(0xFFF0D6, 1.5); key.position.set(-3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xFFD9A0, .55); rim.position.set(4, 2, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xFFF4E0, .22));

  const brass     = new THREE.MeshStandardMaterial({color:0xCB994C, metalness:1, roughness:.28});
  const brassDark = new THREE.MeshStandardMaterial({color:0x9E7134, metalness:1, roughness:.4, side:THREE.DoubleSide});
  const steel     = new THREE.MeshStandardMaterial({color:0xDAD3C5, metalness:1, roughness:.2});
  const oxide     = new THREE.MeshStandardMaterial({color:0x7A2414, metalness:.3, roughness:.42, envMapIntensity:.6});

  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);

  // case (lathe profile: base, bulging wall, lip, inner wall)
  const prof = [[0,-.16],[.86,-.16],[.98,-.13],[1.05,-.06],[1.08,.02],[1.07,.09],[1.03,.13],[.97,.145],[.95,.12],[.95,.03],[0,.03]]
    .map(p => new THREE.Vector2(p[0], p[1]));
  body.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 128), brassDark));

  const bezel = new THREE.Mesh(new THREE.TorusGeometry(1.0, .045, 24, 160), brass);
  bezel.rotation.x = Math.PI / 2; bezel.position.y = .14; body.add(bezel);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.078, .016, 12, 160), brass);
  band.rotation.x = Math.PI / 2; band.position.y = .015; body.add(band);

  // dial
  const dialCanvas = document.createElement("canvas"); dialCanvas.width = dialCanvas.height = MOBILE ? 512 : 1024;
  drawDial(dialCanvas);
  const dialTex = new THREE.CanvasTexture(dialCanvas);
  dialTex.encoding = THREE.sRGBEncoding;
  dialTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const faceGeo = new THREE.CircleGeometry(.95, 128); faceGeo.rotateX(-Math.PI / 2);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({map:dialTex, roughness:.9, metalness:0, envMapIntensity:.35}));
  face.position.y = .032; body.add(face);

  // bow (pendant ring) at north
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .2, 32), brass);
  crown.rotation.x = Math.PI / 2; crown.position.set(0, .01, -1.13); body.add(crown);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.06, 24, 16), brass);
  knob.position.set(0, .01, -1.24); body.add(knob);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .034, 20, 64), brass);
  ring.rotation.x = Math.PI / 2; ring.position.set(0, .01, -1.42); body.add(ring);

  // needle
  const needle = new THREE.Group(); needle.position.y = .075; body.add(needle);
  function half(tip, mat){
    const s = new THREE.Shape();
    s.moveTo(0, tip); s.lineTo(.07, 0); s.lineTo(-.07, 0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {depth:.012, bevelEnabled:true, bevelThickness:.01, bevelSize:.008, bevelSegments:2});
    geo.rotateX(-Math.PI / 2);
    needle.add(new THREE.Mesh(geo, mat));
  }
  half(.8, oxide); half(-.8, steel);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, .045, 32), brass);
  cap.position.y = .035; needle.add(cap);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(.035, 20, 12), brass);
  capTop.position.y = .06; needle.add(capTop);

  // glass
  const glassGeo = new THREE.CircleGeometry(.965, 96); glassGeo.rotateX(-Math.PI / 2);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
    color:0xFFFFFF, metalness:0, roughness:.03, transparent:true, opacity:.13,
    clearcoat:1, clearcoatRoughness:0, envMapIntensity:1.6, depthWrite:false
  }));
  glass.position.y = .135; body.add(glass);

  // soft shadow on the map
  const sc = document.createElement("canvas"); sc.width = sc.height = 256;
  const sg = sc.getContext("2d");
  const sgr = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  sgr.addColorStop(0, "rgba(40,24,10,.55)"); sgr.addColorStop(.4, "rgba(40,24,10,.22)"); sgr.addColorStop(.7, "rgba(40,24,10,0)"); sgr.addColorStop(1, "rgba(40,24,10,0)");
  sg.fillStyle = sgr; sg.fillRect(0, 0, 256, 256);
  const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2); shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc), transparent:true, depthWrite:false});
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(.08, -.5, -.05); scene.add(shadow);

  // redraw dial once web fonts are ready
  if (document.fonts && document.fonts.load){
    Promise.all([
      document.fonts.load('700 72px "Cormorant Garamond"'),
      document.fonts.load('600 30px "Source Sans 3"')
    ]).then(() => { drawDial(dialCanvas); dialTex.needsUpdate = true; if (REDUCED) draw(); }).catch(() => {});
  }

  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const k = camera.aspect < 1 ? 1 / camera.aspect : 1;
    camera.position.copy(camBase).multiplyScalar(k);
    camera.lookAt(0, -.05, -.16);
    camera.updateProjectionMatrix();
    if (REDUCED) draw();
  }
  function draw(){ renderer.render(scene, camera); }

  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  if (REDUCED){ draw(); return; }

  /* ---- motion: the case turns with scrolling; the needle hunts for north ---- */
  const wrapA = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
  const S = {
    needle: Math.random() * Math.PI * 2, vel: 15 + Math.random() * 3,
    caseAng: 0, prevCase: -1.4, kick: 0,
    px: 0, py: 0, tx: 0, ty: 0
  };
  // Rendering (not the physics below, which stays cheap either way) only
  // needs to run at full rate during the intro and while something is
  // actually changing in response to the visitor. The ambient tremor/bob
  // afterwards moves on multi-second sine-wave cycles, so once there's been
  // no scroll or pointer input for a while, dropping the actual WebGL
  // render to a much lower rate is invisible to look at but cuts ongoing
  // CPU/GPU/battery cost substantially — this loop otherwise runs forever
  // for as long as the hero stays in view.
  const IDLE_AFTER_MS = 1200, IDLE_FRAME_MS = 90;   // ~11fps once idle
  let lastInput = performance.now();
  const markInput = () => { lastInput = performance.now(); };

  let lastY = window.scrollY;
  window.addEventListener("scroll", () => { S.kick += window.scrollY - lastY; lastY = window.scrollY; markInput(); }, {passive:true});
  hero.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const r = hero.getBoundingClientRect();
    S.tx = (e.clientX - r.left) / r.width * 2 - 1;
    S.ty = (e.clientY - r.top) / r.height * 2 - 1;
    markInput();
  });
  hero.addEventListener("pointerleave", () => { S.tx = 0; S.ty = 0; markInput(); });

  const t0 = performance.now(); let last = t0, raf = 0, visible = true, lastDraw = 0;
  function frame(now){
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    const t = (now - t0) / 1000;
    const intro = Math.min(t / 1.8, 1), e = 1 - Math.pow(1 - intro, 3);

    // case orientation follows scroll (plus an intro turn)
    S.caseAng += (window.scrollY * .0024 - S.caseAng) * (1 - Math.exp(-dt * 4));
    const caseShown = S.caseAng + (1 - e) * -1.4;
    const caseVel = (caseShown - S.prevCase) / Math.max(dt, 1e-3);
    S.prevCase = caseShown;

    // needle: damped spring towards north with a gentle magnetic tremor
    const target = .045 * Math.sin(t * .9) + .025 * Math.sin(t * 2.3 + 1);
    S.vel += Math.max(-6, Math.min(6, S.kick * .004)); S.kick = 0;
    const acc = -7 * wrapA(S.needle - target) - 1.0 * (S.vel - .5 * caseVel);
    S.vel += acc * dt; S.needle += S.vel * dt;

    // float, tilt towards the pointer
    S.px += (S.tx - S.px) * (1 - Math.exp(-dt * 3));
    S.py += (S.ty - S.py) * (1 - Math.exp(-dt * 3));
    const bob = Math.sin(t * 1.15) * .07;
    root.position.y = bob + (1 - e) * -.35;
    root.scale.setScalar(.86 + .14 * e);
    root.rotation.x = S.py * .16 + Math.sin(t * .7) * .03;
    root.rotation.z = -S.px * .16 + Math.sin(t * .9 + 1) * .025;
    body.rotation.y = caseShown;
    needle.rotation.y = S.needle - caseShown;

    const lift = root.position.y + .35;
    shadow.scale.setScalar(1 - bob * .6);
    shadowMat.opacity = Math.max(0, .9 - lift * .6) * e;

    const idle = e >= 1 && (now - lastInput) > IDLE_AFTER_MS;
    if (!idle || now - lastDraw >= IDLE_FRAME_MS){ lastDraw = now; draw(); }
  }
  const run = () => { if (!raf && visible && !document.hidden){ last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  if ("IntersectionObserver" in window){
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? run() : stop(); }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : run());
  run();
}

/* --------------------------------------------- reading-position memory */
// One issue read partway, then closed, reopens to the same page next time
// — a single localStorage key mapping issue id -> last page read, rather
// than a key per issue (keeps things tidy, same reason detectSizes() etc.
// already guard every access against private-mode exceptions).
const PROGRESS_KEY = "compass-progress";
function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }catch(e){ return {}; }
}
function saveProgress(id, page){
  try{
    const all = loadProgress();
    all[id] = page;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  }catch(e){ /* private mode etc. */ }
}

/* ----------------------------------------------------------- preview viewer */
// Click a cover to read through the whole issue, page by page, in a dialog.
// The page images come from previews/<id>/<n>.jpg, rendered from the PDF at
// deploy time; see scripts/build-previews.js. `preview.front` is how many
// front-matter pages come before page "1" of the body.
function roman(n){
  let out = "";
  for (const [v, sym] of [[10,"x"],[9,"ix"],[5,"v"],[4,"iv"],[1,"i"]]) while (n >= v){ out += sym; n -= v; }
  return out;
}
function initPreview(){
  const dlg = document.getElementById("previewDialog");
  if (!dlg) return;
  const $ = sel => dlg.querySelector(sel);
  const img = $(".preview-img"), title = $(".preview-title"), count = $(".preview-count"),
        prev = $(".preview-prev"), next = $(".preview-next"), goto_ = $(".preview-goto-input"),
        msg = $(".preview-msg"), stage = $(".preview-stage"), citeBtn = $(".preview-cite");
  let cur = null, page = 1, N = 0, front = 0;
  const src = (is, p) => `previews/${is.id}/${p}.jpg`;

  // These issues number their front matter in roman numerals (the cover is
  // unnumbered) and start the body at page 1 — the numbers the contents use.
  // Show those, so "page 39" in the contents is page 39 here. If the front
  // matter length isn't known, fall back to plain 1..N.
  function label(p){
    if (!front) return `Page ${p} of ${N}`;
    if (p === 1) return "Cover";
    if (p <= front) return `Page ${roman(p)} (front matter)`;
    return `Page ${p - front} of ${N - front}`;
  }
  function show(p){
    page = Math.max(1, Math.min(N, p));
    msg.hidden = true; img.hidden = false;
    img.alt = `Volume ${cur.id}, ${cur.month} ${cur.year}, ${label(page).toLowerCase()}`;
    img.src = src(cur, page);
    count.textContent = label(page);
    goto_.value = front ? (page > front ? page - front : "") : page;
    prev.disabled = page <= 1;
    next.disabled = page >= N;
    saveProgress(cur.id, page);
    for (const q of [page + 1, page + 2, page - 1])           // warm the cache for the pages most likely next
      if (q >= 1 && q <= N) new Image().src = src(cur, q);
  }
  function jump(){
    const v = parseInt(goto_.value, 10);
    if (!Number.isFinite(v)){ goto_.value = front ? (page > front ? page - front : "") : page; return; }
    show(front ? Math.max(1, Math.min(N - front, v)) + front : v);
  }
  function open(id){
    const is = byId(id);
    if (!is || !is.preview) return;
    cur = is; N = is.preview.pages; front = Math.min(is.preview.front || 0, N - 1);
    title.textContent = `Volume ${is.id} · ${is.month} ${is.year}`;
    goto_.max = front ? N - front : N;
    const saved = loadProgress()[is.id];
    show(Number.isInteger(saved) && saved >= 1 && saved <= N ? saved : 1);
    document.documentElement.classList.add("preview-open");
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function close(){
    if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
    document.documentElement.classList.remove("preview-open");
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-preview]");
    if (b) open(b.dataset.preview);
  });
  dlg.addEventListener("close", () => document.documentElement.classList.remove("preview-open"));
  dlg.addEventListener("click", e => { if (e.target === dlg) close(); });      // click on the backdrop
  $(".preview-close").addEventListener("click", close);
  prev.addEventListener("click", () => show(page - 1));
  next.addEventListener("click", () => show(page + 1));
  if (citeBtn && navigator.clipboard){
    citeBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(citeText(cur, label(page))).then(() => {
        const was = citeBtn.textContent;
        citeBtn.textContent = "Copied!";
        setTimeout(() => { citeBtn.textContent = was; }, 1800);
      }).catch(() => {});
    });
  } else if (citeBtn){
    citeBtn.hidden = true;   // no Clipboard API (e.g. insecure context) — nothing graceful to fall back to here
  }
  goto_.addEventListener("change", jump);
  goto_.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); jump(); } });
  document.addEventListener("keydown", e => {
    if (!dlg.open) return;
    if (e.key === "Escape"){ if (typeof dlg.showModal !== "function") close(); return; }   // native dialogs handle Escape themselves
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || "")) return;    // leave arrows/Home/End to the text box
    if (e.key === "ArrowLeft") show(page - 1);
    else if (e.key === "ArrowRight") show(page + 1);
    else if (e.key === "Home") show(1);
    else if (e.key === "End") show(N);
  });
  img.addEventListener("error", () => { img.hidden = true; msg.hidden = false; });
  let startX = null;                                                              // swipe between pages on touch screens
  stage.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive:true});
  stage.addEventListener("touchend", e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX; startX = null;
    if (Math.abs(dx) > 50) show(page + (dx < 0 ? 1 : -1));
  }, {passive:true});
}

/* ------------------------------------------------------------------ boot */
async function loadIssues(){
  try{
    const res = await fetch("data/issues.json", {cache:"no-store"});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) ISSUES = data;
  }catch(e){
    console.error("Could not load data/issues.json — showing no issues.", e);
    ISSUES = [];
  }
}

(async function boot(){
  await loadIssues();
  render();
  initNav();
  initTheme();
  initDyslexicFont();
  initPreview();
  initArchiveControls();
  detectSizes();
  initCompass();
  initMap();
})();
})();
