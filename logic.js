/* Pure helpers for the one-page board (also loaded by tests/test_logic.js in Node). */
(function (root) {
  "use strict";
  var TIER = { Hot: 0, Warm: 1, Watch: 2 }, FIT = { Strong: 0, Good: 1, Possible: 2 };
  function isUK(l) { return l.uk === "Y" || l.uk === "L"; }
  function archived(l) { return l.tier === "Watch" || (l.age !== null && l.age !== undefined && l.age > 90); }
  function hiddenByDefault(l) { return archived(l) || !isUK(l); }
  function terms(q) { return String(q || "").toLowerCase().split(/\s+/).filter(Boolean); }
  function dateKey(l) { return l.date || (l.listed ? "2026-10-23" : ""); }
  function leadRows(leads, o) {
    var t = terms(o.q);
    return leads.filter(function (l) {
      if (l.type !== o.type) return false;
      if (!o.all && hiddenByDefault(l)) return false;
      var hay = [l.handle, l.brand, l.model, l.platform, l.region, l.budget, l.quote].join(" ").toLowerCase();
      return t.every(function (x) { return hay.indexOf(x) >= 0; });
    }).sort(function (a, b) { return (TIER[a.tier] - TIER[b.tier]) || (dateKey(b) < dateKey(a) ? -1 : dateKey(b) > dateKey(a) ? 1 : 0) || a.id - b.id; });
  }
  function bestMatches(matches, all, n) {
    var byDate = function (a, b) { return (b.date || "") < (a.date || "") ? -1 : (b.date || "") > (a.date || "") ? 1 : 0; };
    if (all) return matches.slice().sort(function (a, b) { return (FIT[a.fit] - FIT[b.fit]) || byDate(a, b) || a.id - b.id; });
    var per = {}, sk = function (m) { return m.kind === "D" ? "d" + m.stock : "p" + m.seller; };
    return matches.filter(function (m) { return m.fit === "Strong" || m.fit === "Good"; })
      .sort(function (a, b) { return byDate(a, b) || (FIT[a.fit] - FIT[b.fit]) || a.id - b.id; })
      .filter(function (m) { var k = sk(m); per[k] = (per[k] || 0) + 1; return per[k] <= 2; }).slice(0, n || 10);
  }
  function isFresh(l) { return l.age !== null && l.age !== undefined && l.age <= 7; }
  function fmtDate(d) {
    if (!d) return "";
    var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], p = d.split("-");
    if (p.length === 3) return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10) - 1];
    if (p.length === 2) return m[parseInt(p[1], 10) - 1] + " " + p[0];
    return d;
  }
  var api = { isUK: isUK, archived: archived, hiddenByDefault: hiddenByDefault, leadRows: leadRows, bestMatches: bestMatches, isFresh: isFresh, fmtDate: fmtDate, TIER: TIER, FIT: FIT };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PL = api;
})(this);
