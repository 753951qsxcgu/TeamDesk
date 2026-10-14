import { TicketImportForm } from "@/components/tickets/ticket-import-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const COLUMNS = [
  ["标题", "必填，最长 120 字"],
  ["描述", "选填，最长 5000 字"],
  ["优先级", "紧急 / 高 / 中 / 低，也可以写 urgent / high / medium / low"],
  ["经办人邮箱", "选填，必须是已注册用户的邮箱"],
  ["标签", "多个用 / 分隔，不存在的标签会自动创建"],
];

export default function ImportPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="批量导入工单"
          description="列顺序可以任意，但表头必须包含「标题」；导入的工单报告人是你自己"
        />
        <CardContent>
          <TicketImportForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="支持的列" />
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">列名</th>
                <th className="px-3 py-2 font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COLUMNS.map(([name, note]) => (
                <tr key={name}>
                  <td className="px-3 py-2 font-medium text-slate-800">{name}</td>
                  <td className="px-3 py-2 text-slate-600">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
