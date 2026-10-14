"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";

export interface TicketImportResult {
  total: number;
  created: number;
  ticketIds: string[];
  skipped: { row: number; title: string; reason: string }[];
}

const SAMPLE = ["标题,描述,优先级,经办人邮箱,标签", "登录页报错,点击登录无响应,高,,登录"].join("\n");

/**
 * 导入表单：支持选文件与直接粘贴两种输入。
 * 先跑一次「试跑校验」把问题行挑出来，再正式导入，避免脏数据进库。
 */
export function TicketImportForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [pending, setPending] = useState<"" | "dryRun" | "import">("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(TicketImportResult & { dryRun: boolean }) | null>(null);

  async function submit(dryRun: boolean) {
    if (csv.trim() === "") {
      setError("先选文件或粘贴 CSV 内容");
      return;
    }
    setPending(dryRun ? "dryRun" : "import");
    setError(null);
    setResult(null);
    try {
      const data = await apiSend<TicketImportResult>("/api/tickets/import", "POST", { csv, dryRun });
      setResult({ ...data, dryRun });
      if (!dryRun) {
        setCsv("");
        if (fileInput.current) fileInput.current.value = "";
        router.refresh();
      }
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setPending("");
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setCsv(await file.text());
    setResult(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void pickFile(event.target.files?.[0])}
          className="text-sm text-slate-600"
        />
        <button
          type="button"
          onClick={() => setCsv(SAMPLE)}
          className="text-sm text-blue-700 hover:underline"
        >
          填入示例
        </button>
      </div>

      <textarea
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
        rows={10}
        placeholder="标题,描述,优先级,经办人邮箱,标签"
        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={pending !== ""} onClick={() => void submit(true)}>
          {pending === "dryRun" ? "校验中…" : "试跑校验"}
        </Button>
        <Button disabled={pending !== ""} onClick={() => void submit(false)}>
          {pending === "import" ? "导入中…" : "正式导入"}
        </Button>
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>

      {result ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="text-slate-800">
            {result.dryRun ? "试跑结果" : "导入完成"}：共解析 {result.total} 行
            {result.dryRun ? "" : `，成功创建 ${result.created} 条`}
            {result.skipped.length > 0 ? `，跳过 ${result.skipped.length} 行` : ""}
          </p>
          {result.skipped.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {result.skipped.map((item) => (
                <li key={`${item.row}-${item.title}`}>
                  第 {item.row} 行{item.title ? `（${item.title}）` : ""}：{item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
