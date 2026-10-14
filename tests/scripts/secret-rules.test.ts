import { describe, expect, it } from "vitest";
import { scanContent } from "../../scripts/lib/secret-rules";

function ruleOf(line: string): string | undefined {
  return scanContent(line)[0]?.rule;
}

describe("scanContent", () => {
  it("放行演示账号口令与测试夹具里的示例值", () => {
    expect(scanContent(`password: "teamdesk-admin"`)).toEqual([]);
    expect(scanContent(`password: "demo-pass-1234"`)).toEqual([]);
    expect(scanContent(`process.env.TEAMDESK_SESSION_SECRET = "test-secret-value"`)).toEqual([]);
  });

  it("真实凭据仍然会被拦下", () => {
    expect(ruleOf(`password: "P@ssw0rd-real-one"`)).toBe("硬编码口令赋值");
    expect(ruleOf(`const token = "Ab3dEf9hIjKlMnOp"`)).toBe("硬编码口令赋值");
  });

  it("放行只针对口令规则，密钥类规则不受前缀影响", () => {
    const findings = scanContent(
      [
        'const apiKey = "sk-teamdesk-abcdefghijklmnopqrstu";',
        `awsKey: "AKIAIOSFODNN7EXAMPLE"`,
      ].join("\n"),
    );

    expect(findings.map((item) => item.rule)).toEqual(["OpenAI / 通用 API Key", "AWS Access Key"]);
  });

  it("命中结果带上行号与截断后的原文", () => {
    const findings = scanContent(["const a = 1;", `password: "sup3r-secret-value"`].join("\n"));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(2);
    expect(findings[0]?.snippet).toContain("password");
  });

  it("干净内容没有命中", () => {
    expect(scanContent('const name = "李莉";\nexport const version = 3;')).toEqual([]);
  });
});
