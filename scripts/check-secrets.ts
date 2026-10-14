/**
 * 提交前敏感信息自查：扫描 git 已跟踪文件，命中可疑模式就非零退出。
 *
 *   npm run check:secrets
 *
 * 说明：只做正则层面的粗筛，目的是拦住误提交，不能替代人工复核。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface Rule {
  name: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  { name: "OpenAI / 通用 API Key", pattern: /sk-[A-Za-z0-9]{20,}/ },
  { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", pattern: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "私钥文件头", pattern: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "Slack Token", pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "数据库连接串含密码", pattern: /(postgres|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@/ },
  { name: "硬编码口令赋值", pattern: /(password|passwd|secret|token)\s*[:=]\s*["'][^"'\s]{8,}["']/i },
];

const SKIP_PATHS = [
  "node_modules/",
  ".next/",
  ".git/",
  "package-lock.json",
  "data/",
  "coverage/",
];

const ALLOWLIST_FILES = [
  // 占位配置与规则自身的样例
  ".env.example",
  "scripts/check-secrets.ts",
  "docs/",
];

function listTrackedFiles(): string[] {
  const output = execFileSync("git", ["ls-files"], { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function main(): void {
  const files = listTrackedFiles().filter(
    (file) => !SKIP_PATHS.some((skip) => file.startsWith(skip)),
  );

  const findings: { file: string; line: number; rule: string; snippet: string }[] = [];

  for (const file of files) {
    if (ALLOWLIST_FILES.some((allowed) => file.startsWith(allowed))) continue;

    let content: string;
    try {
      content = fs.readFileSync(path.resolve(file), "utf8");
    } catch {
      continue;
    }

    content.split("\n").forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          findings.push({
            file,
            line: index + 1,
            rule: rule.name,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    });
  }

  if (findings.length === 0) {
    console.log(`敏感信息自查通过：扫描 ${files.length} 个已跟踪文件，未发现可疑内容`);
    return;
  }

  console.error(`发现 ${findings.length} 处可疑内容：`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}  [${finding.rule}]`);
    console.error(`    ${finding.snippet}`);
  }
  process.exit(1);
}

main();
