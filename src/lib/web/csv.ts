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
