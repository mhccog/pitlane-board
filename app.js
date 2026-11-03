/* Pitlane: one simple page. All data is embedded; nothing is fetched or stored. */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("data").textContent), L = window.PL;
  var leads = D.leads, st = { type: "B", q: "", all: false, allMatches: false };
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function a(url, label, cls) { return url ? '<a class="' + (cls || "") + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : ""; }
  function num(v) { return esc(v).replace(/(£[\d,.]+(?:k|m)?(?:\s?[–-]\s?£?[\d,.]+(?:k|m)?)?|\b[\d,]+ mi\b)/gi, '<span class="mono">$1</span>'); }
  var PCOL = { "Facebook": "#0090ff", "PistonHeads": "#e5484d", "PistonHeads Classifieds": "#e5484d", "Rennlist": "#46a758", "X": "#1c2024", "Premier GT": "#d4af37", "Scuderia Prestige": "#d4af37" };
  var PSHORT = { "Ferrari Owners Club GB (small ads)": "FOC GB", "PistonHeads Classifieds": "PH Classifieds", "Secret Collectors Network": "Secret Collectors" };
  function plat(p) { return '<span class="pf"><i style="background:' + (PCOL[p] || "#8b8d98") + '"></i>' + esc(PSHORT[p] || p) + "</span>"; }
  function dot(t) { return '<span class="dot dot-' + t.toLowerCase() + '" title="' + t + '" aria-label="' + t + '"></span>'; }
  function postOf(l) { return l.post && l.post !== "pending" ? l.post : ""; }
  function care(list) {
    list = list.filter(function (c) { return c.label !== "Over 90 days old"; });
    if (!list.length) return "";
    var tip = list.map(function (c) { return c.label + ": " + c.detail; }).join(" · ");
    return '<span class="warn" tabindex="0" role="note" aria-label="' + esc(tip) + '">⚠<span class="tip">' + esc(tip) + "</span></span>";
  }
  function when(l) { return l.date ? L.fmtDate(l.date) : (l.listed ? "Listed " + l.listed.replace("≤", "within ") : ""); }

  /* header */
  var strong = D.matches.filter(function (m) { return m.fit === "Strong"; }).length, good = D.matches.filter(function (m) { return m.fit === "Good"; }).length;
  var fresh = leads.filter(function (l) { return L.isFresh(l) && L.isUK(l); }).length;
  $("#counts").innerHTML = '<span class="mono">' + fresh + "</span> new this week · " + '<span class="mono">' + strong + "</span> strong and " + '<span class="mono">' + good + "</span> good matches · " +
    '<span class="mono">' + leads.filter(function (l) { return l.type === "B" && !L.hiddenByDefault(l); }).length + "</span> live buyers · " + '<span class="mono">' + leads.filter(function (l) { return l.type === "S" && !L.hiddenByDefault(l); }).length + "</span> sellers";
  $("#dealers").innerHTML = ["Premier GT", "Scuderia Prestige"].map(function (n) { return a(D.dealers[n].stock, n + " ↗", "dl"); }).join("");

  /* matches */
  function seller(m) {
    if (m.kind === "D") { var s = D.stock[m.stock]; return { who: s.dealer, plat: s.dealer, car: m.car, price: [s.miles ? s.miles + " mi" : "", s.price || "POA"].filter(Boolean).join(" · "), url: s.url, care: [] }; }
    var l = leads[m.seller]; return { who: l.handle, plat: l.platform, car: l.model, price: m.price && l.model.indexOf(m.price) >= 0 ? "" : (m.price || "Price not stated"), url: postOf(l), care: l.care };
  }
  function fitBadge(f) { return '<span class="badge f-' + f.toLowerCase() + '">' + f + "</span>"; }
  function pair(m) {
    var s = seller(m), b = leads[m.buyer];
    return '<article class="pair" data-mid="' + m.id + '">' +
      '<div class="side"><div class="lbl">' + (m.kind === "D" ? "Dealer car" : "Seller") + " · " + plat(s.plat) + '</div><div class="who">' + esc(s.who) + care(s.care) + '</div><div class="car">' + esc(s.car) + '</div>' + (s.price ? '<div class="meta">' + num(s.price) + "</div>" : "") + (a(s.url, "Open ↗", "open") || '<span class="meta">No link</span>') + "</div>" +
      '<div class="mid">' + fitBadge(m.fit) + '<span class="arrow" aria-hidden="true">→</span><p class="why">' + esc(m.reason) + "</p></div>" +
      '<div class="side r"><div class="lbl">Buyer · ' + plat(b.platform) + '</div><div class="who">' + dot(b.tier) + esc(b.handle) + care(b.care) + '</div><div class="car">Wants ' + esc(b.model) + '</div><div class="meta">' + (b.budget ? num(b.budget) : "Budget not stated") + "</div>" + (a(postOf(b), "Open ↗", "open") || '<span class="meta">Post not visible</span>') + "</div></article>";
  }
  function renderMatches() {
    var list = L.bestMatches(D.matches, st.allMatches, 10);
    $("#pairs").innerHTML = list.map(pair).join("");
    $("#mtoggle").textContent = st.allMatches ? "Show best 10" : "Show all " + D.matches.length + " matches";
    $("#mcap").textContent = st.allMatches ? "All " + list.length + " pairs, strongest first. Possible ones are looser fits." : "Strong and good fits, newest first.";
  }

  /* leads */
  function row(l) {
    var p = postOf(l), h = p ? a(p, esc(l.handle), "h") : '<span class="h">' + esc(l.handle) + "</span>";
    return '<li class="row" data-id="' + l.id + '">' + dot(l.tier) + '<div class="main"><div class="top">' + h + care(l.care) + (L.isFresh(l) ? '<span class="new">New</span>' : "") + '</div><div class="car">' + esc(l.model) + "</div></div>" +
      '<div class="bud">' + (l.budget ? num(l.budget) : '<span class="muted">—</span>') + '</div><div class="pl">' + plat(l.platform) + '</div><div class="dt mono">' + esc(when(l)) + "</div></li>";
  }
  function renderLeads() {
    var rows = L.leadRows(leads, st), allN = L.leadRows(leads, { type: st.type, q: st.q, all: true }).length;
    document.querySelectorAll("#seg button").forEach(function (b) { var on = b.getAttribute("data-type") === st.type; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    $("#rows").innerHTML = rows.map(row).join("") || '<li class="empty">Nothing found.</li>';
    $("#ltoggle").textContent = st.all ? "Hide Watch, old and non-UK" : "Show all (" + (allN - rows.length) + " more)";
    $("#ltoggle").hidden = !st.all && allN === rows.length;
    $("#lcap").textContent = rows.length + (st.all ? " leads, everything." : " live UK leads. Watch, 90+ days old and non-UK are hidden.");
  }
  document.querySelectorAll("#seg button").forEach(function (b) {
    var t = b.getAttribute("data-type"); b.querySelector(".n").textContent = leads.filter(function (l) { return l.type === t && !L.hiddenByDefault(l); }).length;
    b.addEventListener("click", function () { st.type = t; renderLeads(); });
  });
  $("#q").addEventListener("input", function (e) { st.q = e.target.value; renderLeads(); });
  $("#ltoggle").addEventListener("click", function () { st.all = !st.all; renderLeads(); });
  $("#mtoggle").addEventListener("click", function () { st.allMatches = !st.allMatches; renderMatches(); if (!st.allMatches) $("#matches").scrollIntoView(); });

  /* notes */
  var gaps = D.sources.filter(function (s) { return s.tone === "bad" || s.tone === "warn"; });
  $("#notes").innerHTML = "<h3>Care</h3><ul>" + D.generalCare.map(function (g) { return "<li><b>" + esc(g.title) + ".</b> " + esc(g.detail) + "</li>"; }).join("") + "<li><b>No contact from here.</b> Public posts only; nobody is contacted, followed or messaged from this board.</li></ul>" +
    "<h3>Sources</h3><p>" + D.sources.filter(function (s) { return s.tone === "ok"; }).map(function (s) { return esc(s.title); }).join(" · ") + "</p>" +
    "<h3>Gaps</h3><ul>" + gaps.map(function (s) { return "<li><b>" + esc(s.title) + "</b> (" + esc(s.status.toLowerCase()) + "): " + esc(s.detail) + "</li>"; }).join("") + "</ul>" +
    '<h3>Design credits</h3><p>Colours from <a href="https://github.com/radix-ui/colors" target="_blank" rel="noopener noreferrer">Radix Colors</a> (MIT); tokens and list/card patterns after <a href="https://github.com/shadcn-ui/ui" target="_blank" rel="noopener noreferrer">shadcn/ui</a> (MIT) and <a href="https://github.com/tremorlabs/tremor" target="_blank" rel="noopener noreferrer">Tremor</a> (Apache-2.0); type is <a href="https://github.com/vercel/geist-font" target="_blank" rel="noopener noreferrer">Geist</a> (SIL OFL 1.1) via Google Fonts. No code copied; patterns only.</p>';

  renderMatches(); renderLeads();
})();
