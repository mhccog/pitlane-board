/* Pitlane board UI. Static: all data is embedded; Board stage moves are kept in this browser (localStorage). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("data").textContent), L = window.PL;
  var leads = D.leads, byId = {}; leads.forEach(function (l) { byId[l.id] = l; });
  var st = L.fromHash(location.hash), visible = [], visiblePairs = [], popFor = null;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ext(url, label, cls) { return url ? '<a class="' + (cls || "") + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : ""; }
  function dot(t) { return '<span class="dot dot-' + t.toLowerCase() + '" title="' + t + '"></span>'; }
  function tierBadge(t) { return '<span class="badge t-' + t.toLowerCase() + '">' + t + "</span>"; }
  function fitBadge(f) { var c = f === "Strong" || f === "Exact" ? "f-strong" : f === "Good" || f === "Close" ? "f-good" : "f-poss"; return '<span class="badge ' + c + '">' + esc(f) + "</span>"; }
  var DEALER_CODE = { "Premier GT": "PGT", "Scuderia Prestige": "SP" };
  var PCOL = { "Facebook": "#0090ff", "PistonHeads": "#e5484d", "PistonHeads Classifieds": "#e5484d", "Rennlist": "#46a758", "X": "#1c2024" };
  var PSHORT = { "Ferrari Owners Club GB (small ads)": "FOC GB", "PistonHeads Classifieds": "PH Classifieds", "Secret Collectors Network": "Secret Collectors", "Scuderia Prestige": "Scuderia Prestige" };
  function num(v) { return esc(v).replace(/(£[\d,.]+(?:k|m)?(?:\s?[–-]\s?£?[\d,.]+(?:k|m)?)?|\b\d{4}\b|\b[\d,]+ mi\b)/gi, '<span class="mono">$1</span>'); }
  function pshort(p) { return PSHORT[p] || p; }
  function pbadge(p) {
    if (DEALER_CODE[p]) return '<span class="badge b-dealer" title="' + esc(p) + ' stock">' + DEALER_CODE[p] + "</span>";
    return '<span class="pb" title="' + esc(p) + '"><i style="background:' + (PCOL[p] || "#8b8d98") + '"></i>' + esc(pshort(p)) + "</span>";
  }
  function fitTxt(f) { return f === "None" ? '<span class="muted">—</span>' : '<span class="fitd">' + (f === "Premier GT" ? "PGT" : f === "Scuderia Prestige" ? "SP" : "PGT · SP") + "</span>"; }
  function posted(l) { return l.date ? L.fmtDate(l.date) : (l.listed ? "Listed " + String(l.listed).replace("≤", "within ") : '<span class="muted">n/a</span>'); }
  function ukTag(l) { return l.uk === "L" ? ' <span class="tag">likely UK</span>' : ""; }
  var isLeads = function () { return st.view === "buyers" || st.view === "sellers"; };
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("on"); }, 1800); }
  function copy(text) {
    var done = function () { toast("Copied " + text); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed"); } ta.remove(); }
  }
  function stageKey(l) { return "pitlane.stage." + l.key; }
  function getStage(l) { try { return localStorage.getItem(stageKey(l)) || "New"; } catch (e) { return "New"; } }
  function setStage(l, s) { try { if (s === "New") localStorage.removeItem(stageKey(l)); else localStorage.setItem(stageKey(l), s); } catch (e) {} }
  function go(patch, keep) {
    for (var k in patch) st[k] = patch[k];
    if (!keep) { if (!("lead" in patch)) st.lead = null; if (!("pair" in patch)) st.pair = null; }
    var h = L.toHash(st); if (location.hash !== h) history.replaceState(null, "", h);
    render();
  }
  function sellerOf(m) {
    if (m.kind === "D") { var s = D.stock[m.stock]; return { name: s.dealer, platform: s.dealer, car: m.car, meta: [s.year, s.miles ? s.miles + " mi" : "", s.price || "POA"].filter(Boolean), region: "South East", url: s.url, lead: null, status: s.status }; }
    var l = byId[m.seller];
    return { name: l.handle, platform: l.platform, car: l.model, meta: [m.price || "Price not stated", l.region], region: l.region, url: l.post && l.post !== "pending" ? l.post : "", lead: l, status: "" };
  }

  /* ---------- sidebar ---------- */
  var NAV = [
    { g: "Pipeline", items: [["buyers", "Buyers"], ["sellers", "Sellers"], ["matches", "Matches"]] },
    { g: "Stock", items: [["pgt", "Premier GT"], ["sp", "Scuderia Prestige"]] },
    { g: "Reference", items: [["care", "Care rules"], ["platforms", "Platforms"], ["sources", "Sources"]], bottom: true }];
  function navCount(v) {
    if (v === "buyers") return leads.filter(function (l) { return l.type === "B" && L.isUK(l); }).length;
    if (v === "sellers") return leads.filter(function (l) { return l.type === "S" && L.isUK(l); }).length;
    if (v === "matches") return D.matches.length;
    if (v === "pgt") return D.stock.filter(function (s) { return s.dealer === "Premier GT"; }).length;
    if (v === "sp") return D.stock.filter(function (s) { return s.dealer === "Scuderia Prestige"; }).length;
    return "";
  }
  function renderNav() {
    $("#nav").innerHTML = NAV.map(function (g) {
      return '<div class="ng' + (g.bottom ? " ng-bottom" : "") + '"><div class="ngl">' + g.g + "</div>" + g.items.map(function (it) {
        var n = navCount(it[0]), on = st.view === it[0];
        return '<a href="#/' + it[0] + '" data-view="' + it[0] + '" class="ni' + (on ? " on" : "") + '"' + (on ? ' aria-current="page"' : "") + ">" + it[1] + (n !== "" ? '<span class="nn">' + n + "</span>" : "") + "</a>";
      }).join("") + "</div>";
    }).join("");
  }

  /* ---------- header, cards, tabs ---------- */
  var TITLES = { buyers: "Buyers", sellers: "Sellers", matches: "Matches", pgt: "Premier GT stock", sp: "Scuderia Prestige stock", care: "Care rules", platforms: "Platforms", sources: "Sources" };
  function renderHead() {
    $("#title").textContent = TITLES[st.view];
    $("#mode").hidden = !isLeads();
    $$("#mode button").forEach(function (b) { var on = b.getAttribute("data-mode") === st.mode; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  }
  function toggleSel(fid, val) {
    var s = (st.sel[fid] || []).slice(), i = s.indexOf(val);
    if (i >= 0) s.splice(i, 1); else s.push(val);
    var sel = {}; for (var k in st.sel) sel[k] = st.sel[k]; sel[fid] = s; go({ sel: sel });
  }
  function renderCards() {
    var el = $("#cards"), cards;
    if (st.view === "matches") {
      var all = L.filterMatches(D.matches, byId, st);
      cards = [
        { id: "all", label: "Pairs in view", n: all.length },
        { id: "fit", v: "Strong", label: "Strong fit", n: L.filterMatches(D.matches, byId, st, "fit").filter(function (m) { return m.fit === "Strong"; }).length },
        { id: "cross", v: "Cross-platform", label: "Cross-platform", n: L.filterMatches(D.matches, byId, st, "cross").filter(function (m) { return m.cross; }).length },
        { id: "src", v: "Private seller", label: "Private sellers", n: L.filterMatches(D.matches, byId, st, "src").filter(function (m) { return m.kind === "P"; }).length }];
    } else if (isLeads()) {
      var fl = L.filterLeads(leads, st), mBase = L.filterLeads(leads, st, "match"), cBase = L.filterLeads(leads, st, "flag");
      cards = [
        { id: "all", label: st.view === "sellers" ? "Sellers in view" : "Buyers in view", n: fl.length },
        { id: "tier", v: "Hot", label: "Hot", n: L.filterLeads(leads, st, "tier").filter(function (l) { return l.tier === "Hot"; }).length },
        st.view === "sellers" ? { id: "dealer", v: "Both", label: "Either dealer buys", n: L.filterLeads(leads, st, "dealer").filter(function (l) { return l.fit === "Both"; }).length }
          : { id: "match", v: "Has a match", label: "Have matches", n: mBase.filter(function (l) { return l.matches > 0; }).length },
        { id: "flag", v: "Needs care", label: "Needs care", n: cBase.filter(function (l) { return l.care.length; }).length }];
    } else { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = cards.map(function (c) {
      var on = c.v && (st.sel[c.id] || []).indexOf(c.v) >= 0;
      return '<button type="button" class="card' + (on ? " on" : "") + '" data-card="' + c.id + '" data-v="' + esc(c.v || "") + '" aria-pressed="' + !!on + '"><span class="cl">' + c.label + '</span><span class="cn">' + c.n + "</span></button>";
    }).join("");
  }
  function renderTabs() {
    var el = $("#tabs"); if (!isLeads()) { el.hidden = true; return; } el.hidden = false;
    el.innerHTML = L.TABS.filter(function (t) { return !(st.view === "sellers" && t.id === "trade"); }).map(function (t) {
      var n = L.baseLeads(leads, { view: st.view, tab: t.id }).length;
      return '<button type="button" role="tab" data-tab="' + t.id + '" class="tab' + (st.tab === t.id ? " on" : "") + '" aria-selected="' + (st.tab === t.id) + '">' + t.label + ' <span class="tn">' + n + "</span></button>";
    }).join("");
  }

  /* ---------- toolbar ---------- */
  function facetsFor() { return st.view === "matches" ? L.MATCH_FACETS : L.LEAD_FACETS; }
  function renderToolbar() {
    var el = $("#toolbar");
    if (!isLeads() && st.view !== "matches") { el.hidden = true; return; } el.hidden = false;
    var fs = facetsFor(), btns = fs.filter(function (f) { return !f.hidden && !(st.view === "sellers" && f.id === "kind"); }).map(function (f) {
      var n = (st.sel[f.id] || []).length;
      return '<button type="button" class="fb' + (n ? " on" : "") + '" data-facet="' + f.id + '" aria-haspopup="true"><span class="plus">+</span> ' + f.label + (n ? ' <span class="fbn">' + n + "</span>" : "") + "</button>";
    }).join("");
    var chips = [];
    fs.forEach(function (f) { (st.sel[f.id] || []).forEach(function (v) { chips.push('<span class="chip">' + esc(f.label) + ": " + esc(v) + '<button type="button" aria-label="Remove ' + esc(v) + '" data-rm="' + f.id + '" data-v="' + esc(v) + '">×</button></span>'); }); });
    var any = L.anyFilter(st);
    el.innerHTML = '<div class="trow"><label class="search"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="q" type="search" placeholder="Search…" value="' + esc(st.q) + '" aria-label="Search" autocomplete="off"><kbd>/</kbd></label>' + btns +
      (any ? '<button type="button" class="reset" id="reset">Reset ×</button>' : "") + '<span class="grow"></span><span class="shown" id="shown"></span>' +
      (isLeads() && st.mode === "table" ? '<button type="button" class="btn-o" id="viewmenu" aria-haspopup="true">View ▾</button>' : "") + "</div>" + (chips.length ? '<div class="chips">' + chips.join("") + "</div>" : "");
    var q = $("#q");
    q.addEventListener("input", function () { st.q = q.value; history.replaceState(null, "", L.toHash(st)); renderCards(); renderContent(); renderResetOnly(); });
  }
  function renderResetOnly() {
    var any = L.anyFilter(st), r = $("#reset");
    if (any && !r) { var b = document.createElement("button"); b.type = "button"; b.className = "reset"; b.id = "reset"; b.textContent = "Reset ×"; var g = $("#toolbar .grow"); g.parentNode.insertBefore(b, g); }
    if (!any && r) r.remove();
  }
  function openFacet(btn, fid) {
    var f = facetsFor().filter(function (x) { return x.id === fid; })[0], items, filt;
    if (st.view === "matches") { items = D.matches; filt = L.filterMatches(D.matches, byId, st, fid); }
    else { items = L.baseLeads(leads, st); filt = L.filterLeads(leads, st, fid); }
    var opts = L.facetOptions(items, filt, f), sel = st.sel[fid] || [];
    showPop(btn, '<div class="ph">' + f.label + "</div>" + opts.map(function (o) {
      var on = sel.indexOf(o.value) >= 0;
      return '<label class="opt' + (o.count ? "" : " zero") + '"><input type="checkbox" data-opt="' + esc(o.value) + '"' + (on ? " checked" : "") + "><span>" + esc(o.value) + '</span><span class="oc">' + o.count + "</span></label>";
    }).join("") + (sel.length ? '<button type="button" class="pclear" data-clear="' + fid + '">Clear filter</button>' : ""), fid);
  }
  function openViewMenu(btn) {
    showPop(btn, '<div class="ph">Columns</div>' + L.OPTIONAL_COLS.map(function (c) {
      return '<label class="opt"><input type="checkbox" data-col="' + c.id + '"' + (st.cols.indexOf(c.id) >= 0 ? " checked" : "") + "><span>" + c.label + "</span></label>";
    }).join(""), "view");
  }
  function showPop(anchor, html, kind) {
    var p = $("#pop"); p.innerHTML = html; p.hidden = false; popFor = kind; p.setAttribute("data-for", kind);
    var r = anchor.getBoundingClientRect();
    p.style.top = (r.bottom + window.scrollY + 6) + "px";
    p.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - p.offsetWidth - 8)) + "px";
  }
  function closePop() { $("#pop").hidden = true; popFor = null; }

  /* ---------- content ---------- */
  function renderContent() {
    var c = $("#content");
    if (isLeads()) return st.mode === "board" ? renderBoard(c) : renderTable(c);
    if (st.view === "matches") return renderMatches(c);
    if (st.view === "pgt" || st.view === "sp") return renderStock(c, st.view === "pgt" ? "Premier GT" : "Scuderia Prestige");
    if (st.view === "care") return renderCare(c);
    if (st.view === "platforms") return renderPlatforms(c);
    return renderSources(c);
  }
  function sortTh(key, label, cls) {
    var on = st.sort.key === key, arrow = on ? (st.sort.dir > 0 ? " ↑" : " ↓") : "";
    return '<th class="' + (cls || "") + '" aria-sort="' + (on ? (st.sort.dir > 0 ? "ascending" : "descending") : "none") + '"><button type="button" class="sort" data-sort="' + key + '">' + label + arrow + "</button></th>";
  }
  function renderTable(c) {
    visible = L.sortLeads(L.filterLeads(leads, st), st.sort);
    var S = st.view === "sellers", cols = st.cols;
    if ($("#shown")) $("#shown").textContent = visible.length + " of " + L.baseLeads(leads, st).length;
    var head = '<tr><th class="c-dot"><span class="sr">Tier</span></th>' + sortTh("lead", S ? "Seller" : "Lead", "c-lead") + sortTh("car", S ? "Car for sale" : "Car wanted") +
      '<th>' + (S ? "Price / plan" : "Budget") + "</th>" + sortTh("date", "Posted") +
      (cols.indexOf("platform") >= 0 ? "<th>Platform</th>" : "") + (cols.indexOf("region") >= 0 ? "<th>Region</th>" : "") + (cols.indexOf("kind") >= 0 ? "<th>Type</th>" : "") + (cols.indexOf("quote") >= 0 ? "<th>Quote</th>" : "") +
      (S ? "<th>Dealer</th>" : "") + sortTh("matches", "Matches", "c-num") + '<th class="c-act"><span class="sr">Actions</span></th></tr>';
    var body = visible.map(function (l) {
      return '<tr data-id="' + l.id + '" tabindex="0" class="' + (st.lead === l.id ? "sel" : "") + '"><td class="c-dot">' + dot(l.tier) + '</td><td class="c-lead"><div class="lh">' + esc(l.handle) + (l.care.length ? ' <span class="warn" title="' + esc(l.care.map(function (x) { return x.label; }).join(" · ")) + '">⚠</span>' : "") + (l.isNew ? ' <span class="new">New</span>' : "") +
        '</div><div class="ls">' + esc(l.platform) + " · " + esc(l.region) + ukTag(l) + '</div></td><td><div class="eyebrow">' + esc(l.brand) + '</div><div class="cm">' + esc(l.model) + '</div></td><td class="c-bud">' + num(l.budget || "—") + '</td><td class="nowrap mono">' + posted(l) + "</td>" +
        (cols.indexOf("platform") >= 0 ? "<td>" + pbadge(l.platform) + "</td>" : "") + (cols.indexOf("region") >= 0 ? "<td>" + esc(l.region) + "</td>" : "") + (cols.indexOf("kind") >= 0 ? "<td>" + esc(L.KIND[l.kind]) + "</td>" : "") + (cols.indexOf("quote") >= 0 ? '<td class="c-q">“' + esc(l.quote) + "”</td>" : "") +
        (S ? "<td>" + fitTxt(l.fit) + "</td>" : "") + '<td class="c-num">' + (l.matches ? '<span class="mb">' + l.matches + "</span>" : '<span class="muted">—</span>') + "</td>" +
        '<td class="c-act"><button type="button" class="more" data-more="' + l.id + '" aria-label="Actions for ' + esc(l.handle) + '">⋯</button></td></tr>';
    }).join("");
    c.innerHTML = '<div class="tablewrap"><table class="grid" id="grid"><thead>' + head + "</thead><tbody>" + (body || '<tr><td colspan="12" class="empty">Nothing matches. <button type="button" class="linkbtn" id="empty-reset">Reset filters</button></td></tr>') + "</tbody></table></div>";
  }
  function renderBoard(c) {
    var S = st.view === "sellers", stages = L.STAGES[S ? "S" : "B"];
    var all = L.sortLeads(L.filterLeads(leads, st), st.sort), arch = all.filter(L.archived);
    visible = st.arch ? all : all.filter(function (l) { return !L.archived(l); });
    if ($("#shown")) $("#shown").textContent = visible.length + " on board";
    c.innerHTML = '<div class="board">' + stages.map(function (sg) {
      var items = visible.filter(function (l) { return getStage(l) === sg; });
      return '<section class="col" data-stage="' + esc(sg) + '"><h3>' + esc(sg) + ' <span class="tn">' + items.length + "</span></h3>" + items.map(function (l) {
        return '<article class="bc" data-id="' + l.id + '" tabindex="0"><div class="bch">' + dot(l.tier) + "<b>" + esc(l.handle) + "</b>" + (l.care.length ? ' <span class="warn">⚠</span>' : "") + '</div><div class="eyebrow">' + esc(l.brand) + '</div><div class="cm">' + esc(l.model) + '</div><div class="ls">' + esc(l.region) + " · " + posted(l) + (l.matches ? ' · <span class="mb">' + l.matches + "</span>" : "") +
          '</div><label class="stg"><span class="sr">Stage</span><select data-stage-of="' + l.id + '">' + stages.map(function (o) { return "<option" + (o === sg ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></label></article>";
      }).join("") + "</section>";
    }).join("") + '</div><p class="arch"><button type="button" class="linkbtn" id="archived">' + (st.arch ? "Hide archived" : "Archived (" + arch.length + ")") + '</button> <span class="muted">Watch leads and posts over 90 days old. Stages are saved in this browser only.</span></p>';
  }
  function pairCard(m) {
    var b = byId[m.buyer], s = sellerOf(m);
    var care = (s.lead ? s.lead.care : []).concat(b.care).filter(function (x) { return x.label !== "Over 90 days old"; });
    return '<article class="pair' + (st.pair === m.id ? " sel" : "") + '" data-mid="' + m.id + '" tabindex="0">' +
      '<div class="pside"><div class="lbl">Seller</div><div class="prow">' + pbadge(s.platform) + (s.lead ? dot(s.lead.tier) : "") + "</div>" +
      '<div class="ph">' + esc(s.name) + '</div><div class="pcar">' + esc(s.car) + '</div><div class="pmeta">' + s.meta.map(num).join(" · ") + "</div></div>" +
      '<div class="pmid"><div class="pline"><span class="parrow">→</span></div>' + fitBadge(m.fit) + '<div class="xp">' + (m.cross ? "Cross-platform" : "Same platform") + '</div><div class="preason">' + esc(m.reason) + "</div></div>" +
      '<div class="pside"><div class="lbl">Buyer</div><div class="prow">' + pbadge(b.platform) + dot(b.tier) + '</div><div class="ph">' + esc(b.handle) + '</div><div class="pcar">Wants ' + esc(b.model) + '</div><div class="pmeta">' + (b.budget ? "Budget " + num(b.budget) : "Budget not stated") + " · " + esc(b.region) + "</div></div>" +
      '<footer class="pfoot">' + (s.url ? ext(s.url, s.lead ? "Open seller post ↗" : "Open " + DEALER_CODE[s.platform] + " listing ↗", "plink") : '<span class="muted">No seller link</span>') + (b.post && b.post !== "pending" ? ext(b.post, "Open buyer post ↗", "plink") : '<span class="muted">Buyer post not visible</span>') +
      care.map(function (x) { return '<span class="badge c-care" title="' + esc(x.detail) + '">⚠ ' + esc(x.label) + "</span>"; }).join("") + "</footer></article>";
  }
  function renderMatches(c) {
    var ms = L.sortMatches(L.filterMatches(D.matches, byId, st));
    visiblePairs = ms; visible = [];
    if ($("#shown")) $("#shown").textContent = ms.length + " of " + D.matches.length;
    var pairsAll = L.pairCounts(L.filterMatches(D.matches, byId, st, "pair")), selP = st.sel.pair || [];
    var max = pairsAll.length ? pairsAll[0].count : 1;
    var chips = pairsAll.slice(0, 10).map(function (p) { return '<button type="button" class="pchip' + (selP.indexOf(p.value) >= 0 ? " on" : "") + '" data-pairf="' + esc(p.value) + '">' + esc(p.value.split(" → ").map(pshort).join(" → ")) + ' <span class="mono">(' + p.count + ")</span></button>"; }).join("");
    var bars = pairsAll.slice(0, 6).map(function (p) {
      return '<button type="button" class="bar' + (selP.indexOf(p.value) >= 0 ? " on" : "") + '" data-pairf="' + esc(p.value) + '"><span class="bfill" style="width:' + Math.max(6, Math.round(100 * p.count / max)) + '%"></span><span class="blab">' + esc(p.value.split(" → ").map(pshort).join(" → ")) + '</span><span class="bval mono">' + p.count + "</span></button>";
    }).join("");
    c.innerHTML = '<div class="mwrap"><div class="pchips">' + chips + '</div><section class="barlist"><div class="bl-h"><span>Top platform pairs</span><span class="muted">Pairs</span></div>' + bars + "</section>" +
      '<div class="pairs" id="pairs">' + (ms.map(pairCard).join("") || '<p class="empty">No pairs for these filters. <button type="button" class="linkbtn" id="empty-reset">Reset filters</button></p>') + "</div></div>";
  }
  function renderStock(c, dealer) {
    var d = D.dealers[dealer], cars = D.stock.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s.dealer === dealer; });
    c.innerHTML = '<div class="dealer"><div><div class="lbl">' + esc(d.place) + '</div><p class="quote">“' + esc(d.buys) + '” <span class="muted">— ' + ext(d.buysUrl, "their website") + '</span></p><p class="muted">' + esc(d.ways) + '</p></div><div class="dl">' + ext(d.stock, "Open stock list ↗", "btn") + ext(d.sell, "Sell-your-car page ↗", "btn-o") + "</div></div>" +
      '<div class="tablewrap"><table class="grid"><thead><tr><th>Car</th><th class="c-num">Year</th><th class="c-num">Miles</th><th class="c-num">Price</th><th>Status</th><th class="c-num">Buyers</th></tr></thead><tbody>' + cars.map(function (x) {
        var s = x.s;
        return '<tr class="norow"><td><div class="eyebrow">' + esc(s.make) + "</div>" + ext(s.url, esc(s.model), "carlink") + '<div class="ls">' + esc(s.variant) + '</div></td><td class="c-num mono">' + esc(s.year || "—") + '</td><td class="c-num mono">' + esc(s.miles || "—") + '</td><td class="c-num mono nowrap">' + esc(s.price || "—") + "</td><td>" + esc(s.status) + '</td><td class="c-num">' +
          (s.interest ? '<button type="button" class="mb linkish" data-stockmatch="' + x.i + '">' + s.interest + " buyer" + (s.interest > 1 ? "s" : "") + "</button>" : '<span class="muted">—</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function renderCare(c) {
    var flagged = leads.filter(function (l) { return l.care.length && l.kind !== "B" && !(l.care.length === 1 && l.care[0].label === "Over 90 days old"); });
    c.innerHTML = '<div class="ref"><h2>Always</h2>' + D.generalCare.map(function (g) { return '<div class="rc"><b>' + esc(g.title) + '</b> <span class="tag">' + esc(g.label) + "</span><p>" + esc(g.detail) + "</p></div>"; }).join("") +
      '<div class="rc"><b>No contact from this board</b><p>Public posts only. Nobody is contacted, followed or messaged from here; Cyrus decides any outreach himself.</p></div>' +
      "<h2>Leads with a care flag</h2>" + flagged.map(function (l) { return '<button type="button" class="rc rcb" data-open="' + l.id + '">' + dot(l.tier) + " <b>" + esc(l.handle) + '</b> <span class="muted">' + esc(l.platform) + "</span>" + l.care.map(function (x) { return '<p><span class="badge c-care">' + esc(x.label) + "</span> " + esc(x.detail) + "</p>"; }).join("") + "</button>"; }).join("") + "</div>";
  }
  function renderPlatforms(c) {
    var n = {}; leads.forEach(function (l) { n[l.platform] = (n[l.platform] || 0) + 1; });
    c.innerHTML = '<div class="tablewrap"><table class="grid"><thead><tr><th>Platform</th><th class="c-num">Leads</th><th>What the handle opens</th><th>Login needed</th></tr></thead><tbody>' + Object.keys(D.platformGuide).map(function (p) {
      return '<tr class="norow"><td>' + pbadge(p) + '</td><td class="c-num mono">' + (n[p] || 0) + "</td><td>" + esc(D.platformGuide[p].link) + "</td><td>" + esc(D.platformGuide[p].login) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  function renderSources(c) {
    c.innerHTML = '<div class="ref">' + D.sources.map(function (s) { return '<div class="rc"><b>' + esc(s.title) + '</b> <span class="badge tone-' + esc(s.tone) + '">' + esc(s.status) + "</span><p>" + esc(s.detail) + "</p></div>"; }).join("") + "</div>";
  }

  /* ---------- side panel ---------- */
  function openPanel(id) { go({ lead: id, pair: null }, true); }
  function openPair(id) { go({ pair: id, lead: null }, true); }
  function leadFacts(l) {
    return '<dl class="facts"><dt>' + (l.type === "S" ? "Car" : "Wants") + "</dt><dd>" + esc(l.model) + "</dd><dt>" + (l.type === "S" ? "Price / plan" : "Budget & timing") + '</dt><dd>' + num(l.budget || "Not stated") + "</dd><dt>Region</dt><dd>" + esc(l.region) + (l.location && l.location !== l.region ? " · " + esc(l.location) : "") + ukTag(l) + "</dd><dt>Type</dt><dd>" + esc(L.KIND[l.kind]) + "</dd><dt>Profile</dt><dd>" + (l.profile ? ext(l.profile, "Open profile ↗") : '<span class="muted">Opens the post instead</span>') + ' <button type="button" class="mini" data-copy="' + esc(l.handle.replace(/ \(comment\)$/, "")) + '">Copy handle</button></dd></dl>';
  }
  function pairMini(m, side) {
    var b = byId[m.buyer], s = sellerOf(m);
    var who = side === "buyer" ? pbadge(b.platform) + " <b>" + esc(b.handle) + '</b><div class="ls">Wants ' + esc(b.model) + "</div>" : pbadge(s.platform) + " <b>" + esc(s.name) + '</b><div class="ls">' + esc(s.car) + " · " + s.meta.map(num).join(" · ") + "</div>";
    return '<button type="button" class="mc mcb" data-openpair="' + m.id + '">' + fitBadge(m.fit) + " " + who + '<div class="ls">' + esc(m.reason) + "</div></button>";
  }
  function renderPanel() {
    var p = $("#panel");
    if (st.pair !== null && st.pair !== undefined && D.matches[st.pair]) return renderPairPanel(p, D.matches[st.pair]);
    var l = st.lead !== null ? byId[st.lead] : null;
    if (!l) { p.hidden = true; document.body.classList.remove("panel-open"); return; }
    p.hidden = false; document.body.classList.add("panel-open");
    var mine = D.matches.filter(function (m) { return m.buyer === l.id || m.seller === l.id; });
    mine = L.sortMatches(mine);
    var extra = "";
    if (l.type === "S") {
      var ds = l.fit === "Both" ? ["Premier GT", "Scuderia Prestige"] : (D.dealers[l.fit] ? [l.fit] : []);
      extra = "<h3>Dealers who buy</h3>" + (ds.map(function (d) { var x = D.dealers[d]; return '<div class="mc">' + pbadge(d) + " <b>" + esc(d) + '</b><div class="ls">' + esc(x.ways) + "</div>" + ext(x.sell, "Their sell-your-car page ↗", "plink") + "</div>"; }).join("") || '<p class="muted">Neither dealer is an obvious buyer.</p>');
    }
    var idx = visible.map(function (x) { return x.id; }).indexOf(l.id);
    p.innerHTML = panelNav(idx, visible.length) +
      '<div class="phd"><h2>' + esc(l.handle) + '</h2><div class="meta">' + tierBadge(l.tier) + " " + pbadge(l.platform) + ' <span class="muted">' + esc(l.brand) + " · " + posted(l) + "</span></div>" +
      (l.post && l.post !== "pending" ? ext(l.post, (l.type === "S" ? "Open advert / post ↗" : "Open post ↗"), "btn") : '<span class="muted">' + (l.post === "pending" ? "Post link pending" : "Post link not visible") + "</span>") + "</div>" +
      (l.quote ? "<blockquote>“" + esc(l.quote) + "”</blockquote>" : "") + leadFacts(l) +
      (l.type === "B" ? '<dl class="facts"><dt>Dealer fit</dt><dd>' + esc(l.fit) + "</dd></dl>" : "") +
      l.care.map(function (x) { return '<div class="banner"><b>⚠ ' + esc(x.label) + "</b> " + esc(x.detail) + "</div>"; }).join("") +
      "<h3>" + (l.type === "B" ? "Matched cars" : "Matched buyers") + " (" + mine.length + ")</h3>" + (mine.map(function (m) { return pairMini(m, l.type === "B" ? "seller" : "buyer"); }).join("") || '<p class="muted">No matching ' + (l.type === "B" ? "car" : "buyer") + " yet.</p>") +
      extra + (l.note ? '<h3>Notes</h3><p class="note">' + esc(l.note) + "</p>" : "");
    $$("#grid tbody tr").forEach(function (r) { r.classList.toggle("sel", +r.getAttribute("data-id") === l.id); });
  }
  function panelNav(idx, n) {
    return '<div class="pt"><div class="pnav"><button type="button" id="p-prev" aria-label="Previous"' + (idx > 0 ? "" : " disabled") + '>↑</button><button type="button" id="p-next" aria-label="Next"' + (idx >= 0 && idx < n - 1 ? "" : " disabled") + '>↓</button><span class="muted mono">' + (idx >= 0 ? (idx + 1) + " / " + n : "") + '</span></div><button type="button" id="p-close" class="x" aria-label="Close">×</button></div>';
  }
  function renderPairPanel(p, m) {
    p.hidden = false; document.body.classList.add("panel-open");
    var b = byId[m.buyer], s = sellerOf(m), idx = visiblePairs.map(function (x) { return x.id; }).indexOf(m.id);
    p.innerHTML = panelNav(idx, visiblePairs.length) +
      '<div class="phd"><div class="meta">' + fitBadge(m.fit) + ' <span class="muted">' + (m.cross ? "Cross-platform" : "Same platform") + " · " + esc(m.brand) + "</span></div><h2>" + esc(s.name) + " → " + esc(b.handle) + '</h2><p class="preason big">' + esc(m.reason) + "</p></div>" +
      '<h3>Seller</h3><div class="meta">' + pbadge(s.platform) + (s.lead ? " " + tierBadge(s.lead.tier) : "") + "</div>" +
      (s.lead ? (s.lead.quote ? "<blockquote>“" + esc(s.lead.quote) + "”</blockquote>" : "") + leadFacts(s.lead) + s.lead.care.map(function (x) { return '<div class="banner"><b>⚠ ' + esc(x.label) + "</b> " + esc(x.detail) + "</div>"; }).join("")
        : '<dl class="facts"><dt>Car</dt><dd>' + esc(s.car) + '</dd><dt>Details</dt><dd>' + s.meta.map(num).join(" · ") + "</dd><dt>Status</dt><dd>" + esc(s.status) + "</dd><dt>Dealer</dt><dd>" + esc(s.name) + " · " + esc(D.dealers[s.name].place) + "</dd></dl>") +
      (s.url ? ext(s.url, s.lead ? "Open seller post ↗" : "Open dealer listing ↗", "btn") : "") +
      '<h3>Buyer</h3><div class="meta">' + pbadge(b.platform) + " " + tierBadge(b.tier) + ' <span class="muted">' + posted(b) + "</span></div>" + (b.quote ? "<blockquote>“" + esc(b.quote) + "”</blockquote>" : "") + leadFacts(b) +
      b.care.map(function (x) { return '<div class="banner"><b>⚠ ' + esc(x.label) + "</b> " + esc(x.detail) + "</div>"; }).join("") +
      (b.post && b.post !== "pending" ? ext(b.post, "Open buyer post ↗", "btn") : '<span class="muted">Buyer post not visible</span>');
    $$("#pairs .pair").forEach(function (r) { r.classList.toggle("sel", +r.getAttribute("data-mid") === m.id); });
  }
  function step(d) {
    if (st.pair !== null && st.pair !== undefined) {
      var pi = visiblePairs.map(function (x) { return x.id; }).indexOf(st.pair), pn = pi + d;
      if (pi >= 0 && pn >= 0 && pn < visiblePairs.length) { openPair(visiblePairs[pn].id); var c = $('#pairs [data-mid="' + visiblePairs[pn].id + '"]'); if (c && c.scrollIntoView) c.scrollIntoView({ block: "nearest" }); }
      return;
    }
    var idx = visible.map(function (x) { return x.id; }).indexOf(st.lead), n = idx + d;
    if (idx >= 0 && n >= 0 && n < visible.length) { openPanel(visible[n].id); var r = $('#grid tr[data-id="' + visible[n].id + '"]'); if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" }); }
  }

  function render() { renderNav(); renderHead(); renderCards(); renderTabs(); renderToolbar(); renderContent(); renderPanel(); }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target, a;
    if ((a = t.closest("[data-view]"))) { e.preventDefault(); closePop(); var v = a.getAttribute("data-view"); go({ view: v, sel: {}, q: "", sort: { key: "tier", dir: 1 }, mode: (v === "buyers" || v === "sellers") ? st.mode : "table", lead: null, pair: null }); window.scrollTo(0, 0); return; }
    if ((a = t.closest("[data-mode]"))) { go({ mode: a.getAttribute("data-mode") }, true); return; }
    if ((a = t.closest("[data-tab]"))) { go({ tab: a.getAttribute("data-tab") }); return; }
    if ((a = t.closest("[data-card]"))) { var id = a.getAttribute("data-card"); if (id === "all") go({ sel: {}, q: "" }); else toggleSel(id, a.getAttribute("data-v")); return; }
    if ((a = t.closest("[data-pairf]"))) { toggleSel("pair", a.getAttribute("data-pairf")); return; }
    if ((a = t.closest("[data-facet]"))) { if (popFor === a.getAttribute("data-facet")) closePop(); else openFacet(a, a.getAttribute("data-facet")); return; }
    if ((a = t.closest("#viewmenu"))) { if (popFor === "view") closePop(); else openViewMenu(a); return; }
    if ((a = t.closest("[data-clear]"))) { var s1 = {}; for (var k in st.sel) s1[k] = st.sel[k]; delete s1[a.getAttribute("data-clear")]; closePop(); go({ sel: s1 }); return; }
    if ((a = t.closest("[data-rm]"))) { toggleSel(a.getAttribute("data-rm"), a.getAttribute("data-v")); return; }
    if ((a = t.closest("#reset")) || (a = t.closest("#empty-reset"))) { closePop(); go({ sel: {}, q: "" }); return; }
    if ((a = t.closest("[data-sort]"))) { var key = a.getAttribute("data-sort"); go({ sort: st.sort.key === key ? { key: key, dir: -st.sort.dir } : { key: key, dir: key === "date" ? -1 : 1 } }, true); return; }
    if ((a = t.closest("#archived"))) { go({ arch: !st.arch }, true); return; }
    if ((a = t.closest("[data-more]"))) { e.stopPropagation(); var l = byId[+a.getAttribute("data-more")];
      showPop(a, (l.post && l.post !== "pending" ? ext(l.post, "Open post ↗", "mi") : '<span class="mi dis">No post link</span>') + (l.profile ? ext(l.profile, "Open profile ↗", "mi") : '<span class="mi dis">No profile link</span>') + '<button type="button" class="mi" data-copy="' + esc(l.handle.replace(/ \(comment\)$/, "")) + '">Copy handle</button><button type="button" class="mi" data-open="' + l.id + '">Details</button>', "more" + l.id); return; }
    if ((a = t.closest("[data-copy]"))) { copy(a.getAttribute("data-copy")); closePop(); return; }
    if ((a = t.closest("[data-openpair]"))) { var pid = +a.getAttribute("data-openpair"); if (st.view !== "matches") go({ view: "matches", sel: {}, q: "", mode: "table", pair: pid, lead: null }); else openPair(pid); return; }
    if ((a = t.closest("[data-open]"))) { closePop(); var oid = +a.getAttribute("data-open"), ol = byId[oid];
      if (isLeads() && ((st.view === "sellers") !== (ol.type === "S"))) { go({ view: ol.type === "S" ? "sellers" : "buyers", tab: "all", sel: {}, q: "", lead: oid }); return; }
      openPanel(oid); return; }
    if ((a = t.closest("[data-stockmatch]"))) { var si = +a.getAttribute("data-stockmatch"); go({ view: "matches", sel: {}, q: D.stock[si].url.split("/").filter(Boolean).pop(), mode: "table" }); return; }
    if ((a = t.closest("#p-close"))) { go({ lead: null, pair: null }, true); return; }
    if ((a = t.closest("#p-prev"))) { step(-1); return; }
    if ((a = t.closest("#p-next"))) { step(1); return; }
    if (t.closest("select") || t.closest("a") || t.closest("#pop") || t.closest("label")) return;
    if ((a = t.closest(".pair[data-mid]"))) { closePop(); openPair(+a.getAttribute("data-mid")); return; }
    if ((a = t.closest("tr[data-id]")) || (a = t.closest(".bc[data-id]"))) { closePop(); openPanel(+a.getAttribute("data-id")); return; }
    if (!t.closest("#pop")) closePop();
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-opt")) { var fid = $("#pop").getAttribute("data-for"), s = (st.sel[fid] || []).slice(), v = t.getAttribute("data-opt"), i = s.indexOf(v); if (t.checked && i < 0) s.push(v); if (!t.checked && i >= 0) s.splice(i, 1);
      var sel = {}; for (var k in st.sel) sel[k] = st.sel[k]; sel[fid] = s; go({ sel: sel }); var b = $('[data-facet="' + fid + '"]'); if (b) openFacet(b, fid); return; }
    if (t.hasAttribute("data-col")) { var c = st.cols.slice(), id = t.getAttribute("data-col"), j = c.indexOf(id); if (t.checked && j < 0) c.push(id); if (!t.checked && j >= 0) c.splice(j, 1); go({ cols: c }, true); var vb = $("#viewmenu"); if (vb) openViewMenu(vb); return; }
    if (t.hasAttribute("data-stage-of")) { setStage(byId[+t.getAttribute("data-stage-of")], t.value); toast("Moved to " + t.value); renderContent(); return; }
  });
  document.addEventListener("keydown", function (e) {
    var inField = /INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ""));
    if (e.key === "/" && !inField && $("#q")) { e.preventDefault(); $("#q").focus(); return; }
    if (e.key === "Escape") { if (!$("#pop").hidden) closePop(); else if (st.lead !== null || st.pair !== null) go({ lead: null, pair: null }, true); return; }
    if ((st.lead !== null || st.pair !== null) && !inField && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); step(e.key === "ArrowDown" ? 1 : -1); return; }
    if (e.key === "Enter" && e.target.matches) {
      if (e.target.matches("tr[data-id], .bc[data-id]")) openPanel(+e.target.getAttribute("data-id"));
      else if (e.target.matches(".pair[data-mid]")) openPair(+e.target.getAttribute("data-mid"));
    }
  });
  window.addEventListener("hashchange", function () { st = L.fromHash(location.hash); render(); });
  window.addEventListener("resize", closePop);
  render();
})();
