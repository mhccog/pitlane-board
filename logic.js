/* Pure state / filter / sort logic for the Pitlane board. Shared by app.js (browser) and tests (node). */
(function (root) {
  "use strict";
  var TIER = { Hot: 0, Warm: 1, Watch: 2 };
  var REGION_RANK = { "London": 0, "South East": 0, "UK (not stated)": 1, "Likely UK": 1, "South West": 1, "Midlands": 2, "North West": 2, "North": 2, "Scotland/Wales/NI": 3, "Unknown": 4, "International": 5 };
  var KIND = { E: "End buyer", B: "Broker or dealer", P: "Private seller" };
  var TABS = [
    { id: "hotuk", label: "Hot UK" }, { id: "new", label: "New this week" }, { id: "all", label: "All countries" },
    { id: "trade", label: "Brokers & dealers" }, { id: "care", label: "Needs care" }];
  var LEAD_FACETS = [
    { id: "brand", label: "Brand", get: function (l) { return l.brand; } },
    { id: "tier", label: "Tier", get: function (l) { return l.tier; }, order: ["Hot", "Warm", "Watch"] },
    { id: "region", label: "Region", get: function (l) { return l.region; }, order: Object.keys(REGION_RANK) },
    { id: "platform", label: "Platform", get: function (l) { return l.platform; } },
    { id: "kind", label: "Buyer type", get: function (l) { return KIND[l.kind]; } },
    { id: "dealer", label: "Dealer", get: function (l) { return l.fit; }, order: ["Premier GT", "Scuderia Prestige", "Both", "None"] },
    { id: "match", label: "Stock match", get: function (l) { return l.matches > 0 ? "Has a match" : "No match"; }, hidden: true },
    { id: "flag", label: "Care", get: function (l) { return l.care.length ? "Needs care" : "No flags"; }, hidden: true }];
  var MATCH_FACETS = [
    { id: "src", label: "Dealer", get: function (m) { return m.src === "PGT" ? "Premier GT" : m.src === "SP" ? "Scuderia Prestige" : "Private seller"; }, order: ["Premier GT", "Scuderia Prestige", "Private seller"] },
    { id: "brand", label: "Brand", get: function (m) { return m.brand; } },
    { id: "fit", label: "Fit", get: function (m) { return m.fit; }, order: ["Exact", "Close"] }];
  var STAGES = { B: ["New", "Reviewed", "Approved", "Contacted by Cyrus", "Closed"], S: ["New", "Valued", "Matched", "Passed to dealer", "Closed"] };
  var VIEWS = ["buyers", "sellers", "matches", "pgt", "sp", "care", "platforms", "sources"];
  var DEFAULT_COLS = [];
  var OPTIONAL_COLS = [{ id: "platform", label: "Platform" }, { id: "region", label: "Region" }, { id: "kind", label: "Buyer type" }, { id: "quote", label: "Quote" }];

  function isUK(l) { return l.uk === "Y" || l.uk === "L"; }
  function tabTest(l, tab) {
    if (tab === "hotuk") return isUK(l) && l.tier === "Hot";
    if (tab === "new") return isUK(l) && !!l.isNew;
    if (tab === "trade") return l.kind === "B";
    if (tab === "care") return isUK(l) && l.care.length > 0;
    return true;
  }
  function terms(q) { return String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean); }
  function hayLead(l) { return [l.handle, l.brand, l.model, l.platform, l.region, l.budget, l.location, l.quote, l.note, l.fit].join(" ").toLowerCase(); }
  function facetOK(x, facets, sel, skip) {
    for (var i = 0; i < facets.length; i++) {
      var f = facets[i]; if (f.id === skip) continue;
      var s = sel[f.id]; if (s && s.length && s.indexOf(f.get(x)) === -1) return false;
    }
    return true;
  }
  function searchOK(hay, q) { var t = terms(q); for (var i = 0; i < t.length; i++) if (hay.indexOf(t[i]) === -1) return false; return true; }
  function baseLeads(leads, st) { var ty = st.view === "sellers" ? "S" : "B"; return leads.filter(function (l) { return l.type === ty && tabTest(l, st.tab); }); }
  function filterLeads(leads, st, skip) { return baseLeads(leads, st).filter(function (l) { return facetOK(l, LEAD_FACETS, st.sel, skip) && searchOK(hayLead(l), st.q); }); }
  function counts(items, facet) {
    var c = {}; items.forEach(function (x) { var v = facet.get(x); c[v] = (c[v] || 0) + 1; }); return c;
  }
  function facetOptions(allItems, filteredExcept, facet) {
    var all = counts(allItems, facet), cur = counts(filteredExcept, facet);
    var keys = Object.keys(all);
    if (facet.order) keys.sort(function (a, b) { var ia = facet.order.indexOf(a), ib = facet.order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a < b ? -1 : 1); });
    else keys.sort(function (a, b) { return (cur[b] || 0) - (cur[a] || 0) || (a < b ? -1 : 1); });
    return keys.map(function (k) { return { value: k, count: cur[k] || 0 }; });
  }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function dateDesc(a, b) { if (a.date === b.date) return 0; if (!a.date) return 1; if (!b.date) return -1; return cmp(b.date, a.date); }
  function sortLeads(list, sort) {
    var k = (sort && sort.key) || "tier", d = (sort && sort.dir) || 1;
    return list.slice().sort(function (a, b) {
      var c = 0;
      if (k === "date") { if (a.date !== b.date) { if (!a.date) return 1; if (!b.date) return -1; c = cmp(a.date, b.date) * d; } }
      else if (k === "lead") c = cmp(a.handle.replace(/^@|^u\//, "").toLowerCase(), b.handle.replace(/^@|^u\//, "").toLowerCase()) * d;
      else if (k === "car") c = (cmp(a.brand, b.brand) || cmp(a.model.toLowerCase(), b.model.toLowerCase())) * d;
      else if (k === "matches") c = (b.matches - a.matches) * d;
      else if (k === "tier") c = (TIER[a.tier] - TIER[b.tier]) * d;
      if (c) return c;
      return (TIER[a.tier] - TIER[b.tier]) || ((REGION_RANK[a.region] || 4) - (REGION_RANK[b.region] || 4)) || dateDesc(a, b) || cmp(a.handle, b.handle);
    });
  }
  function filterMatches(matches, leadsById, st, skip) {
    return matches.filter(function (m) {
      var l = leadsById[m.buyer];
      return facetOK(m, MATCH_FACETS, st.sel, skip) && searchOK([l.handle, l.model, m.car, m.src, m.brand, m.status, m.url].join(" ").toLowerCase(), st.q);
    });
  }
  function archived(l) { return l.tier === "Watch" || (l.age !== null && l.age !== undefined && l.age > 90); }
  function anyFilter(st) { if (terms(st.q).length) return true; for (var k in st.sel) if (st.sel[k] && st.sel[k].length) return true; return false; }
  function defaults() { return { view: "buyers", tab: "hotuk", mode: "table", q: "", sel: {}, cols: DEFAULT_COLS.slice(), sort: { key: "tier", dir: 1 }, lead: null, arch: false }; }
  function toHash(st) {
    var p = [];
    if (st.tab !== "hotuk" && (st.view === "buyers" || st.view === "sellers")) p.push("tab=" + st.tab);
    if (st.mode !== "table") p.push("mode=" + st.mode);
    if (st.q) p.push("q=" + encodeURIComponent(st.q));
    Object.keys(st.sel).sort().forEach(function (k) { if (st.sel[k] && st.sel[k].length) p.push(k + "=" + st.sel[k].map(encodeURIComponent).join("~")); });
    if (st.cols.length) p.push("cols=" + st.cols.join("~"));
    if (st.sort && (st.sort.key !== "tier" || st.sort.dir !== 1)) p.push("sort=" + st.sort.key + (st.sort.dir < 0 ? "-" : ""));
    if (st.lead !== null && st.lead !== undefined) p.push("lead=" + st.lead);
    if (st.arch) p.push("arch=1");
    return "#/" + st.view + (p.length ? "?" + p.join("&") : "");
  }
  function fromHash(h) {
    var st = defaults(); h = String(h || "").replace(/^#\/?/, "");
    var qi = h.indexOf("?"), v = qi < 0 ? h : h.slice(0, qi), qs = qi < 0 ? "" : h.slice(qi + 1);
    if (VIEWS.indexOf(v) >= 0) st.view = v;
    qs.split("&").filter(Boolean).forEach(function (kv) {
      var i = kv.indexOf("="), k = i < 0 ? kv : kv.slice(0, i), val = i < 0 ? "" : kv.slice(i + 1);
      if (k === "tab" && TABS.some(function (t) { return t.id === val; })) st.tab = val;
      else if (k === "mode" && (val === "board" || val === "table")) st.mode = val;
      else if (k === "q") st.q = decodeURIComponent(val);
      else if (k === "cols") st.cols = val.split("~").filter(function (c) { return OPTIONAL_COLS.some(function (o) { return o.id === c; }); });
      else if (k === "sort") st.sort = { key: val.replace(/-$/, ""), dir: /-$/.test(val) ? -1 : 1 };
      else if (k === "lead") st.lead = parseInt(val, 10);
      else if (k === "arch") st.arch = val === "1";
      else if (LEAD_FACETS.concat(MATCH_FACETS).some(function (f) { return f.id === k; })) st.sel[k] = val.split("~").map(decodeURIComponent).filter(Boolean);
    });
    return st;
  }
  function fmtDate(d) {
    if (!d) return "";
    var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], p = d.split("-");
    if (p.length === 3) return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10) - 1] + " " + p[0].slice(2);
    if (p.length === 2) return m[parseInt(p[1], 10) - 1] + " " + p[0].slice(2);
    return d;
  }
  var api = { TIER: TIER, KIND: KIND, TABS: TABS, LEAD_FACETS: LEAD_FACETS, MATCH_FACETS: MATCH_FACETS, STAGES: STAGES, OPTIONAL_COLS: OPTIONAL_COLS,
    isUK: isUK, tabTest: tabTest, baseLeads: baseLeads, filterLeads: filterLeads, facetOptions: facetOptions, sortLeads: sortLeads, filterMatches: filterMatches,
    archived: archived, anyFilter: anyFilter, defaults: defaults, toHash: toHash, fromHash: fromHash, fmtDate: fmtDate };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PL = api;
})(this);
