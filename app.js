/* Leads board UI. Reads window.BOARD (embedded by build_site.py) and LeadsLogic (logic.js). */
(function () {
  "use strict";
  var L = window.LeadsLogic, B = window.BOARD, LEADS = B.leads, CARE = B.care;
  var state = { f: L.assign(L.DEFAULTS, {}), sort: L.assign(L.DEFAULT_SORT, {}), open: {}, showIntl: false };

  function h(tag, attrs) {
    var el = document.createElement(tag), k;
    attrs = attrs || {};
    for (k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "onclick") el.addEventListener("click", v);
      else if (k === "style") el.setAttribute("style", v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  function $(id) { return document.getElementById(id); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function tierClass(t) { return "tier-" + t.toLowerCase(); }

  function linkBtn(href, label, primary, title) {
    return h("a", { class: "btn" + (primary ? " btn-primary" : ""), href: href, target: "_blank", rel: "noopener noreferrer", title: title || href }, label + " ", h("span", { "aria-hidden": "true", text: "\u2197" }));
  }
  function copyText(text, done) {
    function fallback() {
      try {
        var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "-1000px";
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); document.body.removeChild(ta); done(ok);
      } catch (e) { done(false); }
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  }
  function copyBtn(l) {
    var b = h("button", { type: "button", class: "btn btn-ghost", title: "Copy \u201c" + L.copyValue(l.handle) + "\u201d" }, "Copy handle");
    b.addEventListener("click", function () {
      copyText(L.copyValue(l.handle), function (ok) {
        b.textContent = ok ? "Copied \u2713" : "Copy blocked"; b.classList.add("is-on");
        setTimeout(function () { b.textContent = "Copy handle"; b.classList.remove("is-on"); }, 1800);
      });
    });
    return b;
  }
  function linkButtons(l, withCopy) {
    return h("div", { class: "btns" },
      l.profile ? linkBtn(l.profile, "Open profile", true, "Open profile on " + l.platform) : null,
      L.hasUrl(l.post) ? linkBtn(l.post, "View post", false, "Open the post on " + l.platform) : h("span", { class: "muted", text: l.post === "pending" ? "Link pending" : "Post not visible" }),
      withCopy ? copyBtn(l) : null);
  }
  function badge(text, cls) { return h("span", { class: "badge " + (cls || ""), text: text }); }
  function handleCell(l) {
    var target = l.profile || (L.hasUrl(l.post) ? l.post : "");
    return h("div", { class: "handle" },
      target ? h("a", { href: target, target: "_blank", rel: "noopener noreferrer", class: "handle-link", title: l.profile ? "Open profile on " + l.platform : "No profile link; opens the post" }, l.handle)
             : h("span", { class: "handle-link", text: l.handle }),
      !l.profile && L.hasUrl(l.post) ? badge("post") : null,
      !l.profile && !L.hasUrl(l.post) ? badge("link pending") : null,
      l.kind === "B" ? badge("Broker/Dealer", "badge-accent") : null,
      l.isNew ? h("span", { class: "dot", title: "New today" }) : null);
  }
  function tierPill(t) { return h("span", { class: "tier " + tierClass(t) }, h("i"), t); }

  // ---------- strongest leads ----------
  function card(pick, n) {
    var l = LEADS.filter(function (x) { return x.handle === pick.h; })[0];
    if (!l) return null;
    var c = CARE[l.handle];
    return h("article", { class: "card" },
      h("div", { class: "card-top" }, h("span", { class: "rank", text: (n < 10 ? "0" : "") + n }), tierPill(l.tier)),
      handleCell(l),
      h("p", { class: "card-blurb", text: pick.blurb }),
      c ? h("div", { class: "warn", text: "\u26a0 " + c.label }) : null,
      h("div", { class: "card-meta", text: l.platform + " \u00b7 " + pick.when }),
      linkButtons(l, true));
  }
  function renderTop() {
    clear($("top-uk")); B.topUK.forEach(function (p, i) { var c = card(p, i + 1); if (c) $("top-uk").appendChild(c); });
    var intl = clear($("top-intl"));
    $("intl-toggle").textContent = state.showIntl ? "Hide best outside the UK" : "Show best outside the UK (" + B.topIntl.length + ")";
    $("intl-toggle").setAttribute("aria-expanded", String(state.showIntl));
    $("intl-toggle").classList.toggle("is-on", state.showIntl);
    $("top-title").textContent = state.showIntl ? "Top 5 UK, plus the best outside the UK" : "Top 5 in the UK";
    intl.hidden = !state.showIntl;
    if (state.showIntl) B.topIntl.forEach(function (p, i) { var c = card(p, i + 1); if (c) intl.appendChild(c); });
  }

  // ---------- filters ----------
  function chip(label, count, active, onclick, dotCls) {
    var disabled = !active && count === 0;
    return h("button", { type: "button", class: "chip" + (active ? " is-active" : ""), "aria-pressed": String(active), disabled: disabled, onclick: onclick },
      dotCls ? h("i", { class: "chip-dot " + dotCls }) : null, label, h("span", { class: "chip-n", text: String(count) }));
  }
  function setF(patch) { state.f = L.assign(state.f, patch); render(); }
  function pick(key, value) { var p = {}; p[key] = state.f[key] === value && value !== "All" ? "All" : value; setF(p); }
  function uniq(arr) { var s = {}, o = []; arr.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }
  var BRANDS = uniq(LEADS.map(function (l) { return l.brand; })).sort(function (a, b) {
    return LEADS.filter(function (l) { return l.brand === b; }).length - LEADS.filter(function (l) { return l.brand === a; }).length || (a < b ? -1 : 1);
  });
  var PLATFORMS = uniq(LEADS.map(function (l) { return l.platform; })).sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });

  function renderFilters() {
    var f = state.f, fc = function (p) { return L.facet(LEADS, f, p); };
    var region = clear($("f-region"));
    region.appendChild(chip("UK only", fc({ region: "uk" }), f.region === "uk", function () { setF({ region: "uk" }); }));
    region.appendChild(chip("Show all countries", fc({ region: "all" }), f.region === "all", function () { setF({ region: "all" }); }));
    region.appendChild(chip("New today", fc({ newOnly: true }), f.newOnly, function () { setF({ newOnly: !f.newOnly }); }, "dot-accent"));
    var tier = clear($("f-tier"));
    ["All", "Hot", "Warm", "Watch"].forEach(function (t) { tier.appendChild(chip(t, fc({ tier: t }), f.tier === t, function () { pick("tier", t); }, t === "All" ? null : tierClass(t))); });
    var buyer = clear($("f-buyer"));
    [["All", "All"], ["E", "End buyers"], ["B", "Brokers & dealers"]].forEach(function (b) { buyer.appendChild(chip(b[1], fc({ buyer: b[0] }), f.buyer === b[0], function () { pick("buyer", b[0]); })); });
    var brand = clear($("f-brand"));
    ["All"].concat(BRANDS).forEach(function (b) { brand.appendChild(chip(b, fc({ brand: b }), f.brand === b, function () { pick("brand", b); })); });
    var plat = clear($("f-platform"));
    ["All"].concat(PLATFORMS).forEach(function (p) { plat.appendChild(chip(p, fc({ platform: p }), f.platform === p, function () { pick("platform", p); })); });
    var n = L.activeCount(f, state.sort);
    $("reset").textContent = n ? "Reset filters (" + n + ")" : "Reset filters";
    $("reset").classList.toggle("is-on", n > 0);
    $("q-clear").hidden = !f.q;
    if ($("q").value !== f.q) $("q").value = f.q;
  }

  // ---------- table ----------
  var COLS = [["", ""], ["tier", "Tier"], ["handle", "Lead"], ["car", "Car wanted"], ["", "Budget / timing"], ["platform", "Platform"], ["date", "Posted"], ["region", "Region"], ["type", "Type"], ["", "Links"]];
  function renderHead() {
    var tr = clear($("thead-row"));
    COLS.forEach(function (c) {
      if (!c[0]) { tr.appendChild(h("th", { text: c[1] })); return; }
      var on = state.sort.key === c[0];
      tr.appendChild(h("th", { "aria-sort": on ? (state.sort.dir === 1 ? "ascending" : "descending") : "none" },
        h("button", { type: "button", class: "sort" + (on ? " is-on" : ""), title: "Sort by " + c[1], onclick: function () { state.sort = L.nextSort(state.sort, c[0]); render(); } },
          c[1], h("span", { class: "arrow", text: on ? (state.sort.dir === 1 ? "\u25b2" : "\u25bc") : "\u2195" }))));
    });
  }
  function detailRow(l) {
    var care = L.careFor(l, CARE), c = CARE[l.handle];
    var dl = h("dl", { class: "facts" },
      h("dt", { text: "Budget / timing" }), h("dd", { text: l.budget || "Not stated" }),
      h("dt", { text: "Location" }), h("dd", { text: l.location || "Not stated" }),
      h("dt", { text: "Posted" }), h("dd", { text: L.fmtDate(l.date) + " on " + l.platform }),
      h("dt", { text: "Buyer type" }), h("dd", { text: l.kind === "B" ? "Broker/Dealer" : "End buyer" }),
      h("dt", { text: "Handle with care" }), h("dd", { class: "tags" }, care.length ? care.map(function (x) { return badge(x, "badge-warn"); }) : h("span", { class: "muted", text: "Nothing flagged" })),
      c ? h("dt", { text: "Note" }) : null, c ? h("dd", { text: c.detail }) : null);
    return h("tr", { class: "detail" }, h("td"), h("td", { colspan: "9" },
      h("div", { class: "detail-grid" },
        h("div", null, h("blockquote", { text: "\u201c" + l.quote + "\u201d" }), l.note ? h("p", { class: "note", text: l.note }) : null, linkButtons(l, true)),
        dl)));
  }
  function renderBody(rows) {
    var tb = clear($("tbody"));
    if (!rows.length) {
      tb.appendChild(h("tr", null, h("td", { colspan: "10", class: "empty" }, "No leads match these filters. ",
        h("button", { type: "button", class: "btn btn-ghost", onclick: reset }, "Reset filters"))));
      return;
    }
    rows.forEach(function (l) {
      var open = !!state.open[l.id], care = L.careFor(l, CARE);
      tb.appendChild(h("tr", { class: open ? "is-open" : "" },
        h("td", null, h("button", { type: "button", class: "expander" + (open ? " is-on" : ""), "aria-expanded": String(open), "aria-label": (open ? "Hide" : "Show") + " details for " + l.handle,
          title: open ? "Hide details" : "Show quote, budget, notes and flags", onclick: function () { if (state.open[l.id]) delete state.open[l.id]; else state.open[l.id] = 1; render(); } }, open ? "\u25be" : "\u25b8")),
        h("td", null, tierPill(l.tier)),
        h("td", { class: "c-lead" }, handleCell(l), care.length ? h("div", { class: "warn small", text: "\u26a0 " + care[0] + (care.length > 1 ? " +" + (care.length - 1) : "") }) : null),
        h("td", { class: "c-car" }, h("div", { class: "eyebrow", text: l.brand }), h("div", { text: l.model })),
        h("td", { class: "c-budget" + (l.budget ? "" : " faint"), text: l.budget || "\u2013" }),
        h("td", { class: "nowrap dim", text: l.platform }),
        h("td", { class: "nowrap dim num", text: l.date ? L.fmtDate(l.date) : "\u2013" }),
        h("td", { class: "nowrap" }, l.uk === "Y" ? h("span", { class: "accent strong", text: "UK" }) : l.uk === "L" ? h("span", { class: "accent", text: "UK?" }) : h("span", { class: "faint", text: "\u2013" })),
        h("td", { class: "nowrap" }, l.kind === "B" ? badge("Broker/Dealer", "badge-accent") : h("span", { class: "dim small", text: "End buyer" })),
        h("td", null, linkButtons(l, false))));
      if (open) tb.appendChild(detailRow(l));
    });
  }
  function renderKpis(rows) {
    var k = clear($("kpis"));
    [["Showing", rows.length, ""], ["Hot", rows.filter(function (l) { return l.tier === "Hot"; }).length, "tier-hot"],
     ["Warm", rows.filter(function (l) { return l.tier === "Warm"; }).length, "tier-warm"], ["Watch", rows.filter(function (l) { return l.tier === "Watch"; }).length, "tier-watch"],
     ["UK / likely UK", rows.filter(L.isUK).length, "accent"], ["Brokers / dealers", rows.filter(function (l) { return l.kind === "B"; }).length, "dim"]
    ].forEach(function (x) { k.appendChild(h("div", { class: "kpi" }, h("div", { class: "kpi-v " + x[2], text: String(x[1]) }), h("div", { class: "kpi-l", text: x[0] }))); });
  }
  function render() {
    var rows = L.view(LEADS, state.f, state.sort);
    renderFilters(); renderHead(); renderBody(rows); renderKpis(rows);
    $("shown").textContent = rows.length + " of " + LEADS.length;
    $("table-title").textContent = state.f.region === "uk" ? "UK and likely-UK leads" : "All countries";
  }
  function reset() { state.f = L.assign(L.DEFAULTS, {}); state.sort = L.assign(L.DEFAULT_SORT, {}); state.open = {}; render(); }

  // ---------- reference panels (static content, native <details> for collapsing) ----------
  function renderPanels() {
    var care = clear($("care-list"));
    Object.keys(CARE).forEach(function (hdl) {
      var c = CARE[hdl];
      care.appendChild(h("div", { class: "note-row" },
        h("div", null, h("div", { class: "note-title" }, hdl, h("span", { class: "faint", text: " \u00b7 " + c.platform })), h("div", { class: "dim", text: c.detail })),
        h("div", { class: "btns" }, badge(c.label, "badge-warn"), h("button", { type: "button", class: "btn btn-ghost", onclick: function () { showInTable(hdl); } }, "Show in table"))));
    });
    B.generalCare.forEach(function (c) {
      care.appendChild(h("div", { class: "note-row" }, h("div", null, h("div", { class: "note-title", text: c.title }), h("div", { class: "dim", text: c.detail })), badge(c.label, "badge-warn")));
    });
    var gt = clear($("guide-body"));
    var names = uniq(PLATFORMS.concat(Object.keys(B.platformGuide)));
    names.forEach(function (p) {
      var n = LEADS.filter(function (l) { return l.platform === p; }).length, g = B.platformGuide[p];
      gt.appendChild(h("tr", null, h("td", { class: "strong nowrap", text: p }), h("td", { class: n ? "" : "faint", text: n ? String(n) : "Coming" }),
        h("td", { class: "dim", text: g ? g.link : "Add a profile link for each lead" }), h("td", { class: "dim nowrap", text: g ? g.login : "\u2013" })));
    });
    $("guide-summary").textContent = PLATFORMS.length + " platforms live \u00b7 new platforms appear in the filters automatically";
    var src = clear($("sources-list"));
    B.sources.forEach(function (s) {
      src.appendChild(h("div", { class: "note-row" }, h("div", null, h("div", { class: "note-title", text: s.title }), h("div", { class: "dim", text: s.detail })), badge(s.status, "tone-" + s.tone)));
    });
  }
  function showInTable(handle) {
    state.f = L.assign(L.DEFAULTS, { region: "all", q: handle }); render();
    $("leads").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- wire up ----------
  $("q").addEventListener("input", function (e) { state.f = L.assign(state.f, { q: e.target.value }); render(); });
  $("q-clear").addEventListener("click", function () { setF({ q: "" }); $("q").focus(); });
  $("reset").addEventListener("click", reset);
  $("intl-toggle").addEventListener("click", function () { state.showIntl = !state.showIntl; renderTop(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== $("q")) { e.preventDefault(); $("q").focus(); }
    else if (e.key === "Escape" && document.activeElement === $("q") && state.f.q) { setF({ q: "" }); }
  });
  $("count-total").textContent = String(LEADS.length);
  $("count-uk").textContent = String(LEADS.filter(L.isUK).length);
  renderTop(); renderPanels(); render();
})();
