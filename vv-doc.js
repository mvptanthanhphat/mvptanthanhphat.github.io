(function () {
  var WML = "http://schemas.openxmlformats.org/" + "officeDocument/wordprocessingml/2006/main";
  function xml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;");
  }
  function para(text, opt) {
    var o = opt || {};
    var size = o.size || 22;
    var font = "Times New Roman";
    var align = o.align ? "<w:jc w:val=\"" + o.align + "\"/>" : "";
    var space = "<w:spacing w:before=\"" + (o.before || 0) + "\" w:after=\"" + (o.after == null ? 60 : o.after) + "\"/>";
    return "<w:p><w:pPr>" + align + space + "</w:pPr><w:r><w:rPr><w:rFonts w:ascii=\"" + font + "\" w:hAnsi=\"" + font + "\" w:cs=\"" + font + "\"/>" +
      (o.bold ? "<w:b/>" : "") + (o.italic ? "<w:i/>" : "") +
      (o.color ? "<w:color w:val=\"" + o.color + "\"/>" : "") +
      "<w:sz w:val=\"" + size + "\"/><w:szCs w:val=\"" + size + "\"/></w:rPr><w:t xml:space=\"preserve\">" + xml(text) + "</w:t></w:r></w:p>";
  }
  function cell(text, opt) {
    var o = opt || {};
    var fill = o.fill ? "<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"" + o.fill + "\"/>" : "";
    var span = o.span ? "<w:gridSpan w:val=\"" + o.span + "\"/>" : "";
    return "<w:tc><w:tcPr><w:tcW w:w=\"" + (o.w || 1400) + "\" w:type=\"dxa\"/>" + span + fill + "<w:vAlign w:val=\"center\"/></w:tcPr>" +
      para(text, { size: o.size || 20, bold: o.bold, italic: o.italic, color: o.color, align: o.align || "left", before: 40, after: 40 }) + "</w:tc>";
  }
  function documentXml(m) {
    var widths = [700, 4200, 900, 1100, 1600, 1800];
    var head = ["STT", "Tên hàng hóa, dịch vụ", "ĐVT", "Số lượng", "Đơn giá (VNĐ)", "Thành tiền (VNĐ)"];
    var borders = "<w:tblBorders><w:top w:val=\"single\" w:sz=\"8\" w:color=\"B08D57\"/><w:left w:val=\"single\" w:sz=\"8\" w:color=\"B08D57\"/><w:bottom w:val=\"single\" w:sz=\"8\" w:color=\"B08D57\"/><w:right w:val=\"single\" w:sz=\"8\" w:color=\"B08D57\"/><w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"D8C7A8\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"D8C7A8\"/></w:tblBorders>";
    var nil = "<w:tblBorders><w:top w:val=\"nil\"/><w:left w:val=\"nil\"/><w:bottom w:val=\"nil\"/><w:right w:val=\"nil\"/><w:insideH w:val=\"nil\"/><w:insideV w:val=\"nil\"/></w:tblBorders>";
    var headRow = "<w:tr>" + head.map(function (label, i) {
      return cell(label, { w: widths[i], fill: "7A2E24", color: "FFFFFF", bold: true, align: "center", size: 18 });
    }).join("") + "</w:tr>";
    var body = (m.items || []).map(function (item, i) {
      return "<w:tr>" + [
        cell(String(i + 1), { w: widths[0], align: "center" }),
        cell(item.name || "", { w: widths[1] }),
        cell(item.unit || "", { w: widths[2], align: "center" }),
        cell(String(item.qty || 0), { w: widths[3], align: "center" }),
        cell(item.priceText || "", { w: widths[4], align: "right" }),
        cell(item.amountText || "", { w: widths[5], align: "right", bold: true })
      ].join("") + "</w:tr>";
    }).join("");
    function sumRow(label, value, fill) {
      var color = fill === "7A2E24" ? "FFFFFF" : "2C1810";
      return "<w:tr>" + cell(label, { w: 8500, span: 5, align: "right", bold: true, fill: fill || "FBF6EE", color: color }) +
        cell(value, { w: widths[5], align: "right", bold: true, fill: fill || "FBF6EE", color: color }) + "</w:tr>";
    }
    var notes = (m.notes || []).map(function (line) { return para(line, { size: 21 }); }).join("");
    var sign = m.signRole ? para(m.signRole, { align: "center", size: 22, before: 80, after: 0 }) : "";
    return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:document xmlns:w=\"" + WML + "\"><w:body>" +
      para(m.kicker || "", { align: "center", size: 18, color: "B08D57", bold: true, after: 40 }) +
      para(m.companyName || "", { align: "center", size: 32, bold: true, color: "7A2E24", after: 40 }) +
      para(m.meta || "", { align: "center", size: 21, after: 0 }) +
      para(m.addressLine || "", { align: "center", size: 21, after: 80 }) +
      para(m.dateLine || "", { align: "right", italic: true, size: 22, before: 160 }) +
      para(m.title || "BẢNG BÁO GIÁ", { align: "center", size: 36, bold: true, color: "7A2E24", before: 200, after: 80 }) +
      "<w:tbl><w:tblPr><w:tblW w:w=\"10300\" w:type=\"dxa\"/>" + nil + "</w:tblPr><w:tblGrid><w:gridCol w:w=\"6200\"/><w:gridCol w:w=\"4100\"/></w:tblGrid><w:tr>" +
      cell(m.greet || "", { w: 6200, italic: true, size: 22 }) +
      cell(m.docNoLine || "", { w: 4100, align: "right", italic: true, size: 22 }) +
      "</w:tr></w:tbl>" +
      para(m.intro || "", { size: 22, before: 80, after: 120 }) +
      "<w:tbl><w:tblPr><w:tblW w:w=\"10300\" w:type=\"dxa\"/>" + borders + "<w:tblLayout w:type=\"fixed\"/></w:tblPr><w:tblGrid>" +
      widths.map(function (w) { return "<w:gridCol w:w=\"" + w + "\"/>"; }).join("") + "</w:tblGrid>" +
      headRow + body +
      sumRow(m.subLabel || "Cộng tiền hàng:", m.subText || "") +
      sumRow(m.vatLabel || "Thuế GTGT:", m.vatText || "") +
      sumRow(m.totalLabel || "Tổng thanh toán:", m.totalText || "", "7A2E24") +
      "</w:tbl>" + notes +
      para(m.thanks || "", { align: "center", italic: true, size: 22, before: 240 }) +
      "<w:tbl><w:tblPr><w:tblW w:w=\"3600\" w:type=\"dxa\"/><w:jc w:val=\"right\"/>" + nil + "</w:tblPr><w:tblGrid><w:gridCol w:w=\"3600\"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w=\"3600\" w:type=\"dxa\"/></w:tcPr>" +
      para("ĐẠI DIỆN CÔNG TY", { align: "center", bold: true, color: "7A2E24", size: 22, before: 200, after: 0 }) +
      sign + "</w:tc></w:tr></w:tbl>" +
      "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\" w:orient=\"portrait\"/><w:pgMar w:top=\"851\" w:right=\"851\" w:bottom=\"851\" w:left=\"851\" w:header=\"454\" w:footer=\"454\" w:gutter=\"0\"/></w:sectPr>" +
      "</w:body></w:document>";
  }
  function stripDirEntries(u8) {
    var data = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
    var view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    var eocd = -1;
    var i;
    for (i = data.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return data;
    var cdCount = view.getUint16(eocd + 10, true);
    var cdOff = view.getUint32(eocd + 16, true);
    var kept = [];
    var p = cdOff;
    for (var n = 0; n < cdCount; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) break;
      var nameLen = view.getUint16(p + 28, true);
      var extraLen = view.getUint16(p + 30, true);
      var commentLen = view.getUint16(p + 32, true);
      var localOff = view.getUint32(p + 42, true);
      var name = "";
      for (var c = 0; c < nameLen; c++) name += String.fromCharCode(data[p + 46 + c]);
      var recLen = 46 + nameLen + extraLen + commentLen;
      if (name.charAt(name.length - 1) !== "/") kept.push({ cdStart: p, cdLen: recLen, localOff: localOff });
      p += recLen;
    }
    kept.sort(function (a, b) { return a.localOff - b.localOff; });
    var pieces = [];
    var cursor = 0;
    kept.forEach(function (e) {
      var lh = e.localOff;
      var flags = view.getUint16(lh + 6, true);
      var comp = view.getUint32(lh + 18, true);
      var nLen = view.getUint16(lh + 26, true);
      var xLen = view.getUint16(lh + 28, true);
      var localSize = 30 + nLen + xLen + comp;
      if (flags & 8) {
        var dd = lh + localSize;
        if (dd + 4 <= data.length && view.getUint32(dd, true) === 0x08074b50) localSize += 16;
        else localSize += 12;
      }
      var slice = data.slice(lh, lh + localSize);
      var cd = data.slice(e.cdStart, e.cdStart + e.cdLen);
      new DataView(cd.buffer, cd.byteOffset, cd.byteLength).setUint32(42, cursor, true);
      pieces.push({ slice: slice, cd: cd });
      cursor += slice.length;
    });
    var cdLen = 0;
    pieces.forEach(function (e) { cdLen += e.cd.length; });
    var out = new Uint8Array(cursor + cdLen + 22);
    var w = 0;
    pieces.forEach(function (e) { out.set(e.slice, w); w += e.slice.length; });
    var cdStart = w;
    pieces.forEach(function (e) { out.set(e.cd, w); w += e.cd.length; });
    var ev = new DataView(out.buffer);
    ev.setUint32(w, 0x06054b50, true);
    ev.setUint16(w + 8, pieces.length, true);
    ev.setUint16(w + 10, pieces.length, true);
    ev.setUint32(w + 12, cdLen, true);
    ev.setUint32(w + 16, cdStart, true);
    return out;
  }
  function pack(m) {
    var zip = new window.JSZip();
    zip.file("[Content_Types].xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
      "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
      "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
      "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
      "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>" +
      "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>" +
      "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>" +
      "</Types>");
    zip.file("_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
      "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>" +
      "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/>" +
      "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/>" +
      "</Relationships>");
    zip.file("word/document.xml", documentXml(m));
    zip.file("word/styles.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:styles xmlns:w=\"" + WML + "\"><w:docDefaults><w:rPrDefault><w:rPr>" +
      "<w:rFonts w:ascii=\"Times New Roman\" w:hAnsi=\"Times New Roman\" w:cs=\"Times New Roman\"/>" +
      "<w:sz w:val=\"22\"/><w:szCs w:val=\"22\"/></w:rPr></w:rPrDefault></w:docDefaults>" +
      "<w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/><w:qFormat/></w:style></w:styles>");
    zip.file("word/_rels/document.xml.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
      "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>" +
      "</Relationships>");
    zip.file("docProps/core.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">" +
      "<dc:title>" + xml(m.title || "Bao gia") + "</dc:title><dc:creator>Van Vuong</dc:creator></cp:coreProperties>");
    zip.file("docProps/app.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\">" +
      "<Application>Microsoft Office Word</Application></Properties>");
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }).then(function (u8) {
      return new Blob([stripDirEntries(u8)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    });
  }
  function download(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }
  window.VVDoc = {
    docx: function (m) {
      if (!window.JSZip) return Promise.reject(new Error("zip"));
      return pack(m).then(function (blob) {
        download(blob, (m.fileName || "Bang_Bao_Gia") + ".docx");
      });
    },
    xlsx: function (m) {
      if (!window.XLSX) throw new Error("xlsx");
      var rows = [
        [m.companyName || ""],
        [m.meta || ""],
        [m.addressLine || ""],
        [m.dateLine || ""],
        [],
        [m.title || ""],
        [m.greet || "", "", "", "", m.docNoLine || ""],
        [m.intro || ""],
        [],
        ["STT", "Tên hàng hóa, dịch vụ", "ĐVT", "Số lượng", "Đơn giá (VNĐ)", "Thành tiền (VNĐ)"]
      ];
      (m.items || []).forEach(function (item, i) {
        rows.push([i + 1, item.name || "", item.unit || "", Number(item.qty) || 0, Number(item.price) || 0, Number(item.amount) || 0]);
      });
      rows.push(["", "", "", "", m.subLabel || "Cộng tiền hàng", Number(m.sub) || 0]);
      rows.push(["", "", "", "", m.vatLabel || "Thuế GTGT", Number(m.vat) || 0]);
      rows.push(["", "", "", "", m.totalLabel || "Tổng thanh toán", Number(m.total) || 0]);
      rows.push([]);
      (m.notes || []).forEach(function (line) { rows.push([line]); });
      rows.push([m.thanks || ""]);
      if (m.signRole) rows.push(["ĐẠI DIỆN CÔNG TY — " + m.signRole]);
      else rows.push(["ĐẠI DIỆN CÔNG TY"]);
      var sheet = window.XLSX.utils.aoa_to_sheet(rows);
      sheet["!cols"] = [{ wch: 28 }, { wch: 46 }, { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 20 }];
      sheet["!pageSetup"] = { paperSize: 9, orientation: "portrait", fitToWidth: 1, fitToHeight: 1 };
      var book = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(book, sheet, "Van Vuong");
      window.XLSX.writeFile(book, (m.fileName || "Bang_Bao_Gia") + ".xlsx");
    }
  };
})();
