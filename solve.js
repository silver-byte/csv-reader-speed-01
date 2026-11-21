export default function run(input) {
  const s = String(input.text);
  const header = input.header === true;
  const n = s.length;
  const rows = [];
  const errors = [];
  let columns = null;
  let line = 1;
  let i = 0;
  if (n > 0 && s.charCodeAt(0) === 0xfeff) i = 1;

  let width = -1;
  let widthSet = false;
  let headerSet = false;
  let rowIndex = 0;

  while (i < n) {
    const c0 = s.charCodeAt(i);
    if (c0 === 0x0a) { i++; line++; continue; }
    if (c0 === 0x0d && i + 1 < n && s.charCodeAt(i + 1) === 0x0a) { i += 2; line++; continue; }

    const recLine = line;
    const fields = [];
    const recErrors = [];
    let singleFieldQuoted = false;
    let fieldCount = 0;
    let recDone = false;

    while (!recDone && i < n) {
      if (s.charCodeAt(i) === 0x22) {
        let qline = line;
        let p = i + 1;
        let closeAt = -1;
        let closed = false;
        while (p < n) {
          const c = s.charCodeAt(p);
          if (c === 0x22) {
            if (p + 1 < n && s.charCodeAt(p + 1) === 0x22) { p += 2; }
            else { closeAt = p; closed = true; break; }
          } else if (c === 0x0a) { line++; p++; }
          else if (c === 0x0d) { line++; if (p + 1 < n && s.charCodeAt(p + 1) === 0x0a) p += 2; else p++; }
          else p++;
        }
        if (!closed) {
          recErrors.push({ code: "unterminated_quote", line: recLine, row: rowIndex });
          line = qline;
          i = i + 1;
          let segStart = i;
          let fld = '"';
          let atEof = false;
          while (true) {
            if (i >= n) { fld += s.slice(segStart, n); i = n; atEof = true; break; }
            const c = s.charCodeAt(i);
            if (c === 0x2c) { fld += s.slice(segStart, i); i = i + 1; break; }
            else if (c === 0x0a) { fld += s.slice(segStart, i); i = i + 1; line++; atEof = true; break; }
            else if (c === 0x0d) {
              if (i + 1 < n && s.charCodeAt(i + 1) === 0x0a) {
                fld += s.slice(segStart, i); i = i + 2; line++; atEof = true; break;
              } else {
                fld += s.slice(segStart, i); segStart = i + 1;
                recErrors.push({ code: "stray_cr", line: recLine, row: rowIndex });
                i++;
              }
            } else i++;
          }
          if (fieldCount === 0) singleFieldQuoted = false;
          fields.push(fld); fieldCount++;
          if (atEof) recDone = true;
          continue;
        }
        let content;
        const qStart = i + 1;
        const qi = s.indexOf('"', qStart);
        const ri = s.indexOf("\r", qStart);
        if ((qi === -1 || qi >= closeAt) && (ri === -1 || ri >= closeAt)) {
          content = s.slice(qStart, closeAt);
        } else {
          content = s.slice(qStart, closeAt);
          if (qi < closeAt) content = content.replaceAll('""', '"');
          if (ri < closeAt) content = content.replace(/\r\n?/g, "\n");
        }
        const tp = closeAt + 1;
        if (tp >= n) {
          i = n; recDone = true;
          if (fieldCount === 0) singleFieldQuoted = true;
          fields.push(content); fieldCount++;
          continue;
        }
        const tc = s.charCodeAt(tp);
        if (tc === 0x2c) {
          i = tp + 1;
          if (fieldCount === 0) singleFieldQuoted = true;
          fields.push(content); fieldCount++;
        } else if (tc === 0x0a) {
          line++; i = tp + 1; recDone = true;
          if (fieldCount === 0) singleFieldQuoted = true;
          fields.push(content); fieldCount++;
        } else if (tc === 0x0d && tp + 1 < n && s.charCodeAt(tp + 1) === 0x0a) {
          line++; i = tp + 2; recDone = true;
          if (fieldCount === 0) singleFieldQuoted = true;
          fields.push(content); fieldCount++;
        } else {
          let j = tp;
          let segStart = tp;
          let keptAny = false;
          let jt = 0;
          while (true) {
            if (j >= n) {
              content += s.slice(segStart, n);
              if (segStart < n) keptAny = true;
              i = n; jt = 1; break;
            }
            const cj = s.charCodeAt(j);
            if (cj === 0x2c) {
              content += s.slice(segStart, j);
              if (j > segStart) keptAny = true;
              i = j + 1; jt = 0; break;
            } else if (cj === 0x0a) {
              content += s.slice(segStart, j);
              if (j > segStart) keptAny = true;
              line++; i = j + 1; jt = 1; break;
            } else if (cj === 0x0d) {
              if (j + 1 < n && s.charCodeAt(j + 1) === 0x0a) {
                content += s.slice(segStart, j);
                if (j > segStart) keptAny = true;
                line++; i = j + 2; jt = 1; break;
              } else {
                content += s.slice(segStart, j);
                if (j > segStart) keptAny = true;
                segStart = j + 1;
                recErrors.push({ code: "stray_cr", line: recLine, row: rowIndex });
                j++;
              }
            } else j++;
          }
          if (keptAny) recErrors.push({ code: "quote_junk", line: recLine, row: rowIndex });
          if (fieldCount === 0) singleFieldQuoted = true;
          fields.push(content); fieldCount++;
          if (jt === 1) recDone = true;
        }
      } else {
        let segStart = i;
        let fld = "";
        let atEof = false;
        while (true) {
          if (i >= n) { fld += s.slice(segStart, n); i = n; atEof = true; break; }
          const c = s.charCodeAt(i);
          if (c === 0x2c) { fld += s.slice(segStart, i); i = i + 1; break; }
          else if (c === 0x0a) { fld += s.slice(segStart, i); i = i + 1; line++; atEof = true; break; }
          else if (c === 0x0d) {
            if (i + 1 < n && s.charCodeAt(i + 1) === 0x0a) {
              fld += s.slice(segStart, i); i = i + 2; line++; atEof = true; break;
            } else {
              fld += s.slice(segStart, i); segStart = i + 1;
              recErrors.push({ code: "stray_cr", line: recLine, row: rowIndex });
              i++;
            }
          } else i++;
        }
        if (fieldCount === 0) singleFieldQuoted = false;
        fields.push(fld); fieldCount++;
        if (atEof) recDone = true;
      }
    }

    const isSingleEmptyUnquoted = fieldCount === 1 && fields[0] === "" && !singleFieldQuoted;

    if (isSingleEmptyUnquoted) {
      for (let k = 0; k < recErrors.length; k++) {
        const er = recErrors[k];
        er.row = rowIndex;
        errors.push(er);
      }
      continue;
    }

    if (header && !headerSet) {
      headerSet = true;
      columns = fields;
      if (!widthSet) { widthSet = true; width = fields.length; }
      for (let k = 0; k < recErrors.length; k++) {
        const er = recErrors[k];
        er.row = null;
        errors.push(er);
      }
      continue;
    }

    const assignedRow = rowIndex;
    if (!widthSet) { widthSet = true; width = fields.length; }
    else if (fields.length < width) {
      recErrors.push({ code: "short_row", line: recLine, row: assignedRow, fields: fields.length });
      while (fields.length < width) fields.push("");
    } else if (fields.length > width) {
      recErrors.push({ code: "long_row", line: recLine, row: assignedRow, extra: fields.slice(width) });
      fields.length = width;
    }
    for (let k = 0; k < recErrors.length; k++) {
      const er = recErrors[k];
      er.row = assignedRow;
      errors.push(er);
    }
    rows.push(fields);
    rowIndex++;
  }

  if (header && !headerSet) columns = [];
  return { columns, rows, errors };
}