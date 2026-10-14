import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

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
    const csv = body(toCsv(["内容"], [["a,b"], ['say "hi"'], ["line1\nline2"]]));

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

  it("导出再解析能原样还原，转义不会丢字符", () => {
    const rows = [
      ["登录失败", "登录页, 输入正确密码仍报错"],
      ['导出含 "引号" 的标题', "换行\n第二行"],
    ];
    const parsed = parseCsv(toCsv(["标题", "描述"], rows));

    expect(parsed[0]).toEqual(["标题", "描述"]);
    expect(parsed.slice(1)).toEqual(rows);
  });
});

describe("parseCsv", () => {
  it("按行拆分，兼容 CRLF 与 LF", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("引号内的逗号与换行不算分隔符", () => {
    expect(parseCsv('a,"1,2"\r\n"line1\nline2",b')).toEqual([
      ["a", "1,2"],
      ["line1\nline2", "b"],
    ]);
  });

  it("两个连续引号还原成一个引号", () => {
    expect(parseCsv('"say ""hi"""')).toEqual([['say "hi"']]);
  });

  it("剥掉 BOM 后再解析，表头不会多出不可见字符", () => {
    expect(parseCsv("﻿标题,状态\r\n登录,open")).toEqual([
      ["标题", "状态"],
      ["登录", "open"],
    ]);
  });

  it("文件不以换行结尾时最后一行仍然有效", () => {
    expect(parseCsv("a,b\r\n1,2")).toHaveLength(2);
  });

  it("末尾的空行不产生空记录", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toHaveLength(2);
  });

  it("空单元格保留为空字符串", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});
