/**
 * 极简 CSV 生成。导出是运营刚需，但为此引一个库不划算。
 * 关键点：字段里的逗号、引号、换行都要转义，Excel 需要 UTF-8 BOM 才不乱码。
 */
const BOM = "﻿";

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return BOM + lines.join("\r\n");
}

/**
 * 把 CSV 文本解析成二维数组。导出时做了转义，导入就得原样还原，
 * 所以这里要处理引号包裹、转义的双引号，以及 CRLF / LF 两种换行。
 */
export function parseCsv(input: string): string[][] {
  // 导出的文件带 BOM，解析前先剥掉，否则第一列表头会对不上
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i] ?? "";
    const next = text[i + 1] ?? "";

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      // CRLF 当作一次换行，不要拆成两行
      i += char === "\r" && next === "\n" ? 2 : 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // 文件不以换行结尾时，最后一行还没落盘
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
