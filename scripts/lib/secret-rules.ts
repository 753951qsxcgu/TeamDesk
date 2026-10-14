/**
 * 敏感信息的匹配规则。单独拆出来是为了能被单元测试覆盖：
 * 脚本本体只负责遍历文件与退出码，规则本身是可测的纯函数。
 */

export interface Rule {
  name: string;
  /** 命中即视为可疑 */
  pattern: RegExp;
  /**
   * 命中但同时命中 safePattern 时放行。
   * 用于排除演示数据、测试夹具、占位配置里的示例值。
   */
  safePattern?: RegExp;
}

export const RULES: Rule[] = [
  { name: "OpenAI / 通用 API Key", pattern: /sk-[A-Za-z0-9]{20,}/ },
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", pattern: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "私钥文件头", pattern: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "Slack Token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "数据库连接串含密码", pattern: /(postgres|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@/ },
  {
    name: "硬编码口令赋值",
    pattern: /(password|passwd|secret|token)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
    // 演示账号口令与测试夹具统一用这些前缀，便于与真实凭据区分
    safePattern: /["'](teamdesk|demo|example|sample|test|changeme|placeholder|redacted)[-_]/i,
  },
];

export interface SecretFinding {
  line: number;
  rule: string;
  snippet: string;
}

export function scanContent(content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];

  content.split("\n").forEach((line, index) => {
    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue;
      if (rule.safePattern?.test(line)) continue;
      findings.push({
        line: index + 1,
        rule: rule.name,
        snippet: line.trim().slice(0, 120),
      });
    }
  });

  return findings;
}
