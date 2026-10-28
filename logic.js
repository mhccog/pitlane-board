/* Pure filter / sort / flag logic for the leads board. Shared by app.js (browser) and tests (node). */
(function (root) {
  "use strict";
  var TIER_ORDER = { Hot: 0, Warm: 1, Watch: 2 };
  var DEFAULTS = { region: "uk", tier: "All", brand: "All", platform: "All", buyer: "All", newOnly: false, q: "" };
  var DEFAULT_SORT = { key: "tier", dir: 1 };

  function isUK(l) { return l.uk === "Y" || l.uk === "L"; }
  function hay(l) { return [l.handle, l.brand, l.model, l.platform, l.budget, l.location, l.quote, l.note].join(" ").toLowerCase(); }
  function matches(l, f) {
    if (f.region === "uk" && !isUK(l)) return false;
    if (f.tier !== "All" && l.tier !== f.tier) return false;
    if (f.brand !== "All" && l.brand !== f.brand) return false;
    if (f.platform !== "All" && l.platform !== f.platform) return false;
    if (f.buyer !== "All" && l.kind !== f.buyer) return false;
    if (f.newOnly && !l.isNew) return false;
    var terms = String(f.q || "").trim().toLowerCase().split(/\s+/).filter(function (t) { return t !== ""; });
    if (terms.length) { var h = hay(l); for (var i = 0; i < terms.length; i++) if (h.indexOf(terms[i]) === -1) return false; }
    return true;
  }
  function assign(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function facet(leads, f, patch) { var g = assign(f, patch), n = 0; for (var i = 0; i < leads.length; i++) if (matches(leads[i], g)) n++; return n; }
  function normHandle(h) { return h.replace(/^@|^u\//, "").toLowerCase(); }
  function regionRank(u) { return u === "Y" ? 0 : u === "L" ? 1 : 2; }
  function cmpStr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function dateDesc(a, b) { if (a === b) return 0; if (a === "") return 1; if (b === "") return -1; return cmpStr(b, a); }
  function compare(a, b, key, dir) {
    var c = 0;
    if (key === "date") {
      if (a.date !== b.date) { if (a.date === "") return 1; if (b.date === "") return -1; c = cmpStr(a.date, b.date) * dir; }
    } else {
      if (key === "tier") c = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
      else if (key === "handle") c = cmpStr(normHandle(a.handle), normHandle(b.handle));
      else if (key === "car") c = cmpStr(a.brand, b.brand) || cmpStr(a.model.toLowerCase(), b.model.toLowerCase());
      else if (key === "platform") c = cmpStr(a.platform.toLowerCase(), b.platform.toLowerCase());
      else if (key === "region") c = regionRank(a.uk) - regionRank(b.uk);
      else if (key === "type") c = a.kind === b.kind ? 0 : a.kind === "E" ? -1 : 1;
      c = c * dir;
    }
    if (c !== 0) return c;
    return (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || dateDesc(a.date, b.date) || cmpStr(normHandle(a.handle), normHandle(b.handle));
  }
  function nextSort(cur, k) { return cur.key === k ? { key: k, dir: -cur.dir } : { key: k, dir: k === "date" ? -1 : 1 }; }
  function view(leads, f, sort) { return leads.filter(function (l) { return matches(l, f); }).sort(function (a, b) { return compare(a, b, sort.key, sort.dir); }); }
  function activeCount(f, sort) {
    var n = 0; for (var k in DEFAULTS) if (f[k] !== DEFAULTS[k]) n++;
    if (sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir) n++;
    return n;
  }
  function careFor(l, care) {
    var out = [];
    if (care[l.handle]) out.push(care[l.handle].label);
    if (l.kind === "B") out.push("Trade: broker/dealer");
    if (l.date === "") out.push("Post date not captured");
    else if (l.date < "2026-08") out.push("Older post: may be filled");
    return out;
  }
  function copyValue(h) { return h.replace(/ \(comment\)$/, ""); }
  function hasUrl(u) { return /^https:\/\//.test(u || ""); }
  function fmtDate(d) {
    if (!d) return "Not captured";
    var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], p = d.split("-");
    if (p.length === 3) return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10) - 1] + " " + p[0].slice(2);
    if (p.length === 2) return m[parseInt(p[1], 10) - 1] + " " + p[0].slice(2);
    return d;
  }
  var api = { TIER_ORDER: TIER_ORDER, DEFAULTS: DEFAULTS, DEFAULT_SORT: DEFAULT_SORT, isUK: isUK, matches: matches, facet: facet,
    compare: compare, nextSort: nextSort, view: view, activeCount: activeCount, careFor: careFor, copyValue: copyValue, hasUrl: hasUrl,
    fmtDate: fmtDate, assign: assign };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LeadsLogic = api;
})(this);
