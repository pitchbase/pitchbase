// PitchBase Fields: keyword filter for the table on each field page.
// No data lives here; tables are rendered in the HTML at build time.
// C4: use stable row names for deep links.
function initFilter() {
  var q = document.getElementById("q");
  var cat = document.getElementById("f-cat");
  var reg = document.getElementById("f-region");
  var ver = document.getElementById("f-verification");
  var clr = document.getElementById("f-clear");
  var out = document.getElementById("row-count");
  var table = document.getElementById("field-table");
  var nomatch = document.getElementById("no-match");
  if (!q || !table) return;
  var filterPanel = document.querySelector ? document.querySelector(".filter-panel") : null;
  if (filterPanel && window.matchMedia) filterPanel.open = !window.matchMedia("(max-width: 639px)").matches;
  var rows = table.tBodies[0].rows;
  var fromUrl = false;
  try {
    var params = new URLSearchParams(window.location.search);
    var pq = params.get("q"), pc = params.get("cat"), pr = params.get("region");
    var pentry = params.get("entry");
    if (pentry) fromUrl = true;
    if (pq) { q.value = pq; fromUrl = true; }
    if (cat && pc) {
      for (var i = 0; i < cat.options.length; i++) {
        if (cat.options[i].value === pc) { cat.value = pc; fromUrl = true; break; }
      }
    }
    if (reg && pr) {
      for (var j = 0; j < reg.options.length; j++) {
        if (reg.options[j].value === pr) { reg.value = pr; fromUrl = true; break; }
      }
    }
  } catch (e) { /* ignore bad query strings */ }
  function run() {
    var needle = q.value.trim().toLowerCase();
    var c = cat ? cat.value : "";
    var r = reg ? reg.value : "";
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var hit = (fromUrl && pentry) ? row.dataset.name.toLowerCase() === pentry.toLowerCase() : (((!needle || row.textContent.toLowerCase().indexOf(needle) !== -1)
        && (!c || row.getAttribute("data-cat") === c)
        && (!r || row.getAttribute("data-region") === r)
        && (!ver || !ver.value || row.getAttribute("data-region") === "Not verified"))
        || false);
      row.style.display = hit ? "" : "none";
      if (hit) shown++;
    }
    if (out) out.textContent = "Showing " + shown + " of " + rows.length + " entries.";
    if (nomatch) {
      if (shown === 0) {
        nomatch.textContent = "No entries in this directory match that combination. Try broadening your filters: clear the region, try a different category, or browse another field — the free preview shows up to 15 entries per field in full.";
        nomatch.hidden = false;
      } else {
        nomatch.hidden = true;
      }
    }
  }
  q.addEventListener("input", function() { fromUrl = false; run(); });
  if (cat) cat.addEventListener("change", function() { fromUrl = false; run(); });
  if (reg) reg.addEventListener("change", function() { fromUrl = false; run(); });
  if (ver) ver.addEventListener("change", function() { fromUrl = false; run(); });
  if (clr) clr.addEventListener("click", function() {
    q.value = ""; if (cat) cat.value = ""; if (reg) reg.value = ""; if (ver) ver.value = ""; fromUrl = false; run();
  });
  document.querySelectorAll('.filter-chip').forEach(function(button) { button.addEventListener('click', function() { var select = document.getElementById(button.dataset.target); select.value = select.value === button.dataset.value ? '' : button.dataset.value; select.dispatchEvent(new Event('change')); }); });
  var sort = document.getElementById('f-sort');
  if (sort) { var original = Array.from(rows); sort.addEventListener('change', function() { var ordered = original.slice(); if (sort.value === 'name') ordered.sort(function(a,b) { return a.dataset.name.localeCompare(b.dataset.name); }); ordered.forEach(function(row) { table.tBodies[0].appendChild(row); }); }); }
  run();
  if (fromUrl && pentry) {
    var target = Array.from(rows).find(function(row) { return row.style.display !== "none"; });
    if (target) {
      document.body.classList.add("entry-detail");
      var title = document.querySelector(".phead h1");
      if (title) title.textContent = target.dataset.name;
      var snapshot = document.querySelector(".phead .meta");
      if (snapshot && target.dataset.snapshot) {
        var d = target.dataset.snapshot.split("-");
        snapshot.textContent = "Data snapshot " + new Date(Date.UTC(+d[0], +d[1] - 1, +d[2])).toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric", timeZone:"UTC"});
      }
      var heading = document.createElement("h2");
      heading.textContent = target.classList.contains("locked") ? "Full details for members" : "Supplier details";
      table.parentNode.insertBefore(heading, table);
      var score = target.querySelector('[data-label="PitchBase score"] b');
      var value = score && /^\d+/.exec(score.textContent);
      if (value) {
        var dial = document.createElement("td");
        dial.className = "detail-dial";
        dial.setAttribute("aria-label", "PitchBase score " + value[0] + " out of 100");
        dial.style.setProperty("--score", value[0]);
        var label = document.createElement("b");
        label.textContent = value[0];
        dial.appendChild(label);
        target.appendChild(dial);
      }
    }
  }
}
// C5: tokenize and rank search results.
function initSiteSearch() {
  var q = document.getElementById("q");
  var box = document.getElementById("site-results");
  if (!q || !box) return;
  var state = window.SEARCH_INDEX ? "ready" : "idle";
  var pending = null;
  function showNote(text) {
    box.innerHTML = "";
    var p = document.createElement("p"); p.className = "note";
    p.textContent = text; box.appendChild(p);
  }
  function ensureIndex() {
    if (state === "ready") return Promise.resolve(window.SEARCH_INDEX);
    if (pending) return pending;
    var chunks = window.SEARCH_INDEX_CHUNKS || [];
    if (!chunks.length) { state = "ready"; window.SEARCH_INDEX = []; return Promise.resolve([]); }
    state = "loading";
    pending = Promise.all(chunks.map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    })).then(function (parts) {
      var all = [];
      for (var i = 0; i < parts.length; i++) all = all.concat(parts[i].map(function(d) { return {name:d.n, field:d.f, category:d.c, region:d.r, page:d.p, disp:d.d, focus:d.x}; }));
      window.SEARCH_INDEX = all; state = "ready"; return all;
    }).catch(function (e) {
      state = "failed"; pending = null; throw e;
    });
    return pending;
  }
  function render() {
    var needle = q.value.trim().toLowerCase();
    box.innerHTML = "";
    if (!needle) return;
    if (state !== "ready") {
      showNote("Loading search index…");
      ensureIndex().then(function () { render(); }).catch(function () { showNote("Search index failed to load. Reload the page to retry."); });
      return;
    }
    var data = window.SEARCH_INDEX || [];
    var matches = [];
    var tokens = needle.split(/[^\p{L}\p{N}]+/u).filter(function(t) { return t && !/^(a|the|and|for|in|of|china|chinese|company|companies)$/.test(t); });
    var synonyms = {drama:["short drama", "短剧", "漫剧"], video:["film", "animation"], led:["lighting"]};
    function stem(t) { return t.replace(/(ing|es|s)$/, ""); }
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      var hay = (d.name + " " + d.category + " " + (d.disp || "") + " " + d.region + " " + (d.focus || "")).toLowerCase();
      if (tokens.length && tokens.every(function(t) { return [stem(t)].concat(synonyms[t] || []).some(function(v) { return hay.indexOf(v) !== -1; }); })) matches.push(d);
    }
    matches.sort(function(a,b) {
      function rank(d) { return tokens.some(function(t) { return (d.name || "").toLowerCase().indexOf(stem(t)) >= 0; }) ? 0 : tokens.some(function(t) { return (d.category || "").toLowerCase().indexOf(stem(t)) >= 0; }) ? 1 : 2; }
      return rank(a) - rank(b);
    });
    var total = matches.length;
    var head = document.createElement("p"); head.className = "note";
    box.appendChild(head);
    if (!total) {
      head.textContent = "No matches for this keyword. Try a different keyword.";
      return;
    }
    var list = document.createElement("div"); box.appendChild(list);
    var shown = 0;
    var more = document.createElement("button"); more.type = "button"; more.className = "btn";
    more.textContent = "Load more";
    box.appendChild(more);
    function paint() {
      var next = Math.min(shown + 20, total);
      for (var i = shown; i < next; i++) {
        var d = matches[i];
        var a = document.createElement("a");
        a.href = d.page + "?q=" + encodeURIComponent(q.value.trim()) + "&entry=" + encodeURIComponent(d.name); a.className = "srow";
        var b = document.createElement("b"); b.textContent = d.name;
        var s = document.createElement("span");
        s.textContent = d.field + " · " + (d.disp || d.category) + " · " + d.region;
        a.appendChild(b); a.appendChild(document.createTextNode(" "));
        a.appendChild(s); list.appendChild(a);
      }
      shown = next;
      head.textContent = "Showing " + shown + " of " + total + " matches.";
      more.style.display = shown < total ? "" : "none";
    }
    more.addEventListener("click", paint);
    paint();
  }
  q.addEventListener("focus", function () { ensureIndex().catch(function () {}); });
  q.addEventListener("input", render);
  var searchGo = document.getElementById("site-search-go");
  if (searchGo) searchGo.addEventListener("click", render);
  var initial = new URLSearchParams(window.location.search).get("q");
  if (initial) { q.value = initial; render(); }
}
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function cellText(cell) {
  var parts = [];
  for (var i = 0; i < cell.childNodes.length; i++) {
    var n = cell.childNodes[i];
    if (n.nodeType === 3) { var t = n.textContent.trim(); if (t) parts.push(t); }
    else if (n.nodeName === "BR") { parts.push("·"); }
    else { var t2 = n.textContent.trim(); if (t2) parts.push(t2); }
  }
  return parts.join(" ").replace(/\s+/g, " ").replace(/·\s+·/g, "·").trim();
}
function initCompare() {
  var table = document.getElementById("field-table");
  var go = document.getElementById("cmp-go");
  var clr = document.getElementById("cmp-clear");
  var status = document.getElementById("cmp-status");
  var out = document.getElementById("cmp-out");
  if (!table || !go) return;
  var boxes = table.querySelectorAll("input.cmp");
  function selected() {
    var s = [];
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) s.push(boxes[i]);
    return s;
  }
  function refreshStatus() {
    var n = selected().length;
    var bar = document.querySelector(".cmpbar");
    if (bar) bar.hidden = n === 0;
    status.textContent = n === 0 ? "Select 2–4 full entries to compare."
      : "Selected " + n + " of 4. " + (n < 2 ? "Select at least 2 to compare." : "");
  }
  for (var i = 0; i < boxes.length; i++) {
    boxes[i].addEventListener("change", function() {
      if (selected().length > 4) { this.checked = false; status.textContent = "You can compare up to 4 entries."; return; }
      refreshStatus();
    });
  }
  go.addEventListener("click", function() {
    var s = selected();
    if (s.length < 2) { status.textContent = "Select at least 2 entries to compare (up to 4)."; return; }
    var headers = [];
    var ths = table.tHead.rows[0].cells;
    for (var h = 1; h < ths.length; h++) headers.push(ths[h].textContent.trim());
    var cols = [];
    for (var k = 0; k < s.length; k++) {
      var row = s[k].closest("tr");
      var cells = [];
      for (var c = 0; c < headers.length; c++) { var found = Array.from(row.cells).find(function(cell) { return cell.dataset.label === headers[c]; }); cells.push(found ? cellText(found) : "—"); }
      cols.push(cells);
    }
    var html = "<p class='note'>Comparison uses free preview details only. No outcome is promised.</p><div class='tablewrap'><table><caption>Selected entries compared</caption><thead><tr><th scope=\"col\"></th>";
    for (var k2 = 0; k2 < cols.length; k2++) html += "<th scope=\"col\">" + escHtml(cols[k2][0]) + "</th>";
    html += "</tr></thead><tbody>";
    for (var r = 1; r < headers.length; r++) {
      html += "<tr><th scope=\"row\">" + escHtml(headers[r]) + "</th>";
      for (var k3 = 0; k3 < cols.length; k3++) html += "<td>" + escHtml(cols[k3][r] || "—") + "</td>";
      html += "</tr>";
    }
    html += "</tbody></table></div>";
    out.innerHTML = html;
    refreshStatus();
  });
  clr.addEventListener("click", function() {
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = false;
    out.innerHTML = ""; refreshStatus();
  });
  refreshStatus();
}
function initWizard() {
  var f = document.getElementById("wiz-field");
  var r = document.getElementById("wiz-region");
  var k = document.getElementById("wiz-keyword");
  var go = document.getElementById("wiz-go");
  var link = document.getElementById("wiz-link");
  var data = window.WIZARD_FIELDS || {};
  if (!f || !go) return;
  function fillRegions() {
    var d = data[f.value] || { regions: [] };
    r.innerHTML = "";
    var any = document.createElement("option"); any.value = ""; any.textContent = "Any region"; r.appendChild(any);
    for (var i = 0; i < d.regions.length; i++) {
      var o = document.createElement("option"); o.value = d.regions[i]; o.textContent = d.regions[i]; r.appendChild(o);
    }
  }
  f.addEventListener("change", fillRegions);
  fillRegions();
  go.addEventListener("click", function() {
    var d = data[f.value];
    if (!d) return;
    var parts = [];
    if (r.value) parts.push("region=" + encodeURIComponent(r.value));
    if (k.value.trim()) parts.push("q=" + encodeURIComponent(k.value.trim()));
    var href = d.page + (parts.length ? "?" + parts.join("&") : "");
    link.innerHTML = "";
    var a = document.createElement("a"); a.href = href; a.className = "btn"; a.textContent = "View results in " + d.label;
    link.appendChild(a);
    var p = document.createElement("p"); p.className = "note";
    p.textContent = "Results open on the field page with your filters applied. The free preview shows up to 15 entries in full; the rest show names only. If no entries match, the page will say so and suggest broadening your filters. No outcome is promised.";
    link.appendChild(p);
  });
}
document.addEventListener("DOMContentLoaded", function() { initFilter(); initSiteSearch(); initCompare(); initWizard(); });
