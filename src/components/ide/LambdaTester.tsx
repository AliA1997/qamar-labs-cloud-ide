import { useState } from "react";
import { Zap, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_LAMBDA_EVENT } from "@/lib/ide-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FUNCTIONS = [
  { id: "OrderLambda", handler: "OrderLambda::OrderLambda.Function::Handler", runtime: "dotnet8" },
  { id: "InvoiceLambda", handler: "InvoiceLambda::Invoice.Function::Process", runtime: "dotnet8" },
  { id: "auth-node", handler: "index.handler", runtime: "nodejs20.x" },
];

const EVENT_TEMPLATES: Record<string, string> = {
  "API Gateway (proxy)": SAMPLE_LAMBDA_EVENT,
  "SQS batch": JSON.stringify({
    Records: [{ messageId: "msg-1", body: JSON.stringify({ orderId: "ord_1234" }), eventSource: "aws:sqs" }],
  }, null, 2),
  "S3 put": JSON.stringify({
    Records: [{ eventSource: "aws:s3", s3: { bucket: { name: "uploads" }, object: { key: "receipt.pdf" } } }],
  }, null, 2),
  "EventBridge": JSON.stringify({
    "detail-type": "OrderPlaced", source: "shop.orders", detail: { orderId: "ord_1234", total: 42.5 },
  }, null, 2),
};

export function LambdaTester() {
  const [fn, setFn] = useState(FUNCTIONS[0].id);
  const [tpl, setTpl] = useState("API Gateway (proxy)");
  const [event, setEvent] = useState(SAMPLE_LAMBDA_EVENT);
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<null | {
    status: "success" | "error";
    ms: number;
    billedMs: number;
    memoryMb: number;
    logs: string[];
    response: string;
  }>(null);
  const [copied, setCopied] = useState(false);

  const invoke = async () => {
    setInvoking(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
    let parsed: any = {};
    try { parsed = JSON.parse(event); } catch { /* ignore */ }
    const ms = Math.round(45 + Math.random() * 90);
    setResult({
      status: "success",
      ms,
      billedMs: Math.ceil(ms / 10) * 10,
      memoryMb: 128,
      logs: [
        `START RequestId: 6f3b-... Version: $LATEST`,
        `[INFO] ${new Date().toISOString()} Received ${parsed.httpMethod ?? "EVENT"} ${parsed.path ?? ""}`.trim(),
        `[INFO] Handler executed OK`,
        `END RequestId: 6f3b-...`,
        `REPORT Duration: ${ms} ms  Billed: ${Math.ceil(ms / 10) * 10} ms  Memory Size: 128 MB  Max Memory Used: 74 MB`,
      ],
      response: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({ ok: true, receivedAt: new Date().toISOString(), echo: parsed.body ? JSON.parse(parsed.body) : parsed }),
        headers: { "Content-Type": "application/json" },
      }, null, 2),
    });
    setInvoking(false);
  };

  const pickTemplate = (t: string) => {
    setTpl(t);
    setEvent(EVENT_TEMPLATES[t]);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-3 p-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Zap className="size-4 text-[color:var(--accent-cyan)]" />
          <span className="text-sm font-semibold">Invoke</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <div>
            <label className="text-[11px] uppercase text-muted-foreground">Function</label>
            <Select value={fn} onValueChange={setFn}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNCTIONS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.id} · {f.runtime}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] uppercase text-muted-foreground">Event template</label>
            <Select value={tpl} onValueChange={pickTemplate}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(EVENT_TEMPLATES).map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          <label className="text-[11px] uppercase text-muted-foreground">Event JSON</label>
          <textarea
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            spellCheck={false}
            className="mt-1 min-h-0 flex-1 rounded-md border border-border bg-background p-3 font-mono text-[12px] outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={invoke} disabled={invoking} className="bg-gradient-brand shadow-glow">
              {invoking ? "Invoking…" : "Invoke"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Handler: <span className="font-mono">{FUNCTIONS.find((f) => f.id === fn)?.handler}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <span className="text-sm font-semibold">Response</span>
          {result && (
            <span className="ml-auto flex gap-2 text-[11px] text-muted-foreground">
              <span className="rounded bg-secondary px-2 py-0.5 text-[color:var(--success)]">200 OK</span>
              <span className="rounded bg-secondary px-2 py-0.5">{result.ms} ms</span>
              <span className="rounded bg-secondary px-2 py-0.5">Billed {result.billedMs} ms</span>
              <span className="rounded bg-secondary px-2 py-0.5">{result.memoryMb} MB</span>
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {!result && !invoking && (
            <div className="text-sm text-muted-foreground">Invoke a function to see the response, cold-start metrics, and CloudWatch logs.</div>
          )}
          {invoking && <div className="animate-pulse text-sm text-muted-foreground">Cold start…</div>}
          {result && (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
                  Payload
                  <button
                    onClick={() => { navigator.clipboard.writeText(result.response); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                    className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent"
                  >
                    {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[12px]">{result.response}</pre>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase text-muted-foreground">Logs</div>
                <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[12px] leading-relaxed">
                  {result.logs.join("\n")}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
