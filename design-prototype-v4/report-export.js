// report-export.js — institution report export for the V4 shell.
//
// Delivers real .xlsx and .docx files with no build step and no third-party
// library. Both formats are ZIP containers of XML parts, so the module writes a
// minimal ZIP (store method, CRC-32) and the parts each format expects. Excel
// and Word open the result as genuine spreadsheets/documents rather than as a
// renamed HTML or CSV file.
//
// PDF is deliberately handled by the browser: correct Arabic shaping in a PDF
// needs an embedded font, and shipping one is out of scope for a no-build SPA.
// exportInstitutionPdf therefore opens the print-ready report and hands it to
// the user's print dialog, where "Save as PDF" produces a correctly shaped
// Arabic document. The choice is recorded in the design memo.
(function () {
  "use strict";

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
      v.setUint16(6, 0x0800, true); // UTF-8 file names
      v.setUint16(8, 0, true); // stored, no compression
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
      // Control characters are illegal in XML and make Excel refuse the file.
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

  // ---- XLSX ----
  // One worksheet per table. A cell is written as inline text unless it is a
  // plain number, which goes in as a numeric cell so Excel can total it.
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

  // ---- DOCX ----
  function docxParagraph(text, style) {
    var styleXml = style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : "";
    return "<w:p>" + styleXml + "<w:r><w:t xml:space=\"preserve\">" + xmlEscape(text) + "</w:t></w:r></w:p>";
  }

  function docxTable(rows) {
    if (!rows.length) return "";
    var borders = '<w:tblBorders>' +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (side) {
        return '<w:' + side + ' w:val="single" w:sz="4" w:color="E7DED3"/>';
      }).join("") + "</w:tblBorders>";
    var body = rows.map(function (row, i) {
      return "<w:tr>" + (row || []).map(function (cell) {
        return "<w:tc><w:tcPr>" + (i === 0 ? '<w:shd w:val="clear" w:fill="F1F5F2"/>' : "") +
          "</w:tcPr>" + docxParagraph(cell == null ? "" : cell, i === 0 ? "HeadingRow" : null) + "</w:tc>";
      }).join("") + "</w:tr>";
    }).join("");
    return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>' + borders + "</w:tblPr>" + body + "</w:tbl>";
  }

  function buildDocx(blocks) {
    var body = blocks.map(function (b) {
      if (b.type === "title") return docxParagraph(b.text, "Title");
      if (b.type === "heading") return docxParagraph(b.text, "Heading1");
      if (b.type === "sub") return docxParagraph(b.text, "Heading2");
      if (b.type === "table") return docxTable(b.rows);
      return docxParagraph(b.text);
    }).join("");

    // Right-to-left is set as the default so the Arabic report reads correctly
    // in Word without the user changing paragraph direction.
    var rtl = (typeof lang !== "undefined" && lang === "ar");
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

  function fileSlug(name) {
    return String(name || "institution").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "institution";
  }

  window.InstitutionReport = {
    exportXlsx: function (report) {
      download(buildXlsx(report.sheets), fileSlug(report.name) + ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    },
    exportDocx: function (report) {
      download(buildDocx(report.blocks), fileSlug(report.name) + ".docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    },
    buildXlsx: buildXlsx,
    buildDocx: buildDocx,
  };
})();
