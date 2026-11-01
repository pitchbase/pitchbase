// PitchBase Fields: keyword filter for the table on each field page.
// No data lives here; tables are rendered in the HTML at build time.
function initFilter() {
  var q = document.getElementById("q");
  var cat = document.getElementById("f-cat");
  var reg = document.getElementById("f-region");
  var clr = document.getElementById("f-clear");
  var out = document.getElementById("row-count");
  var table = document.getElementById("field-table");
  var nomatch = document.getElementById("no-match");
  if (!q || !table) return;
  var rows = table.tBodies[0].rows;
  var fromUrl = false;
  try {
    var params = new URLSearchParams(window.location.search);
    var pq = params.get("q"), pc = params.get("cat"), pr = params.get("region");
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
      var hit = (!needle || row.textContent.toLowerCase().indexOf(needle) !== -1)
        && (!c || row.getAttribute("data-cat") === c)
        && (!r || row.getAttribute("data-region") === r);
      row.style.display = hit ? "" : "none";
      if (hit) shown++;
    }
    out.textContent = "Showing " + shown + " of " + rows.length + " entries.";
    if (nomatch) {
      if (fromUrl && shown === 0) {
        nomatch.textContent = "No entries in this directory match that combination （本目录暂无该组合）. Try broadening your filters: clear the region, try a different category, or browse another field — the free preview shows up to 15 entries per field in full.";
        nomatch.hidden = false;
      } else {
        nomatch.hidden = true;
      }
    }
  }
  q.addEventListener("input", function() { fromUrl = false; run(); });
  if (cat) cat.addEventListener("change", function() { fromUrl = false; run(); });
  if (reg) reg.addEventListener("change", function() { fromUrl = false; run(); });
  if (clr) clr.addEventListener("click", function() {
    q.value = ""; if (cat) cat.value = ""; if (reg) reg.value = ""; fromUrl = false; run();
  });
  run();
}
function initSiteSearch() {
  var q = document.getElementById("site-q");
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
      for (var i = 0; i < parts.length; i++) all = all.concat(parts[i]);
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
      showNote("正在加载搜索索引…");
      ensureIndex().then(function () { render(); }).catch(function () { showNote("搜索索引加载失败，请刷新页面重试。"); });
      return;
    }
    var data = window.SEARCH_INDEX || [];
    var shown = 0;
    for (var i = 0; i < data.length && shown < 20; i++) {
      var d = data[i];
      var hay = (d.name + " " + d.category + " " + d.region).toLowerCase();
      if (hay.indexOf(needle) === -1) continue;
      var a = document.createElement("a");
      a.href = d.page; a.className = "srow";
      var b = document.createElement("b"); b.textContent = d.name;
      var s = document.createElement("span");
      s.textContent = d.field + " · " + d.category + " · " + d.region;
      a.appendChild(b); a.appendChild(document.createTextNode(" "));
      a.appendChild(s); box.appendChild(a); shown++;
    }
    if (!shown) {
      var p = document.createElement("p"); p.className = "note";
      p.textContent = "没有匹配的结果，换个关键词试试。";
      box.appendChild(p);
    }
  }
  q.addEventListener("focus", function () { ensureIndex().catch(function () {}); });
  q.addEventListener("input", render);
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
      for (var c = 1; c < row.cells.length; c++) cells.push(cellText(row.cells[c]));
      cols.push(cells);
    }
    var html = "<p class='note'>Comparison uses free preview details only. No outcome is promised.</p><div class='tablewrap'><table><thead><tr><th></th>";
    for (var k2 = 0; k2 < cols.length; k2++) html += "<th>" + escHtml(cols[k2][0]) + "</th>";
    html += "</tr></thead><tbody>";
    for (var r = 1; r < headers.length; r++) {
      html += "<tr><th>" + escHtml(headers[r]) + "</th>";
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
