import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/web/csv";

/** toCsv 会带 BOM，断言正文时先剥掉，单独用一条用例覆盖 BOM */
function body(csv: string): string {
  expect(csv.startsWith("﻿")).toBe(true);
  return csv.slice(1);
}

describe("toCsv", () => {
  it("输出表头与数据行，行之间用 CRLF 分隔", () => {
    const csv = body(toCsv(["标题", "状态"], [["登录失败", "open"]]));

    expect(csv).toBe("标题,状态\r\n登录失败,open");
  });

  it("逗号、引号与换行都按 RFC 4180 转义", () => {
    const csv = body(
      toCsv(["内容"], [["a,b"], ['say "hi"'], ["line1\nline2"]]),
    );

    expect(csv).toBe('内容\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"');
  });

  it("空值输出空字符串而不是 undefined", () => {
    const csv = body(toCsv(["a", "b", "c"], [[null, undefined, 0]]));

    expect(csv).toBe("a,b,c\r\n,,0");
  });

  it("带 UTF-8 BOM，保证 Excel 打开中文不乱码", () => {
    expect(toCsv(["标题"], []).charCodeAt(0)).toBe(0xfeff);
  });

  it("没有数据行时只输出表头", () => {
    expect(body(toCsv(["标题"], []))).toBe("标题");
  });
});
