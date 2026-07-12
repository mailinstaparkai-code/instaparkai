import { TRIGGER_DEFINITIONS, type Channel, type TriggerKey } from "@/lib/communication-triggers";

type LogRow = {
  id: string;
  trigger_key: TriggerKey;
  channel: Channel;
  recipient: string;
  status: "sent" | "failed";
  error: string | null;
  is_test: boolean;
  created_at: string;
};

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email" };

export function MessageLogTable({ rows }: { rows: LogRow[] }) {
  return (
    <div className="glass-card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="p-3 font-medium">Trigger</th>
            <th className="p-3 font-medium">Channel</th>
            <th className="p-3 font-medium">Recipient</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="p-3">
                <p className="font-medium">{TRIGGER_DEFINITIONS[row.trigger_key]?.label ?? row.trigger_key}</p>
                {row.is_test && <p className="text-xs text-muted-foreground">Test send</p>}
              </td>
              <td className="p-3">{CHANNEL_LABEL[row.channel]}</td>
              <td className="p-3">{row.recipient}</td>
              <td className="p-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.status === "sent"
                      ? "bg-status-success/15 text-status-success"
                      : "bg-status-danger/15 text-status-danger"
                  }`}
                >
                  {row.status === "sent" ? "Sent" : "Failed"}
                </span>
                {row.status === "failed" && row.error && (
                  <p className="mt-1 max-w-xs truncate text-xs text-status-danger" title={row.error}>
                    {row.error}
                  </p>
                )}
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                No messages sent yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
