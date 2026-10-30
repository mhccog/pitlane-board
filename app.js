/* Pitlane board UI. Static: all data is embedded; stage moves are kept in this browser (localStorage). */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("data").textContent), L = window.PL;
  var leads = D.leads, byId = {}; leads.forEach(function (l) { byId[l.id] = l; });
  var st = L.fromHash(location.hash), visible = [], popFor = null;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ext(url, label, cls) { return url ? '<a class="' + (cls || "") + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : ""; }
  function dot(t) { return '<span class="dot dot-' + t.toLowerCase() + '" title="' + t + '"></span>'; }
  function badge(code) { var c = code === "PGT" ? "pgt" : code === "SP" ? "sp" : "pv"; return '<span class="badge b-' + c + '">' + (code === "Private seller" ? "Private seller" : code) + "</span>"; }
  function fitBadge(f) { return f === "None" ? '<span class="muted">—</span>' : '<span class="fit">' + (f === "Premier GT" ? "PGT" : f === "Scuderia Prestige" ? "SP" : "PGT · SP") + "</span>"; }
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
  function go(patch, keepLead) {
    for (var k in patch) st[k] = patch[k];
    if (!keepLead && !("lead" in patch)) st.lead = null;
    var h = L.toHash(st); if (location.hash !== h) history.replaceState(null, "", h);
    render();
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
        var n = navCount(it[0]);
        return '<a href="#/' + it[0] + '" data-view="' + it[0] + '" class="ni' + (st.view === it[0] ? " on" : "") + '"' + (st.view === it[0] ? ' aria-current="page"' : "") + ">" + it[1] + (n !== "" ? '<span class="nn">' + n + "</span>" : "") + "</a>";
      }).join("") + "</div>";
    }).join("");
  }

  /* ---------- header, cards, tabs ---------- */
  var TITLES = { buyers: "Buyers", sellers: "Sellers", matches: "Matches", pgt: "Premier GT stock", sp: "Scuderia Prestige stock", care: "Care rules", platforms: "Platforms", sources: "Sources" };
  function renderHead() {
    $("#title").textContent = TITLES[st.view];
    $("#mode").hidden = !isLeads();
    $$("#mode button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-mode") === st.mode); b.setAttribute("aria-pressed", b.getAttribute("data-mode") === st.mode); });
  }
  function toggleSel(fid, val) {
    var s = (st.sel[fid] || []).slice(), i = s.indexOf(val);
    if (i >= 0) s.splice(i, 1); else s.push(val);
    var sel = {}; for (var k in st.sel) sel[k] = st.sel[k]; sel[fid] = s; go({ sel: sel });
  }
  function renderCards() {
    var el = $("#cards");
    if (!isLeads()) { el.hidden = true; return; } el.hidden = false;
    var all = L.filterLeads(leads, st), hotBase = L.filterLeads(leads, st, "tier"), mBase = L.filterLeads(leads, st, "match"), cBase = L.filterLeads(leads, st, "flag");
    var cards = [
      { id: "all", label: st.view === "sellers" ? "Sellers in view" : "Buyers in view", n: all.length, on: false },
      { id: "tier", v: "Hot", label: "Hot", n: hotBase.filter(function (l) { return l.tier === "Hot"; }).length },
      st.view === "sellers" ? { id: "dealer", v: "Both", label: "Either dealer buys", n: L.filterLeads(leads, st, "dealer").filter(function (l) { return l.fit === "Both"; }).length }
        : { id: "match", v: "Has a match", label: "Stock matches", n: mBase.filter(function (l) { return l.matches > 0; }).length },
      { id: "flag", v: "Needs care", label: "Needs care", n: cBase.filter(function (l) { return l.care.length; }).length }];
    el.innerHTML = cards.map(function (c) {
      var on = c.v && (st.sel[c.id] || []).indexOf(c.v) >= 0;
      var dis = false;
      return '<button type="button" class="card' + (on ? " on" : "") + '" data-card="' + c.id + '" data-v="' + esc(c.v || "") + '"' + (dis ? " disabled" : "") + ' aria-pressed="' + !!on + '"><span class="cn">' + c.n + '</span><span class="cl">' + c.label + "</span></button>";
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
      return '<button type="button" class="fb' + (n ? " on" : "") + '" data-facet="' + f.id + '" aria-haspopup="true">+ ' + f.label + (n ? ' <span class="fbn">' + n + "</span>" : "") + "</button>";
    }).join("");
    var chips = [];
    fs.forEach(function (f) { (st.sel[f.id] || []).forEach(function (v) { chips.push('<span class="chip">' + esc(f.label) + ": " + esc(v) + '<button type="button" aria-label="Remove ' + esc(v) + '" data-rm="' + f.id + '" data-v="' + esc(v) + '">×</button></span>'); }); });
    var any = L.anyFilter(st);
    el.innerHTML = '<div class="trow"><label class="search"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search…  (press /)" value="' + esc(st.q) + '" aria-label="Search" autocomplete="off"></label>' + btns +
      (any ? '<button type="button" class="reset" id="reset">Reset ×</button>' : "") + '<span class="grow"></span><span class="shown" id="shown"></span>' +
      (isLeads() && st.mode === "table" ? '<button type="button" class="fb" id="viewmenu" aria-haspopup="true">View ▾</button>' : "") + "</div>" + (chips.length ? '<div class="chips">' + chips.join("") + "</div>" : "");
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
    }).join("") + (sel.length ? '<button type="button" class="pclear" data-clear="' + fid + '">Clear ' + f.label.toLowerCase() + "</button>" : ""), fid);
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
    if (st.view === "buyers" || st.view === "sellers") return st.mode === "board" ? renderBoard(c) : renderTable(c);
    if (st.view === "matches") return renderMatches(c);
    if (st.view === "pgt" || st.view === "sp") return renderStock(c, st.view === "pgt" ? "Premier GT" : "Scuderia Prestige");
    if (st.view === "care") return renderCare(c);
    if (st.view === "platforms") return renderPlatforms(c);
    return renderSources(c);
  }
  function sortTh(key, label, cls) {
    var on = st.sort.key === key, arrow = on ? (st.sort.dir > 0 ? " ▲" : " ▼") : "";
    return '<th class="' + (cls || "") + '" aria-sort="' + (on ? (st.sort.dir > 0 ? "ascending" : "descending") : "none") + '"><button type="button" class="sort" data-sort="' + key + '">' + label + arrow + "</button></th>";
  }
  function renderTable(c) {
    visible = L.sortLeads(L.filterLeads(leads, st), st.sort);
    var S = st.view === "sellers", cols = st.cols;
    $("#shown") && ($("#shown").textContent = visible.length + " of " + L.baseLeads(leads, st).length);
    var head = '<tr><th class="c-dot"><span class="sr">Tier</span></th>' + sortTh("lead", S ? "Seller" : "Lead", "c-lead") + sortTh("car", S ? "Car for sale" : "Car wanted") +
      '<th>' + (S ? "Price / plan" : "Budget") + "</th>" + sortTh("date", "Posted") +
      (cols.indexOf("platform") >= 0 ? "<th>Platform</th>" : "") + (cols.indexOf("region") >= 0 ? "<th>Region</th>" : "") + (cols.indexOf("kind") >= 0 ? "<th>Type</th>" : "") + (cols.indexOf("quote") >= 0 ? "<th>Quote</th>" : "") +
      (S ? "<th>Dealer</th>" : sortTh("matches", "Matches", "c-num")) + '<th class="c-act"><span class="sr">Actions</span></th></tr>';
    var body = visible.map(function (l) {
      return '<tr data-id="' + l.id + '" tabindex="0" class="' + (st.lead === l.id ? "sel" : "") + '"><td class="c-dot">' + dot(l.tier) + '</td><td class="c-lead"><div class="lh">' + esc(l.handle) + (l.care.length ? ' <span class="warn" title="' + esc(l.care.map(function (x) { return x.label; }).join(" · ")) + '">⚠</span>' : "") + (l.isNew ? ' <span class="new">new</span>' : "") +
        '</div><div class="ls">' + esc(l.platform) + " · " + esc(l.region) + ukTag(l) + '</div></td><td><div class="eyebrow">' + esc(l.brand) + '</div><div class="cm">' + esc(l.model) + "</div></td><td class=\"c-bud\">" + esc(l.budget || "—") + "</td><td class=\"nowrap\">" + posted(l) + "</td>" +
        (cols.indexOf("platform") >= 0 ? "<td>" + esc(l.platform) + "</td>" : "") + (cols.indexOf("region") >= 0 ? "<td>" + esc(l.region) + "</td>" : "") + (cols.indexOf("kind") >= 0 ? "<td>" + esc(L.KIND[l.kind]) + "</td>" : "") + (cols.indexOf("quote") >= 0 ? '<td class="c-q">“' + esc(l.quote) + "”</td>" : "") +
        (S ? "<td>" + fitBadge(l.fit) + "</td>" : '<td class="c-num">' + (l.matches ? '<span class="mb">' + l.matches + "</span>" : '<span class="muted">—</span>') + "</td>") +
        '<td class="c-act"><button type="button" class="more" data-more="' + l.id + '" aria-label="Actions for ' + esc(l.handle) + '">⋯</button></td></tr>';
    }).join("");
    c.innerHTML = '<div class="tablewrap"><table class="grid" id="grid"><thead>' + head + "</thead><tbody>" + (body || '<tr><td colspan="12" class="empty">Nothing matches. <button type="button" class="linkbtn" id="empty-reset">Reset filters</button></td></tr>') + "</tbody></table></div>";
  }
  function renderBoard(c) {
    var S = st.view === "sellers", stages = L.STAGES[S ? "S" : "B"];
    var all = L.sortLeads(L.filterLeads(leads, st), st.sort), arch = all.filter(L.archived);
    visible = st.arch ? all : all.filter(function (l) { return !L.archived(l); });
    $("#shown") && ($("#shown").textContent = visible.length + " on board");
    c.innerHTML = '<div class="board">' + stages.map(function (sg) {
      var items = visible.filter(function (l) { return getStage(l) === sg; });
      return '<section class="col" data-stage="' + esc(sg) + '"><h3>' + esc(sg) + ' <span class="tn">' + items.length + "</span></h3>" + items.map(function (l) {
        return '<article class="bc" data-id="' + l.id + '" tabindex="0"><div class="bch">' + dot(l.tier) + "<b>" + esc(l.handle) + "</b>" + (l.care.length ? ' <span class="warn">⚠</span>' : "") + '</div><div class="eyebrow">' + esc(l.brand) + '</div><div class="cm">' + esc(l.model) + '</div><div class="ls">' + esc(l.region) + " · " + posted(l) + (l.matches ? ' · <span class="mb">' + l.matches + "</span>" : "") +
          '</div><label class="stg"><span class="sr">Stage</span><select data-stage-of="' + l.id + '">' + stages.map(function (o) { return "<option" + (o === sg ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></label></article>";
      }).join("") + "</section>";
    }).join("") + '</div><p class="arch"><button type="button" class="linkbtn" id="archived">' + (st.arch ? "Hide archived" : "Archived (" + arch.length + ")") + '</button> <span class="muted">Watch leads and posts over 90 days old. Stages are saved in this browser only.</span></p>';
  }
  function renderMatches(c) {
    var ms = L.filterMatches(D.matches, byId, st);
    $("#shown") && ($("#shown").textContent = ms.length + " of " + D.matches.length);
    visible = [];
    c.innerHTML = '<div class="tablewrap"><table class="grid" id="mgrid"><thead><tr><th class="c-dot"></th><th class="c-lead">Buyer</th><th>Wants</th><th>Car</th><th>Price vs budget</th><th>Fit</th><th>Status</th></tr></thead><tbody>' +
      (ms.map(function (m) {
        var l = byId[m.buyer];
        return '<tr data-id="' + l.id + '" tabindex="0"><td class="c-dot">' + dot(l.tier) + '</td><td class="c-lead"><div class="lh">' + esc(l.handle) + '</div><div class="ls">' + esc(l.platform) + " · " + esc(l.region) + ukTag(l) + '</div></td><td class="cm">' + esc(l.model) + "</td><td>" + badge(m.src) + " " + ext(m.url, esc(m.car.replace(/ – £[\d,]+$| – POA$/, "")), "carlink") +
          "</td><td><div>" + esc(m.price || "—") + '</div><div class="ls">' + esc(m.priceNote || ("Budget: " + (l.budget || "not stated"))) + '</div></td><td><span class="fitx fit-' + m.fit.toLowerCase() + '">' + m.fit + '</span><div class="ls">' + esc(m.fitNote) + "</div></td><td>" + esc(m.status) + "</td></tr>";
      }).join("") || '<tr><td colspan="7" class="empty">No matches for these filters.</td></tr>') + "</tbody></table></div>";
  }
  function renderStock(c, dealer) {
    var d = D.dealers[dealer], cars = D.stock.filter(function (s) { return s.dealer === dealer; });
    c.innerHTML = '<div class="dealer"><div><div class="eyebrow">' + esc(d.place) + "</div><p class=\"quote\">“" + esc(d.buys) + '” <span class="muted">— ' + ext(d.buysUrl, "their website") + '</span></p><p class="muted">' + esc(d.ways) + '</p></div><div class="dl">' + ext(d.stock, "Open stock list ↗", "btn") + ext(d.sell, "Sell-your-car page ↗", "btn ghost") + "</div></div>" +
      '<div class="tablewrap"><table class="grid"><thead><tr><th>Car</th><th>Year</th><th>Miles</th><th>Price</th><th>Status</th><th>Buyer interest</th></tr></thead><tbody>' + cars.map(function (s) {
        return '<tr class="norow"><td><div class="eyebrow">' + esc(s.make) + "</div>" + ext(s.url, esc(s.model), "carlink") + '<div class="ls">' + esc(s.variant) + "</div></td><td>" + esc(s.year || "—") + "</td><td>" + esc(s.miles || "—") + '</td><td class="nowrap">' + esc(s.price || "—") + "</td><td>" + esc(s.status) + "</td><td>" +
          (s.interest ? '<button type="button" class="mb linkish" data-stockmatch="' + esc(s.url) + '">' + s.interest + " buyer" + (s.interest > 1 ? "s" : "") + "</button>" : '<span class="muted">—</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function renderCare(c) {
    var flagged = leads.filter(function (l) { return l.care.length && l.kind !== "B" && !(l.care.length === 1 && l.care[0].label === "Over 90 days old"); });
    c.innerHTML = '<div class="ref"><h2>Always</h2>' + D.generalCare.map(function (g) { return '<div class="rc"><b>' + esc(g.title) + '</b> <span class="tag">' + esc(g.label) + "</span><p>" + esc(g.detail) + "</p></div>"; }).join("") +
      '<div class="rc"><b>No contact from this board</b><p>Public posts only. Nobody is contacted, followed or messaged from here; Cyrus decides any outreach himself.</p></div>' +
      "<h2>Leads with a care flag</h2>" + flagged.map(function (l) { return '<button type="button" class="rc rcb" data-open="' + l.id + '">' + dot(l.tier) + " <b>" + esc(l.handle) + "</b> <span class=\"muted\">" + esc(l.platform) + "</span>" + l.care.map(function (x) { return '<p><span class="tag warnbg">' + esc(x.label) + "</span> " + esc(x.detail) + "</p>"; }).join("") + "</button>"; }).join("") + "</div>";
  }
  function renderPlatforms(c) {
    var n = {}; leads.forEach(function (l) { n[l.platform] = (n[l.platform] || 0) + 1; });
    c.innerHTML = '<div class="tablewrap"><table class="grid"><thead><tr><th>Platform</th><th>Leads</th><th>What the handle opens</th><th>Login needed</th></tr></thead><tbody>' + Object.keys(D.platformGuide).map(function (p) {
      return '<tr class="norow"><td><b>' + esc(p) + "</b></td><td>" + (n[p] || 0) + "</td><td>" + esc(D.platformGuide[p].link) + "</td><td>" + esc(D.platformGuide[p].login) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  function renderSources(c) {
    c.innerHTML = '<div class="ref">' + D.sources.map(function (s) { return '<div class="rc"><b>' + esc(s.title) + '</b> <span class="tag tone-' + esc(s.tone) + '">' + esc(s.status) + "</span><p>" + esc(s.detail) + "</p></div>"; }).join("") + "</div>";
  }

  /* ---------- side panel ---------- */
  function openPanel(id) { go({ lead: id }, true); }
  function renderPanel() {
    var p = $("#panel"), l = st.lead !== null ? byId[st.lead] : null;
    if (!l) { p.hidden = true; document.body.classList.remove("panel-open"); return; }
    p.hidden = false; document.body.classList.add("panel-open");
    var mine = D.matches.filter(function (m) { return m.buyer === l.id; }), wants = D.matches.filter(function (m) { return m.seller === l.id; });
    var dealersHtml = "";
    if (l.type === "B") dealersHtml = mine.length ? mine.map(function (m) {
      return '<div class="mc">' + badge(m.src) + ' <span class="fitx fit-' + m.fit.toLowerCase() + '">' + m.fit + "</span>" + "<div><b>" + ext(m.url, esc(m.car.replace(/ – £[\d,]+$| – POA$/, "")), "carlink") + '</b></div><div class="ls">' + esc([m.price, m.priceNote, m.status].filter(Boolean).join(" · ")) + "</div></div>";
    }).join("") : '<p class="muted">No dealer car or private seller matches this yet.</p>';
    else {
      var ds = l.fit === "Both" ? ["Premier GT", "Scuderia Prestige"] : (D.dealers[l.fit] ? [l.fit] : []);
      dealersHtml = ds.map(function (d) { var x = D.dealers[d]; return '<div class="mc">' + badge(x.code) + " <b>" + esc(d) + '</b><div class="ls">' + esc(x.ways) + "</div>" + ext(x.sell, "Their sell-your-car page ↗", "carlink") + "</div>"; }).join("") || '<p class="muted">Neither dealer is an obvious buyer.</p>';
      if (wants.length) dealersHtml += '<h4>Buyers who want this</h4>' + wants.map(function (m) { var b = byId[m.buyer]; return '<button type="button" class="mc mcb" data-open="' + b.id + '">' + dot(b.tier) + " <b>" + esc(b.handle) + '</b> <span class="fitx fit-' + m.fit.toLowerCase() + '">' + m.fit + '</span><div class="ls">' + esc(b.model) + "</div></button>"; }).join("");
    }
    var idx = visible.map(function (x) { return x.id; }).indexOf(l.id);
    p.innerHTML = '<div class="pt"><div class="pnav"><button type="button" id="p-prev" aria-label="Previous lead"' + (idx > 0 ? "" : " disabled") + '>↑</button><button type="button" id="p-next" aria-label="Next lead"' + (idx >= 0 && idx < visible.length - 1 ? "" : " disabled") + '>↓</button><span class="muted">' + (idx >= 0 ? (idx + 1) + " / " + visible.length : "") + '</span></div><button type="button" id="p-close" class="x" aria-label="Close">×</button></div>' +
      '<div class="phd"><h2>' + esc(l.handle) + "</h2><div class=\"meta\">" + dot(l.tier) + " " + l.tier + " · " + esc(l.brand) + " · " + esc(l.platform) + " · " + posted(l) + "</div>" +
      (l.post && l.post !== "pending" ? ext(l.post, (l.type === "S" ? "Open advert / post ↗" : "Open post ↗"), "btn") : '<span class="muted">' + (l.post === "pending" ? "Post link pending" : "Post link not visible") + "</span>") + "</div>" +
      (l.quote ? '<blockquote>“' + esc(l.quote) + "”</blockquote>" : "") +
      '<dl class="facts"><dt>' + (l.type === "S" ? "Car" : "Wants") + "</dt><dd>" + esc(l.model) + "</dd><dt>" + (l.type === "S" ? "Price / plan" : "Budget & timing") + "</dt><dd>" + esc(l.budget || "Not stated") + "</dd><dt>Region</dt><dd>" + esc(l.region) + (l.location && l.location !== l.region ? " · " + esc(l.location) : "") + ukTag(l) + "</dd><dt>Type</dt><dd>" + esc(L.KIND[l.kind]) + "</dd><dt>Profile</dt><dd>" + (l.profile ? ext(l.profile, "Open profile ↗") : '<span class="muted">Opens the post instead</span>') + ' <button type="button" class="mini" id="p-copy">Copy handle</button></dd>' +
      (l.type === "B" ? "<dt>Dealer fit</dt><dd>" + esc(l.fit) + "</dd>" : "") + "</dl>" +
      l.care.map(function (x) { return '<div class="banner"><b>⚠ ' + esc(x.label) + "</b> " + esc(x.detail) + "</div>"; }).join("") +
      "<h3>" + (l.type === "B" ? "Matched cars" : "Who would buy it") + "</h3>" + dealersHtml + (l.note ? "<h3>Notes</h3><p class=\"note\">" + esc(l.note) + "</p>" : "");
    $$("#grid tbody tr").forEach(function (r) { r.classList.toggle("sel", +r.getAttribute("data-id") === l.id); });
  }
  function step(d) {
    var idx = visible.map(function (x) { return x.id; }).indexOf(st.lead), n = idx + d;
    if (idx >= 0 && n >= 0 && n < visible.length) { openPanel(visible[n].id); var r = $('#grid tr[data-id="' + visible[n].id + '"]'); if (r && r.scrollIntoView) r.scrollIntoView({ block: "nearest" }); }
  }

  function render() { renderNav(); renderHead(); renderCards(); renderTabs(); renderToolbar(); renderContent(); renderPanel(); }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target, a;
    if ((a = t.closest("[data-view]"))) { e.preventDefault(); closePop(); var v = a.getAttribute("data-view"); go({ view: v, sel: {}, q: "", sort: { key: "tier", dir: 1 }, mode: (v === "buyers" || v === "sellers") ? st.mode : "table", lead: null }); window.scrollTo(0, 0); return; }
    if ((a = t.closest("[data-mode]"))) { go({ mode: a.getAttribute("data-mode") }, true); return; }
    if ((a = t.closest("[data-tab]"))) { go({ tab: a.getAttribute("data-tab") }); return; }
    if ((a = t.closest("[data-card]"))) { var id = a.getAttribute("data-card"); if (id === "all") go({ sel: {}, q: "" }); else toggleSel(id, a.getAttribute("data-v")); return; }
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
    if ((a = t.closest("#p-copy"))) { copy(byId[st.lead].handle.replace(/ \(comment\)$/, "")); return; }
    if ((a = t.closest("[data-open]"))) { closePop(); var oid = +a.getAttribute("data-open"), ol = byId[oid];
      if (!isLeads() && st.view !== "matches" && st.view !== "care") { openPanel(oid); return; }
      if (isLeads() && ((st.view === "sellers") !== (ol.type === "S"))) { go({ view: ol.type === "S" ? "sellers" : "buyers", tab: "all", sel: {}, q: "", lead: oid }); return; }
      openPanel(oid); return; }
    if ((a = t.closest("[data-stockmatch]"))) { var u = a.getAttribute("data-stockmatch"), m = D.matches.filter(function (x) { return x.url === u; }); if (m.length) go({ view: "matches", sel: {}, q: u.split("/").pop(), mode: "table" }); return; }
    if ((a = t.closest("#p-close"))) { go({ lead: null }, true); return; }
    if ((a = t.closest("#p-prev"))) { step(-1); return; }
    if ((a = t.closest("#p-next"))) { step(1); return; }
    if (t.closest("select") || t.closest("a") || t.closest("#pop") || t.closest("label")) return;
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
    if (e.key === "Escape") { if (!$("#pop").hidden) closePop(); else if (st.lead !== null) go({ lead: null }, true); return; }
    if (st.lead !== null && !inField && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); step(e.key === "ArrowDown" ? 1 : -1); return; }
    if (e.key === "Enter" && e.target.matches && e.target.matches("tr[data-id], .bc[data-id]")) openPanel(+e.target.getAttribute("data-id"));
  });
  window.addEventListener("hashchange", function () { st = L.fromHash(location.hash); render(); });
  window.addEventListener("resize", closePop);
  render();
})();
