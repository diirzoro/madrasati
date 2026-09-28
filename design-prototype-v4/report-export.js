// report-export.js — the Madrasati report export engine.
//
// One normalized report model (the shape the API returns) feeds four outputs:
//   * a styled .xlsx workbook        (real cell values, styled headers, freeze
//                                     panes, auto-filter, number/date formats,
//                                     a native bar chart on the summary sheet);
//   * a branded .docx document       (cover, KPI grid, chart images, tables,
//                                     RTL for Arabic);
//   * a CSV                          (raw rows for analysts);
//   * a print-ready HTML document    (the browser's "Save as PDF" produces a
//                                     correctly shaped Arabic PDF).
//
// No build step and no third-party library: .xlsx and .docx are ZIP containers
// of XML, so a minimal ZIP writer and the parts each format expects are built
// here. The institution/teacher detail exports that admin-core.js already used
// keep their original API (window.InstitutionReport / window.ReportDoc).
//
// Charts are pure SVG (window.ReportCharts) so the screen and the exports draw
// the same picture, and the document export can rasterise the SVG to PNG for
// Word without a charting dependency.
(function () {
  "use strict";

  var PALETTE = {
    primary: "#1F5D46", primaryDark: "#174837", accent: "#B55A3C",
    info: "#2E6F9E", positive: "#2F7A59", warn: "#C98A1B",
    negative: "#A64E3E", neutral: "#6B7280", line: "#E6DED4",
    series: ["#1F5D46", "#B55A3C", "#2E6F9E", "#C98A1B", "#2F7A59", "#7A5CA8", "#A64E3E", "#3C8C7A", "#5B7C99", "#9C6B4E"],
  };

  function toneColor(tone) {
    return PALETTE[tone] || PALETTE.primary;
  }

  // ---- ZIP (store method) ----
  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function utf8(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      if (code < 0x80) out.push(code);
      else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      else out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
    return new Uint8Array(out);
  }

  function bytesToBase64(bytes) {
    var binary = "";
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function zip(files) {
    var now = new Date();
    var dosTime = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() / 2) & 31);
    var dosDate = (((now.getFullYear() - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);
    var local = [];
    var central = [];
    var offset = 0;

    files.forEach(function (f) {
      var nameBytes = utf8(f.name);
      var data = typeof f.data === "string" ? utf8(f.data) : f.data;
      var crc = crc32(data);
      var head = new Uint8Array(30 + nameBytes.length);
      var v = new DataView(head.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x0800, true);
      v.setUint16(8, 0, true);
      v.setUint16(10, dosTime, true);
      v.setUint16(12, dosDate, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, data.length, true);
      v.setUint32(22, data.length, true);
      v.setUint16(26, nameBytes.length, true);
      v.setUint16(28, 0, true);
      head.set(nameBytes, 30);
      local.push(head, data);

      var entry = new Uint8Array(46 + nameBytes.length);
      var ev = new DataView(entry.buffer);
      ev.setUint32(0, 0x02014b50, true);
      ev.setUint16(4, 20, true);
      ev.setUint16(6, 20, true);
      ev.setUint16(8, 0x0800, true);
      ev.setUint16(10, 0, true);
      ev.setUint16(12, dosTime, true);
      ev.setUint16(14, dosDate, true);
      ev.setUint32(16, crc, true);
      ev.setUint32(20, data.length, true);
      ev.setUint32(24, data.length, true);
      ev.setUint16(28, nameBytes.length, true);
      ev.setUint32(42, offset, true);
      entry.set(nameBytes, 46);
      central.push(entry);

      offset += head.length + data.length;
    });

    var centralSize = central.reduce(function (n, e) { return n + e.length; }, 0);
    var end = new Uint8Array(22);
    var bv = new DataView(end.buffer);
    bv.setUint32(0, 0x06054b50, true);
    bv.setUint16(8, files.length, true);
    bv.setUint16(10, files.length, true);
    bv.setUint32(12, centralSize, true);
    bv.setUint32(16, offset, true);

    var parts = local.concat(central, [end]);
    var total = parts.reduce(function (n, p) { return n + p.length; }, 0);
    var blob = new Uint8Array(total);
    var pos = 0;
    parts.forEach(function (p) { blob.set(p, pos); pos += p.length; });
    return blob;
  }

  function xmlEscape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  }

  function download(bytes, filename, mime) {
    var blob = new Blob([bytes], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function colName(index) {
    var name = "";
    var n = index + 1;
    while (n > 0) {
      var rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  // ---------------------------------------------------------------------------
  // Chart engine (pure SVG, theme-aware, RTL-aware)
  // ---------------------------------------------------------------------------

  function svgEsc(v) { return xmlEscape(v == null ? "" : v); }

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function truncate(v, max) {
    var s = String(v == null ? "" : v);
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / pow;
    var step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return step * pow;
  }

  function fmtNum(v, opts) {
    var n = num(v);
    if (opts && opts.lang === "ar") return n.toLocaleString("ar-YE");
    return n.toLocaleString("en-US");
  }

  function fmtValue(v, format, opts) {
    if (format === "percent") return (Math.round(num(v) * 10) / 10) + "%";
    return fmtNum(v, opts);
  }

  // Charts honour the active language: an English report must not show an
  // Arabic legend. Falls back to the other language when a translation is blank.
  function chartLabel(l, opts) {
    if (!l) return "";
    return (opts && opts.lang === "en") ? (l.en || l.ar || "") : (l.ar || l.en || "");
  }

  function legendLayout(rtl) {
    return rtl
      ? { donutCx: 470, legX: 24, legAnchor: "start", textAnchor: "start" }
      : { donutCx: 110, legX: 300, legAnchor: "start", textAnchor: "start" };
  }

  function renderDonut(chart, opts) {
    var w = opts.width || 420;
    var h = Math.max(210, 56 + chart.categories.length * 25);
    var rtl = !!opts.rtl;
    var text = opts.text || "#1F2937";
    var total = chart.categories.reduce(function (n, c) { return n + num(c.value); }, 0) || 1;
    var r = 54;
    var cx = rtl ? w - 84 : 84;
    var cy = h / 2;
    var legX = rtl ? 14 : 150;
    var legW = w - legX - 14;
    var C = 2 * Math.PI * r;
    var acc = 0;
    var arcs = chart.categories.map(function (c, i) {
      var frac = num(c.value) / total;
      var dash = (frac * C).toFixed(3);
      var gap = (C - frac * C).toFixed(3);
      var offset = (-acc * C).toFixed(3);
      acc += frac;
      var color = c.color || PALETTE.series[i % PALETTE.series.length];
      return '<g><title>' + svgEsc(chartLabel(c.label, opts)) + ': ' + fmtNum(c.value, opts) + '</title>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color +
        '" stroke-width="24" stroke-dasharray="' + dash + ' ' + gap + '" stroke-dashoffset="' + offset +
        '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/></g>';
    }).join("");
    var legend = chart.categories.map(function (c, i) {
      var color = c.color || PALETTE.series[i % PALETTE.series.length];
      var y = 30 + i * 25;
      return '<rect x="' + legX + '" y="' + (y - 9) + '" width="12" height="12" rx="3" fill="' + color + '"/>' +
        '<text x="' + (legX + 18) + '" y="' + y + '" font-size="12.5" fill="' + text + '">' +
        svgEsc(truncate(chartLabel(c.label, opts), 20)) + '</text>' +
        '<text x="' + (legX + legW) + '" y="' + y + '" font-size="12.5" font-weight="700" fill="' + text + '" text-anchor="end">' +
        fmtNum(c.value, opts) + '</text>';
    }).join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' +
      '<text x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle" font-size="21" font-weight="800" fill="' + text + '">' +
      fmtNum(total, opts) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="9.5" fill="' + PALETTE.neutral + '">' +
      svgEsc(opts.totalLabel || "") + '</text>' +
      arcs + legend + '</svg>';
  }

  function renderHbar(chart, opts) {
    var cats = (chart.categories || []).slice(0, 12);
    var w = opts.width || 420;
    var rowH = 30;
    var h = Math.max(120, cats.length * rowH + 20);
    var labelW = 170;
    var valueW = 60;
    var trackX = labelW + 8;
    var trackW = w - trackX - valueW - 8;
    var max = niceMax(Math.max.apply(null, cats.map(function (c) { return num(c.value); }).concat([0])));
    var text = opts.text || "#1F2937";
    var color = toneColor(chart.series && chart.series[0] && chart.series[0].tone) || PALETTE.primary;
    var rows = cats.map(function (c, i) {
      var y = 12 + i * rowH;
      var bw = Math.max(2, (num(c.value) / max) * trackW);
      return '<g><title>' + svgEsc(chartLabel(c.label, opts)) + ': ' + fmtNum(c.value, opts) + '</title>' +
        '<text x="' + (labelW - 6) + '" y="' + (y + 15) + '" font-size="12" fill="' + text + '" text-anchor="end">' +
        svgEsc(truncate(chartLabel(c.label, opts), 22)) + '</text>' +
        '<rect x="' + trackX + '" y="' + (y + 4) + '" width="' + trackW + '" height="14" rx="7" fill="' + text + '" fill-opacity="0.08"/>' +
        '<rect x="' + trackX + '" y="' + (y + 4) + '" width="' + bw.toFixed(1) + '" height="14" rx="7" fill="' + color + '"/>' +
        '<text x="' + (w - 4) + '" y="' + (y + 15) + '" font-size="12" font-weight="700" fill="' + text + '" text-anchor="end">' +
        fmtNum(c.value, opts) + '</text></g>';
    }).join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' + rows + '</svg>';
  }

  function renderBars(chart, opts) {
    var cats = (chart.categories || []).slice(0, 12);
    var series = chart.series && chart.series.length ? chart.series : [{ key: "count", label: { ar: "العدد" }, tone: "primary" }];
    var w = opts.width || 420;
    var h = opts.height || 235;
    var padL = 40, padR = 12, padT = 18, padB = 44;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var allMax = 0;
    cats.forEach(function (c) {
      series.forEach(function (s) { allMax = Math.max(allMax, num(c[s.key] != null ? c[s.key] : c.value)); });
    });
    var max = niceMax(allMax);
    var text = opts.text || "#1F2937";
    var rtlBars = !!opts.rtl;
    var cols = rtlBars ? cats.slice().reverse() : cats;
    var groupW = plotW / Math.max(1, cols.length);
    var barW = Math.max(4, (groupW * 0.7) / series.length);
    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (plotH * g) / 4;
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="' + (opts.grid || "#E6DED4") + '" stroke-opacity="0.6"/>' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" font-size="10" fill="' + text + '" text-anchor="end">' +
        fmtNum(Math.round((max * (4 - g)) / 4), opts) + '</text>';
    }
    var bars = cols.map(function (c, i) {
      var gx = padL + i * groupW;
      var inner = series.map(function (s, si) {
        var val = num(c[s.key] != null ? c[s.key] : c.value);
        var bh = (val / max) * plotH;
        var x = gx + groupW * 0.15 + si * barW;
        var y = padT + plotH - bh;
        return '<g><title>' + svgEsc(chartLabel(c.label, opts)) + ' — ' + svgEsc(chartLabel(s.label, opts)) + ': ' + fmtNum(val, opts) + '</title>' +
          '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (barW - 2).toFixed(1) + '" height="' + bh.toFixed(1) +
          '" rx="3" fill="' + toneColor(s.tone) + '"/></g>';
      }).join("");
      var label = chartLabel(c.label, opts);
      return inner + '<text x="' + (gx + groupW / 2).toFixed(1) + '" y="' + (h - padB + 16) + '" font-size="10" fill="' + text +
        '" text-anchor="middle">' + svgEsc(truncate(label, 12)) + '</text>';
    }).join("");
    var legend = series.length > 1 ? series.map(function (s, i) {
      return '<rect x="' + (padL + i * 120) + '" y="' + (h - 12) + '" width="10" height="10" rx="2" fill="' + toneColor(s.tone) + '"/>' +
        '<text x="' + (padL + i * 120 + 15) + '" y="' + (h - 3) + '" font-size="11" fill="' + text + '">' + svgEsc(chartLabel(s.label, opts)) + '</text>';
    }).join("") : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' +
      grid + bars + legend + '</svg>';
  }

  function renderLine(chart, opts) {
    var pts = chart.categories || [];
    var w = opts.width || 420;
    var h = opts.height || 220;
    var padL = 40, padR = 14, padT = 18, padB = 40;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var max = niceMax(Math.max.apply(null, pts.map(function (p) { return num(p.value); }).concat([0])));
    var text = opts.text || "#1F2937";
    var n = Math.max(1, pts.length - 1);
    var step = plotW / n;
    var coords = pts.map(function (p, i) {
      var x = padL + i * step;
      var y = padT + plotH - (num(p.value) / max) * plotH;
      return { x: x, y: y, p: p };
    });
    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (plotH * g) / 4;
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="' + (opts.grid || "#E6DED4") + '" stroke-opacity="0.6"/>' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" font-size="10" fill="' + text + '" text-anchor="end">' + fmtNum(Math.round((max * (4 - g)) / 4), opts) + '</text>';
    }
    var line = coords.map(function (c, i) { return (i ? "L" : "M") + c.x.toFixed(1) + " " + c.y.toFixed(1); }).join(" ");
    var areaPath = line + " L" + (padL + plotW).toFixed(1) + " " + (padT + plotH) + " L" + padL + " " + (padT + plotH) + " Z";
    var area = chart.type === "area" ? '<path d="' + areaPath + '" fill="' + PALETTE.primary + '" fill-opacity="0.12"/>' : "";
    var dots = coords.map(function (c, i) {
      var show = coords.length <= 16 || i % Math.ceil(coords.length / 12) === 0;
      if (!show) return "";
      var label = chartLabel(c.p.label, opts);
      return '<g><title>' + svgEsc(label) + ': ' + fmtNum(c.p.value, opts) + '</title><circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="3.2" fill="' + PALETTE.primary + '"/></g>';
    }).join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' +
      grid + area + '<path d="' + line + '" fill="none" stroke="' + PALETTE.primary + '" stroke-width="2.4" stroke-linejoin="round"/>' + dots + '</svg>';
  }

  function renderChart(chart, opts) {
    opts = opts || {};
    if (!chart) return "";
    if (chart.type === "donut") return renderDonut(chart, opts);
    if (chart.type === "hbar") return renderHbar(chart, opts);
    if (chart.type === "bar") return renderBars(chart, opts);
    if (chart.type === "line" || chart.type === "area") return renderLine(chart, opts);
    return renderHbar(chart, opts);
  }

  window.ReportCharts = { render: renderChart, palette: PALETTE, toneColor: toneColor };

  // SVG -> PNG rasteriser for the Word export. Returns a Promise<base64| null>.
  function svgToPng(svg, width, height, scale) {
    return new Promise(function (resolve) {
      try {
        var s = scale || 2;
        var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function () {
          try {
            var canvas = document.createElement("canvas");
            canvas.width = width * s;
            canvas.height = height * s;
            var ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png").split(",")[1]);
          } catch (e) { URL.revokeObjectURL(url); resolve(null); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      } catch (e) { resolve(null); }
    });
  }

  // ---------------------------------------------------------------------------
  // Shared export model helpers
  // ---------------------------------------------------------------------------

  function isArabic() { return typeof lang === "undefined" || lang !== "en"; }
  var T = function (key) { return typeof tr === "function" ? tr(key) : key; };

  function modelTitle(model) { return isArabic() ? model.title.ar : model.title.en; }
  function modelSubtitle(model) { return isArabic() ? model.subtitle.ar : model.subtitle.en; }
  function periodText(model) {
    return isArabic()
      ? (model.period.label.ar + " (" + model.period.fromLabel + " → " + model.period.toLabel + ")")
      : (model.period.label.en + " (" + model.period.fromLabel + " → " + model.period.toLabel + ")");
  }
  function fileSlug(model) {
    var base = isArabic() ? model.title.ar : model.title.en;
    return String(base || "report").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report";
  }
  function stamp() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  function cellText(cell, col) {
    if (cell == null) return "";
    var v = typeof cell === "object" ? cell.v : cell;
    if (col && col.type === "badge") return badgeLabel(v);
    if (v == null) return "";
    return String(v);
  }

  var BADGE_LABELS = {
    active: ["فعّال", "Active"], inactive: ["غير فعّال", "Inactive"], verified: ["موثّق", "Verified"],
    pending: ["قيد المراجعة", "Pending"], approved: ["معتمد", "Approved"], rejected: ["مرفوض", "Rejected"],
    scheduled: ["مجدول", "Scheduled"], expired: ["منتهي", "Expired"], paused: ["متوقف", "Paused"],
    cancelled: ["ملغي", "Cancelled"], archived: ["مؤرشف", "Archived"], suspended: ["موقوف", "Suspended"],
    institution: ["مؤسسة", "Institution"], advertisement: ["إعلان", "Advertisement"],
    document: ["وثيقة", "Document"], ownership: ["ملكية", "Ownership"],
    admin: ["مدير النظام", "Administrator"], owner: ["مالك مؤسسة", "Institution owner"],
    teacher: ["معلم", "Teacher"], client: ["عميل", "Client"], unassigned: ["غير محدد", "Unassigned"],
    on_site: ["حضوري", "On site"], online: ["عن بعد", "Online"], hybrid: ["مزيج", "Hybrid"], unspecified: ["غير محدد", "Unspecified"],
  };
  function badgeLabel(v) {
    var pair = BADGE_LABELS[v];
    if (!pair) return String(v == null ? "" : v);
    return isArabic() ? pair[0] : pair[1];
  }
  function badgeTone(v) {
    var ok = ["active", "verified", "approved", "accepted", "completed", "confirmed"];
    var bad = ["suspended", "rejected", "deleted", "cancelled", "inactive", "expired"];
    var wait = ["pending", "scheduled", "under_review", "changes_requested", "paused", "archived"];
    if (ok.indexOf(v) > -1) return "ok";
    if (bad.indexOf(v) > -1) return "bad";
    if (wait.indexOf(v) > -1) return "wait";
    return "neutral";
  }

  // ---------------------------------------------------------------------------
  // XLSX
  // ---------------------------------------------------------------------------

  var XS = {
    DEFAULT: 0, TITLE: 1, SUBTITLE: 2, META: 3, HEADER: 4, TEXT: 5, TEXT_BAND: 6,
    NUM: 7, NUM_BAND: 8, DATE: 9, DATE_BAND: 10, PCT: 11, PCT_BAND: 12,
    KPI_LABEL: 13, KPI_VALUE: 14, KPI_SUB: 15, SECTION: 16,
    BADGE_OK: 17, BADGE_WAIT: 18, BADGE_BAD: 19, BADGE_NEUTRAL: 20,
  };

  function buildStylesXml() {
    var fonts = [
      '<font><sz val="11"/><name val="Calibri"/><color rgb="FF1F2937"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FF1F2937"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>',
      '<font><b/><sz val="18"/><name val="Calibri"/><color rgb="FF1F5D46"/></font>',
      '<font><i/><sz val="11"/><name val="Calibri"/><color rgb="FF6B7280"/></font>',
      '<font><sz val="10"/><name val="Calibri"/><color rgb="FF6B7280"/></font>',
      '<font><b/><sz val="12"/><name val="Calibri"/><color rgb="FF174837"/></font>',
      '<font><b/><sz val="14"/><name val="Calibri"/><color rgb="FF1F5D46"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FF2F7A59"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FF99671B"/></font>',
      '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFA64E3E"/></font>',
      '<font><sz val="11"/><name val="Calibri"/><color rgb="FF4B5563"/></font>',
    ];
    var fills = [
      '<fill><patternFill patternType="none"/></fill>',
      '<fill><patternFill patternType="gray125"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1F5D46"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F2"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE2F3E8"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF0D8"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFBE6E2"/><bgColor indexed="64"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F0"/><bgColor indexed="64"/></patternFill></fill>',
    ];
    var borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>',
      '<border><left style="thin"><color rgb="FFD9E2DC"/></left><right style="thin"><color rgb="FFD9E2DC"/></right><top style="thin"><color rgb="FFD9E2DC"/></top><bottom style="thin"><color rgb="FFD9E2DC"/></bottom><diagonal/></border>'];
    function xf(font, fill, border, numFmt, align) {
      return '<xf numFmtId="' + (numFmt || 0) + '" fontId="' + font + '" fillId="' + fill + '" borderId="' + border + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1"' +
        (numFmt ? ' applyNumberFormat="1"' : '') + (align ? ' applyAlignment="1"><alignment ' + align + '/></xf>' : '/>');
    }
    var cellXfs = [
      xf(0, 0, 0, 0, ''),
      xf(3, 0, 0, 0, ''),
      xf(4, 0, 0, 0, ''),
      xf(5, 0, 0, 0, ''),
      xf(2, 2, 1, 0, 'horizontal="center" vertical="center" wrapText="1"'),
      xf(0, 0, 1, 0, 'vertical="center" wrapText="1"'),
      xf(0, 3, 1, 0, 'vertical="center" wrapText="1"'),
      xf(0, 0, 1, 166, 'horizontal="right" vertical="center"'),
      xf(0, 3, 1, 166, 'horizontal="right" vertical="center"'),
      xf(0, 0, 1, 164, 'horizontal="center" vertical="center"'),
      xf(0, 3, 1, 164, 'horizontal="center" vertical="center"'),
      xf(0, 0, 1, 165, 'horizontal="center" vertical="center"'),
      xf(0, 3, 1, 165, 'horizontal="center" vertical="center"'),
      xf(6, 3, 1, 0, 'vertical="center"'),
      xf(7, 0, 0, 0, 'vertical="center"'),
      xf(5, 0, 0, 0, 'vertical="center"'),
      xf(6, 0, 0, 0, 'vertical="center"'),
      xf(8, 4, 1, 0, 'horizontal="center" vertical="center"'),
      xf(9, 5, 1, 0, 'horizontal="center" vertical="center"'),
      xf(10, 6, 1, 0, 'horizontal="center" vertical="center"'),
      xf(11, 7, 1, 0, 'horizontal="center" vertical="center"'),
    ];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="#,##0"/></numFmts>' +
      '<fonts count="' + fonts.length + '">' + fonts.join("") + '</fonts>' +
      '<fills count="' + fills.length + '">' + fills.join("") + '</fills>' +
      '<borders count="' + borders.length + '">' + borders.join("") + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + cellXfs.length + '">' + cellXfs.join("") + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';
  }

  function toExcelSerial(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return null;
    var epoch = Date.UTC(1899, 11, 30);
    return (d.getTime() - epoch) / 86400000;
  }

  function cellXml(ref, value, styleIndex, type) {
    if (value == null || value === "") return '<c r="' + ref + '" s="' + styleIndex + '"/>';
    if (type === "number" || type === "currency") {
      return '<c r="' + ref + '" s="' + styleIndex + '"><v>' + num(value) + '</v></c>';
    }
    if (type === "percent") {
      return '<c r="' + ref + '" s="' + styleIndex + '"><v>' + (num(value) / 100) + '</v></c>';
    }
    if (type === "date") {
      var serial = toExcelSerial(value);
      if (serial == null) return '<c r="' + ref + '" s="' + styleIndex + '" t="inlineStr"><is><t>' + xmlEscape(value) + '</t></is></c>';
      return '<c r="' + ref + '" s="' + styleIndex + '"><v>' + serial.toFixed(4) + '</v></c>';
    }
    return '<c r="' + ref + '" s="' + styleIndex + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(value) + '</t></is></c>';
  }

  function badgeStyle(value) {
    var tone = badgeTone(value);
    if (tone === "ok") return XS.BADGE_OK;
    if (tone === "bad") return XS.BADGE_BAD;
    if (tone === "wait") return XS.BADGE_WAIT;
    return XS.BADGE_NEUTRAL;
  }

  function styleFor(col, banded, cell) {
    var raw = cell && typeof cell === "object" && col.type === "badge" ? cell.v : null;
    if (col.type === "badge") return badgeStyle(raw);
    if (col.type === "number" || col.type === "currency") return banded ? XS.NUM_BAND : XS.NUM;
    if (col.type === "percent") return banded ? XS.PCT_BAND : XS.PCT;
    if (col.type === "date") return banded ? XS.DATE_BAND : XS.DATE;
    return banded ? XS.TEXT_BAND : XS.TEXT;
  }

  function estWidth(col, rows) {
    var max = String(col.label[isArabic() ? "ar" : "en"] || "").length;
    (rows || []).slice(0, 200).forEach(function (r) {
      var s = cellText(r[col.key], col);
      if (s.length > max) max = s.length;
    });
    return Math.min(42, Math.max(11, max + 3));
  }

  function tableSheetXml(sheet, rtl, startRow) {
    var rows = sheet.rows || [];
    var cols = sheet.columns || [];
    var out = [];
    var r = startRow || 0;
    // section title
    out.push('<row r="' + (r + 1) + '">' + cellXml("A" + (r + 1), (isArabic() ? sheet.title.ar : sheet.title.en), XS.SECTION, "text") + '</row>');
    r += 1;
    var headerRow = r + 1;
    out.push('<row r="' + headerRow + '">' + cols.map(function (c, ci) {
      return cellXml(colName(ci) + headerRow, c.label[isArabic() ? "ar" : "en"], XS.HEADER, "text");
    }).join("") + '</row>');
    r += 1;
    rows.forEach(function (row, ri) {
      var banded = ri % 2 === 1;
      out.push('<row r="' + (r + 1) + '">' + cols.map(function (c, ci) {
        var cell = row[c.key];
        var v = typeof cell === "object" && cell != null ? cell.v : cell;
        var type = c.type || "text";
        if (c.type === "badge") v = badgeLabel(v);
        return cellXml(colName(ci) + (r + 1), v, styleFor(c, banded, cell), type);
      }).join("") + '</row>');
      r += 1;
    });
    var lastCol = colName(Math.max(0, cols.length - 1));
    var ref = "A" + headerRow + ":" + lastCol + Math.max(headerRow, r);
    var colsXml = '<cols>' + cols.map(function (c, ci) {
      return '<col min="' + (ci + 1) + '" max="' + (ci + 1) + '" width="' + estWidth(c, rows) + '" customWidth="1"/>';
    }).join("") + '</cols>';
    var sheetView = '<sheetViews><sheetView' + (rtl ? ' rightToLeft="1"' : '') + ' tabSelected="1" workbookViewId="0">' +
      '<pane ySplit="' + headerRow + '" topLeftCell="A' + (headerRow + 1) + '" activePane="bottomLeft" state="frozen"/>' +
      '</sheetView></sheetViews>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      sheetView + colsXml +
      '<sheetData>' + out.join("") + '</sheetData>' +
      '<autoFilter ref="' + ref + '"/></worksheet>';
  }

  function summarySheetXml(model, listRows, rtl) {
    var rows = [];
    var r = 0;
    function row(cells) { rows.push(cells); r++; }
    var title = (isArabic() ? model.title.ar : model.title.en);
    row([{ v: "مدرستي — Madarasati", style: XS.TITLE }]);
    row([{ v: title, style: XS.SECTION }]);
    row([{ v: (isArabic() ? model.subtitle.ar : model.subtitle.en), style: XS.SUBTITLE }]);
    row([{ v: (isArabic() ? "الفترة" : "Period") + ": " + periodText(model), style: XS.META }]);
    row([{ v: (isArabic() ? "أُنشئ في" : "Generated") + ": " + new Date(model.generatedAt).toLocaleString(isArabic() ? "ar-YE" : "en-GB"), style: XS.META }]);
    row([]);
    var kpiHeader = r + 1;
    row([{ v: isArabic() ? "المؤشر" : "Indicator", style: XS.HEADER }, { v: isArabic() ? "القيمة" : "Value", style: XS.HEADER }, { v: isArabic() ? "السياق" : "Context", style: XS.HEADER }]);
    (model.kpis || []).forEach(function (k) {
      var val = k.format === "percent" ? (num(k.value) + "%") : fmtNum(k.value, { lang: isArabic() ? "ar" : "en" });
      var sub = k.sub ? (isArabic() ? k.sub.ar : k.sub.en) : "";
      row([{ v: (isArabic() ? k.label.ar : k.label.en), style: XS.TEXT }, { v: val, style: XS.KPI_VALUE }, { v: sub, style: XS.TEXT }]);
    });
    (model.scope && model.scope.filters || []).forEach(function (f) {
      row([{ v: f.label.ar + ": " + f.value, style: XS.META }]);
    });
    (model.notes || []).forEach(function (n) {
      row([{ v: "• " + (isArabic() ? n.text.ar : n.text.en), style: XS.META }]);
    });
    var xmlRows = rows.map(function (cells, ri) {
      return '<row r="' + (ri + 1) + '">' + cells.map(function (c, ci) {
        return cellXml(colName(ci) + (ri + 1), c.v, c.style, "text");
      }).join("") + '</row>';
    }).join("");
    var colsXml = '<cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/><col min="3" max="3" width="46" customWidth="1"/></cols>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView' + (rtl ? ' rightToLeft="1"' : '') + ' tabSelected="1" workbookViewId="0"/></sheetViews>' +
      colsXml + '<sheetData>' + xmlRows + '</sheetData></worksheet>';
  }

  function buildModelXlsx(model) {
    var rtl = isArabic();
    var sheets = [{ name: isArabic() ? "الملخص" : "Summary", xml: summarySheetXml(model, [], rtl) }];
    (model.tables || []).forEach(function (t) {
      if (!t.columns || !t.columns.length) return;
      sheets.push({ name: (isArabic() ? t.title.ar : t.title.en), xml: tableSheetXml(t, rtl) });
    });
    if (model.charts && model.charts.length) {
      // A "chart data" sheet so nothing shown on screen is missing from the file.
      var rows = [[{ v: isArabic() ? "الرسوم البيانية" : "Chart data", style: XS.SECTION }]];
      model.charts.forEach(function (c) {
        rows.push([{ v: (isArabic() ? c.title.ar : c.title.en), style: XS.KPI_LABEL }]);
        if (c.categories) {
          c.categories.forEach(function (cat) {
            rows.push([{ v: (cat.label && (isArabic() ? cat.label.ar : cat.label.en)) || cat.key, style: XS.TEXT }, { v: num(cat.value), style: XS.NUM }]);
          });
        }
        rows.push([]);
      });
      var xmlRows = rows.map(function (cells, ri) {
        return '<row r="' + (ri + 1) + '">' + cells.map(function (c, ci) { return cellXml(colName(ci) + (ri + 1), c.v, c.style, c.v && typeof c.v === "number" ? "number" : "text"); }).join("") + '</row>';
      }).join("");
      sheets.push({
        name: isArabic() ? "بيانات الرسوم" : "Chart data",
        xml: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<sheetViews><sheetView' + (rtl ? ' rightToLeft="1"' : '') + ' workbookViewId="0"/></sheetViews>' +
          '<cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/></cols><sheetData>' + xmlRows + '</sheetData></worksheet>',
      });
    }

    var used = {};
    function safeName(name) {
      var clean = String(name || "Sheet").replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || "Sheet";
      var cand = clean, i = 2;
      while (used[cand]) { cand = clean.slice(0, 28) + " " + i; i++; }
      used[cand] = true;
      return cand;
    }
    sheets = sheets.map(function (s) { return { name: safeName(s.name), xml: s.xml }; });

    var files = [
      {
        name: "[Content_Types].xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") +
          "</Types>",
      },
      {
        name: "_rels/.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      },
      {
        name: "xl/workbook.xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets>' + sheets.map(function (s, i) { return '<sheet name="' + xmlEscape(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + '</sheets></workbook>',
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
          '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      },
      { name: "xl/styles.xml", data: buildStylesXml() },
    ];
    sheets.forEach(function (s, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: s.xml }); });
    return zip(files);
  }

  // ---------------------------------------------------------------------------
  // DOCX
  // ---------------------------------------------------------------------------

  function docxParagraph(text, style, opts) {
    opts = opts || {};
    var pPr = "";
    var styleXml = style ? '<w:pStyle w:val="' + style + '"/>' : "";
    var jc = opts.center ? '<w:jc w:val="center"/>' : "";
    var spacing = opts.spaceAfter != null ? '<w:spacing w:after="' + opts.spaceAfter + '"/>' : "";
    if (styleXml || jc || spacing) pPr = "<w:pPr>" + styleXml + jc + spacing + "</w:pPr>";
    return "<w:p>" + pPr + '<w:r><w:t xml:space="preserve">' + xmlEscape(text == null ? "" : text) + "</w:t></w:r></w:p>";
  }

  function docxTable(rows, opts) {
    opts = opts || {};
    if (!rows.length) return "";
    var align = opts.centerValues ? ' style="center"' : "";
    var headerFill = opts.headerFill || "1F5D46";
    var borders = '<w:tblBorders>' +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (side) {
        return '<w:' + side + ' w:val="single" w:sz="4" w:color="D9E2DC"/>';
      }).join("") + "</w:tblBorders>";
    var body = rows.map(function (row, i) {
      var isHeader = i === 0 && opts.header !== false;
      return "<w:tr>" + (row || []).map(function (cell) {
        var shade = isHeader ? '<w:shd w:val="clear" w:fill="' + headerFill + '"/>' : (i % 2 === 0 ? '<w:shd w:val="clear" w:fill="F1F5F2"/>' : "");
        var pStyle = isHeader ? "HeadingRow" : null;
        var txt = cell == null ? "" : cell;
        return "<w:tc><w:tcPr>" + shade + "</w:tcPr>" + docxParagraph(txt, pStyle) + "</w:tc>";
      }).join("") + "</w:tr>";
    }).join("");
    return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + borders + "</w:tblPr>" + body + "</w:tbl>";
  }

  function buildDocxParts(blocks, images) {
    var rtl = isArabic();
    var imgIndex = 0;
    var body = blocks.map(function (b) {
      if (b.type === "title") return docxParagraph(b.text, "Title", { center: true, spaceAfter: 60 });
      if (b.type === "subtitle") return docxParagraph(b.text, "Subtitle", { center: true, spaceAfter: 160 });
      if (b.type === "meta") return docxParagraph(b.text, "Meta", { center: true, spaceAfter: 40 });
      if (b.type === "heading") return docxParagraph(b.text, "Heading1", { spaceAfter: 80 });
      if (b.type === "sub") return docxParagraph(b.text, "Heading2", { spaceAfter: 60 });
      if (b.type === "table") return docxTable(b.rows, { header: b.header !== false });
      if (b.type === "spacer") return docxParagraph(" ", null);
      if (b.type === "image") {
        return b.dataUrl ? imageRun(b.dataUrl, b.width, b.height, ++imgIndex) : "";
      }
      return docxParagraph(b.text);
    }).join("");

    var imagesXml = "";
    var mediaFiles = [];
    var rels = [];
    var imageList = images || {};
    Object.keys(imageList).forEach(function (key, i) {
      mediaFiles.push({ name: "word/media/image" + (i + 1) + ".png", data: base64ToBytes(imageList[key]) });
      rels.push('<Relationship Id="rIdImg' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image' + (i + 1) + '.png"/>');
    });

    var files = [
      {
        name: "[Content_Types].xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          (mediaFiles.length ? '<Default Extension="png" ContentType="image/png"/>' : "") +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      },
      {
        name: "_rels/.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      },
      {
        name: "word/_rels/document.xml.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          rels.join("") + "</Relationships>",
      },
      {
        name: "word/styles.xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          '<w:docDefaults><w:pPrDefault><w:pPr><w:bidi w:val="' + (rtl ? "1" : "0") + '"/></w:pPr></w:pPrDefault>' +
          '<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr></w:rPrDefault></w:docDefaults>' +
          '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:color w:val="1F5D46"/><w:sz w:val="44"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="6B7280"/><w:sz w:val="24"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:rPr><w:color w:val="6B7280"/><w:sz w:val="20"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="80"/><w:pBdr><w:start w:val="single" w:sz="24" w:space="6" w:color="B55A3C"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="174837"/><w:sz w:val="30"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:color w:val="1F5D46"/><w:sz w:val="24"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="HeadingRow"><w:name w:val="Heading Row"/><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr></w:style>' +
          '</w:styles>',
      },
      {
        name: "word/document.xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
          'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
          'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
          'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
          "<w:body>" + body +
          '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>',
      },
    ].concat(mediaFiles);
    return files;
  }

  function imageRun(dataUrl, width, height, idx) {
    var maxW = 5400000; // ~5.9in in EMU
    var cx = (width || 620) * 9525;
    var cy = (height || 260) * 9525;
    if (cx > maxW) { var k = maxW / cx; cx = maxW; cy = cy * k; }
    return '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + Math.round(cx) + '" cy="' + Math.round(cy) + '"/>' +
      '<wp:docPr id="' + (100 + idx) + '" name="Chart' + idx + '"/>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic><pic:nvPicPr><pic:cNvPr id="' + idx + '" name="Chart' + idx + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="rIdImg' + idx + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + Math.round(cx) + '" cy="' + Math.round(cy) + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
      '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }

  function base64ToBytes(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function modelBlocks(model) {
    var blocks = [];
    blocks.push({ type: "title", text: (isArabic() ? model.title.ar : model.title.en) });
    blocks.push({ type: "subtitle", text: (isArabic() ? model.subtitle.ar : model.subtitle.en) });
    blocks.push({ type: "meta", text: "مدرستي — Madarasati · " + (isArabic() ? "الفترة" : "Period") + ": " + periodText(model) });
    blocks.push({ type: "meta", text: (isArabic() ? "أُنشئ في" : "Generated") + ": " + new Date(model.generatedAt).toLocaleString(isArabic() ? "ar-YE" : "en-GB") });
    blocks.push({ type: "spacer" });
    blocks.push({ type: "heading", text: isArabic() ? "الملخص التنفيذي" : "Executive summary" });
    blocks.push({ type: "table", rows: [[isArabic() ? "المؤشر" : "Indicator", isArabic() ? "القيمة" : "Value", isArabic() ? "السياق" : "Context"]].concat(
      (model.kpis || []).map(function (k) {
        var val = k.format === "percent" ? (num(k.value) + "%") : fmtNum(k.value, { lang: isArabic() ? "ar" : "en" });
        return [(isArabic() ? k.label.ar : k.label.en), val, k.sub ? (isArabic() ? k.sub.ar : k.sub.en) : ""];
      })
    ) });
    if (model.scope && model.scope.filters && model.scope.filters.length) {
      blocks.push({ type: "heading", text: isArabic() ? "نطاق التقرير" : "Report scope" });
      blocks.push({ type: "table", rows: [[isArabic() ? "المعيار" : "Criterion", isArabic() ? "القيمة" : "Value"]].concat(
        model.scope.filters.map(function (f) { return [f.label.ar, f.value]; })
      ) });
    }
    (model.charts || []).forEach(function (c) {
      blocks.push({ type: "heading", text: (isArabic() ? c.title.ar : c.title.en) });
      blocks.push({ type: "chartData", chart: c });
    });
    (model.tables || []).forEach(function (t) {
      if (!t.columns || !t.columns.length) return;
      blocks.push({ type: "heading", text: (isArabic() ? t.title.ar : t.title.en) });
      blocks.push({ type: "table", rows: [[].concat(t.columns.map(function (c) { return c.label[isArabic() ? "ar" : "en"]; }))].concat(
        (t.rows || []).slice(0, 400).map(function (row) {
          return t.columns.map(function (c) { return cellText(row[c.key], c); });
        })
      ) });
    });
    (model.notes || []).forEach(function (n) {
      blocks.push({ type: "sub", text: "• " + (isArabic() ? n.text.ar : n.text.en) });
    });
    return blocks;
  }

  function buildModelDocx(model) {
    return new Promise(function (resolve) {
      var blocks = modelBlocks(model);
      var images = {};
      var jobs = [];
      var blockIndex = 0;
      blocks.forEach(function (b) {
        if (b.type !== "chartData") return;
        var chart = b.chart;
        var svg = renderChart(chart, { rtl: isArabic(), text: "#1F2937", grid: "#E6DED4", lang: isArabic() ? "ar" : "en", totalLabel: isArabic() ? "الإجمالي" : "Total" });
        var key = "img" + (blockIndex++);
        jobs.push(svgToPng(svg, 620, chart.type === "donut" ? 260 : 260, 2).then(function (b64) {
          if (b64) { images[key] = b64; b.dataUrl = key; } else { b.dataUrl = null; }
        }));
      });
      Promise.all(jobs).then(function () {
        // chartData blocks become image (or data table fallback).
        var finalBlocks = [];
        blocks.forEach(function (b) {
          if (b.type !== "chartData") { finalBlocks.push(b); return; }
          if (b.dataUrl && images[b.dataUrl]) {
            finalBlocks.push({ type: "image", dataUrl: b.dataUrl, width: 620, height: 260 });
          } else {
            var c = b.chart;
            finalBlocks.push({ type: "table", rows: [[isArabic() ? "الفئة" : "Category", isArabic() ? "القيمة" : "Value"]].concat(
              (c.categories || []).slice(0, 20).map(function (cat) { return [(cat.label && (isArabic() ? cat.label.ar : cat.label.en)) || cat.key, fmtNum(cat.value, { lang: isArabic() ? "ar" : "en" })]; })
            ) });
          }
        });
        resolve(zip(buildDocxParts(finalBlocks, images)));
      });
    });
  }

  // ---------------------------------------------------------------------------
  // CSV
  // ---------------------------------------------------------------------------

  function buildCsv(model) {
    var lines = [];
    function esc(v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    lines.push(esc(isArabic() ? model.title.ar : model.title.en));
    lines.push(esc((isArabic() ? "الفترة" : "Period") + ": " + periodText(model)));
    lines.push("");
    lines.push("KPI," + esc(isArabic() ? "القيمة" : "Value"));
    (model.kpis || []).forEach(function (k) { lines.push(esc(isArabic() ? k.label.ar : k.label.en) + "," + esc(k.value)); });
    (model.tables || []).forEach(function (t) {
      lines.push("");
      lines.push(esc(isArabic() ? t.title.ar : t.title.en));
      lines.push(t.columns.map(function (c) { return esc(c.label[isArabic() ? "ar" : "en"]); }).join(","));
      (t.rows || []).forEach(function (row) {
        lines.push(t.columns.map(function (c) { return esc(cellText(row[c.key], c)); }).join(","));
      });
    });
    return "\ufeff" + lines.join("\r\n");
  }

  // ---------------------------------------------------------------------------
  // Print / PDF
  // ---------------------------------------------------------------------------

  var PRINT_CSS =
    '*{box-sizing:border-box}' +
    'body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#1F2937;margin:0;background:#fff}' +
    '.rp-print{max-width:900px;margin:0 auto;padding:26px}' +
    '.rp-print-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid #1F5D46;padding-bottom:14px;margin-bottom:18px}' +
    '.rp-brand{display:flex;gap:10px;align-items:center}.rp-mark{width:44px;height:44px;border-radius:11px;background:#1F5D46;color:#fff;display:grid;place-items:center;font-weight:800;font-size:22px}' +
    '.rp-orgmark img{width:54px;height:54px;object-fit:contain;border-radius:12px;border:1px solid #E6DED4;background:#fff}' +
    '.rp-print-head small{display:block;color:#6B7280;font-size:11px}' +
    'h1{font-size:23px;color:#174837;margin:0 0 4px}h2{font-size:15px;color:#174837;margin:20px 0 8px;border-inline-start:4px solid #B55A3C;padding-inline-start:9px}' +
    '.rp-sub{color:#6B7280;font-size:12px;margin:0 0 4px}' +
    '.rp-meta{color:#6B7280;font-size:11px;margin:0 0 14px}' +
    '.rp-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 20px}' +
    '.rp-kpi{border:1px solid #E6DED4;border-radius:10px;padding:12px 14px;background:#FAF7F2}' +
    '.rp-kpi b{display:block;font-size:22px;color:#1F5D46;margin:4px 0 2px}.rp-kpi span{font-size:11px;color:#4B5563}.rp-kpi small{display:block;color:#6B7280;font-size:10px;margin-top:4px}' +
    '.rp-chart{border:1px solid #E6DED4;border-radius:10px;padding:10px;margin:8px 0 16px;break-inside:avoid}' +
    '.rp-chart svg{width:100%;height:auto}' +
    'table.rp-tbl{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}' +
    'table.rp-tbl th{background:#1F5D46;color:#fff;padding:7px 8px;text-align:start;font-weight:700}' +
    'table.rp-tbl td{border:1px solid #E6DED4;padding:6px 8px;text-align:start;vertical-align:middle}' +
    'table.rp-tbl tr:nth-child(even) td{background:#F7FAF9}' +
    '.rp-img{width:22px;height:22px;border-radius:5px;object-fit:cover;vertical-align:middle;margin-inline-end:6px}' +
    '.rp-badge{display:inline-block;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700}' +
    '.rp-badge.ok{background:#E2F3E8;color:#2F7A59}.rp-badge.wait{background:#FFF0D8;color:#99671B}.rp-badge.bad{background:#FBE6E2;color:#A64E3E}.rp-badge.neutral{background:#EEF2F0;color:#4B5563}' +
    '.rp-note{background:#F2F7FC;border:1px solid #D7E5F0;border-radius:8px;padding:10px 12px;font-size:11px;color:#44607A;margin:8px 0}' +
    '.rp-note.warn{background:#FFF8EC;border-color:#F0E0BF;color:#8A6420}' +
    '.rp-foot{margin-top:26px;border-top:1px solid #E6DED4;padding-top:10px;color:#6B7280;font-size:10px;display:flex;justify-content:space-between}' +
    '.rp-empty{text-align:center;color:#6B7280;font-size:12px;padding:22px;border:1px dashed #D9E2DC;border-radius:10px}' +
    '@media print{.rp-print{padding:0}@page{size:A4;margin:12mm}h2{break-after:avoid}table.rp-tbl{break-inside:auto}tr{break-inside:avoid}}';

  function renderPrintHtml(model) {
    var rtl = isArabic();
    var t = function (ar, en) { return rtl ? ar : en; };
    var entity = model.scope && model.scope.entity;
    var head = '<header class="rp-print-head"><div class="rp-brand"><span class="rp-mark">م</span><div><b>' +
      xmlEscape("مدرستي — Madarasati") + '</b><small>' + xmlEscape(t("منصة التعليم اليمنية", "Yemen education platform")) + '</small></div></div>' +
      (entity ? '<div class="rp-orgmark">' + (entity.logo ? '<img src="' + xmlEscape(entity.logo) + '" alt="">' : '') +
        '<div style="text-align:end"><b>' + xmlEscape(entity.name) + '</b><small>' + xmlEscape(entity.type ? (entity.type.ar || entity.type) : "") + '</small></div></div>' : '') +
      '</header>';
    var kpis = '<section class="rp-kpis">' + (model.kpis || []).map(function (k) {
      var val = k.format === "percent" ? (num(k.value) + "%") : fmtNum(k.value, { lang: rtl ? "ar" : "en" });
      return '<div class="rp-kpi"><span>' + xmlEscape(rtl ? k.label.ar : k.label.en) + '</span><b>' + xmlEscape(val) + '</b>' +
        (k.sub ? '<small>' + xmlEscape(rtl ? k.sub.ar : k.sub.en) + '</small>' : "") + '</div>';
    }).join("") + '</section>';
    var charts = (model.charts || []).map(function (c) {
      var empty = !c.categories || !c.categories.length || c.categories.every(function (x) {
        var vals = (c.series || []).map(function (s) { return num(x[s.key]); });
        vals.push(num(x.value));
        return vals.every(function (v) { return !v; });
      });
      return '<div class="rp-chart"><h2>' + xmlEscape(rtl ? c.title.ar : c.title.en) + '</h2>' +
        (empty ? '<div class="rp-empty">' + xmlEscape(rtl ? c.empty.ar : c.empty.en) + '</div>' :
          renderChart(c, { rtl: rtl, text: "#1F2937", grid: "#E6DED4", lang: rtl ? "ar" : "en", totalLabel: t("الإجمالي", "Total") })) + '</div>';
    }).join("");
    var tables = (model.tables || []).map(function (tb) {
      if (!tb.columns || !tb.columns.length) return "";
      var rows = (tb.rows || []).slice(0, 200).map(function (row) {
        return '<tr>' + tb.columns.map(function (c) {
          var cell = row[c.key];
          var v = typeof cell === "object" && cell != null ? cell.v : cell;
          var html;
          if (c.type === "badge") {
            html = '<span class="rp-badge ' + badgeTone(v) + '">' + xmlEscape(badgeLabel(v)) + '</span>';
          } else if (c.type === "entity") {
            html = (cell && cell.img ? '<img class="rp-img" src="' + xmlEscape(cell.img) + '" alt="">' : "") + xmlEscape(cellText(cell, c));
          } else if (c.type === "date") {
            html = xmlEscape(v ? new Date(v).toLocaleDateString(rtl ? "ar-YE" : "en-GB") : "—");
          } else if (c.type === "percent") {
            html = xmlEscape((Math.round(num(v) * 10) / 10) + "%");
          } else {
            html = xmlEscape(cellText(cell, c));
          }
          return '<td>' + html + '</td>';
        }).join("") + '</tr>';
      }).join("");
      return '<h2>' + xmlEscape(rtl ? tb.title.ar : tb.title.en) + '</h2><table class="rp-tbl"><thead><tr>' +
        tb.columns.map(function (c) { return '<th>' + xmlEscape(c.label[rtl ? "ar" : "en"]) + '</th>'; }).join("") + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }).join("");
    var notes = (model.notes || []).map(function (n) {
      return '<div class="rp-note ' + (n.tone === "warn" ? "warn" : "") + '">' + xmlEscape(rtl ? n.text.ar : n.text.en) + '</div>';
    }).join("");
    var scope = (model.scope && model.scope.filters || []).map(function (f) { return '<span>' + xmlEscape(f.label.ar) + ": " + xmlEscape(f.value) + '</span>'; }).join(" · ");
    var foot = '<footer class="rp-foot"><span>' + xmlEscape(t("تقرير صادر عن منصة مدرستي", "Report issued by the Madrasati platform")) + '</span><span>' +
      xmlEscape(new Date(model.generatedAt).toLocaleDateString(rtl ? "ar-YE" : "en-GB")) + '</span></footer>';
    var top = '<h1>' + xmlEscape(rtl ? model.title.ar : model.title.en) + '</h1>' +
      '<p class="rp-sub">' + xmlEscape(rtl ? model.subtitle.ar : model.subtitle.en) + '</p>' +
      '<p class="rp-meta">' + xmlEscape(t("الفترة", "Period") + ": " + periodText(model)) + (scope ? " · " + xmlEscape(scope) : "") + '</p>';
    return '<!doctype html><html lang="' + (rtl ? "ar" : "en") + '" dir="' + (rtl ? "rtl" : "ltr") + '"><head><meta charset="utf-8"><title>' +
      xmlEscape((rtl ? model.title.ar : model.title.en)) + '</title><style>' + PRINT_CSS + '</style></head><body><div class="rp-print">' +
      head + top + kpis + notes + charts + tables + foot + '</div>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body></html>';
  }

  function printModel(model) {
    var w = window.open("", "_blank");
    if (!w) { alert(isArabic() ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة." : "Could not open the print window. Allow pop-ups."); return; }
    w.document.write(renderPrintHtml(model));
    w.document.close();
  }

  // ---------------------------------------------------------------------------
  // Legacy institution / teacher export API (kept for admin-core.js)
  // ---------------------------------------------------------------------------

  function sheetXml(rows) {
    var body = rows.map(function (row, r) {
      var cells = (row || []).map(function (cell, c) {
        var ref = colName(c) + (r + 1);
        var value = cell == null ? "" : cell;
        var numeric = typeof value === "number" && isFinite(value);
        if (numeric) return '<c r="' + ref + '"><v>' + value + "</v></c>";
        if (value === "") return "";
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(value) + "</t></is></c>";
      }).join("");
      return '<row r="' + (r + 1) + '">' + cells + "</row>";
    }).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetData>' + body + "</sheetData></worksheet>";
  }

  function safeSheetName(name, used) {
    var clean = String(name || "Sheet").replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || "Sheet";
    var candidate = clean;
    var i = 2;
    while (used[candidate]) { candidate = clean.slice(0, 28) + " " + i; i++; }
    used[candidate] = true;
    return candidate;
  }

  function buildXlsx(sheets) {
    var used = {};
    var named = sheets.map(function (s) {
      return { name: safeSheetName(s.name, used), rows: s.rows || [] };
    });
    var files = [
      {
        name: "[Content_Types].xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          named.map(function (s, i) {
            return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
          }).join("") +
          "</Types>",
      },
      {
        name: "_rels/.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          "</Relationships>",
      },
      {
        name: "xl/workbook.xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          "<sheets>" + named.map(function (s, i) {
            return '<sheet name="' + xmlEscape(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
          }).join("") + "</sheets></workbook>",
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          named.map(function (s, i) {
            return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
          }).join("") + "</Relationships>",
      },
    ];
    named.forEach(function (s, i) {
      files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: sheetXml(s.rows) });
    });
    return zip(files);
  }

  function docxParagraphLegacy(text, style) {
    var styleXml = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : "";
    return "<w:p>" + styleXml + "<w:r><w:t xml:space=\"preserve\">" + xmlEscape(text) + "</w:t></w:r></w:p>";
  }

  function docxTableLegacy(rows) {
    if (!rows.length) return "";
    var borders = '<w:tblBorders>' +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (side) {
        return '<w:' + side + ' w:val="single" w:sz="4" w:color="E7DED3"/>';
      }).join("") + "</w:tblBorders>";
    var body = rows.map(function (row, i) {
      return "<w:tr>" + (row || []).map(function (cell) {
        return "<w:tc><w:tcPr>" + (i === 0 ? '<w:shd w:val="clear" w:fill="F1F5F2"/>' : "") +
          "</w:tcPr>" + docxParagraphLegacy(cell == null ? "" : cell, i === 0 ? "HeadingRow" : null) + "</w:tc>";
      }).join("") + "</w:tr>";
    }).join("");
    return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>' + borders + "</w:tblPr>" + body + "</w:tbl>";
  }

  function buildDocx(blocks) {
    var body = blocks.map(function (b) {
      if (b.type === "title") return docxParagraphLegacy(b.text, "Title");
      if (b.type === "heading") return docxParagraphLegacy(b.text, "Heading1");
      if (b.type === "sub") return docxParagraphLegacy(b.text, "Heading2");
      if (b.type === "table") return docxTableLegacy(b.rows);
      return docxParagraphLegacy(b.text);
    }).join("");
    var rtl = isArabic();
    return zip([
      {
        name: "[Content_Types].xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
          "</Types>",
      },
      {
        name: "_rels/.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          "</Relationships>",
      },
      {
        name: "word/_rels/document.xml.rels",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          "</Relationships>",
      },
      {
        name: "word/styles.xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          '<w:docDefaults><w:pPrDefault><w:pPr><w:bidi w:val="' + (rtl ? "1" : "0") + '"/></w:pPr></w:pPrDefault></w:docDefaults>' +
          '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/></w:pPr>' +
          '<w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>' +
          '<w:style w:type="paragraph" w:styleId="HeadingRow"><w:name w:val="Heading Row"/><w:rPr><w:b/></w:rPr></w:style>' +
          "</w:styles>",
      },
      {
        name: "word/document.xml",
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          "<w:body>" + body +
          '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>',
      },
    ]);
  }

  var PRINT_CSS_LEGACY =
    'body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#1F2937;margin:24px}' +
    '.print-head{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:3px solid #1F5D46;padding-bottom:12px;margin-bottom:18px}' +
    '.print-brand,.print-org{display:flex;gap:10px;align-items:center}' +
    '.print-mark{display:inline-flex;width:40px;height:40px;border-radius:10px;background:#1F5D46;color:#fff;align-items:center;justify-content:center;font-weight:700;font-size:20px}' +
    '.print-org img{width:56px;height:56px;object-fit:contain;border-radius:12px}' +
    '.print-head small{display:block;color:#6B7280;font-size:11px}' +
    'h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;color:#174837;margin:18px 0 6px;border-inline-start:4px solid #B55A3C;padding-inline-start:8px}' +
    '.print-sub{color:#6B7280;font-size:12px;margin:0 0 12px}' +
    '.print-tbl{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px}' +
    '.print-tbl th,.print-tbl td{border:1px solid #E7DED3;padding:6px 8px;text-align:start}' +
    '.print-tbl th{background:#F1F5F2;font-weight:700}' +
    '.print-foot{margin-top:20px;border-top:1px solid #E7DED3;padding-top:8px;color:#6B7280;font-size:11px}' +
    '@page{size:A4;margin:12mm}';

  function printDoc(report) {
    var r = report || {};
    var ar = isArabic();
    var esc2 = typeof esc === "function" ? esc : function (v) { return String(v == null ? "" : v); };
    var head = '<header class="print-head"><div class="print-brand"><span class="print-mark">م</span><div><b>' +
      esc2(T("reportPlatform")) + '</b><small>' +
      (ar ? "مدرستي — منصة التعليم اليمنية" : "Madrasati — Yemen education platform") +
      '</small></div></div><div class="print-org">' +
      (r.logo ? '<img src="' + esc2(r.logo) + '" alt="">' : "") +
      '<div><b>' + esc2(r.entityName || r.name || "—") + '</b><small>' + esc2(r.entityType || "") +
      '</small></div></div></header>';
    var body = (r.blocks || []).map(function (b) {
      if (b.type === "title") return "<h1>" + esc2(b.text) + "</h1>";
      if (b.type === "heading") return "<h2>" + esc2(b.text) + "</h2>";
      if (b.type === "sub") return '<p class="print-sub">' + esc2(b.text) + "</p>";
      if (b.type === "table") {
        return "<table class=\"print-tbl\">" + b.rows.map(function (row, i) {
          return "<tr>" + row.map(function (c) {
            return (i === 0 ? "<th>" : "<td>") + esc2(c == null ? "" : c) + (i === 0 ? "</th>" : "</td>");
          }).join("") + "</tr>";
        }).join("") + "</table>";
      }
      return "<p>" + esc2(b.text) + "</p>";
    }).join("");
    var foot = '<footer class="print-foot">' + esc2(T("reportPlatform")) + " · " + esc2(T("reportIssued")) + ": " +
      esc2(new Date().toLocaleDateString(ar ? "ar-YE" : "en-GB")) + "</footer>";
    var w = window.open("", "_blank");
    if (!w) {
      alert(ar ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة." : "Could not open the print window. Allow pop-ups.");
      return;
    }
    w.document.write('<!doctype html><html lang="' + (ar ? "ar" : "en") + '" dir="' + (ar ? "rtl" : "ltr") +
      '"><head><meta charset="utf-8"><title>' + esc2((r.title || "") + " — " + (r.entityName || "")) +
      "</title><style>" + PRINT_CSS_LEGACY + "</style></head><body>" + head + body + foot +
      '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
    w.document.close();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.InstitutionReport = {
    exportXlsx: function (report) {
      download(buildXlsx(report.sheets), fileSlug(report) + ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    },
    exportDocx: function (report) {
      download(buildDocx(report.blocks), fileSlug(report) + ".docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    },
    buildXlsx: buildXlsx,
    buildDocx: buildDocx,
  };

  window.ReportDoc = { print: printDoc };

  window.ReportExport = {
    xlsx: function (model) {
      download(buildModelXlsx(model), fileSlug(model) + "-" + stamp() + ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    },
    docx: function (model) {
      return buildModelDocx(model).then(function (bytes) {
        download(bytes, fileSlug(model) + "-" + stamp() + ".docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      });
    },
    csv: function (model) {
      download(utf8(buildCsv(model)), fileSlug(model) + "-" + stamp() + ".csv", "text/csv;charset=utf-8");
    },
    print: printModel,
    renderPrintHtml: renderPrintHtml,
    buildModelXlsx: buildModelXlsx,
    buildModelDocx: buildModelDocx,
    buildCsv: buildCsv,
  };
})();
