import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Globe, Play, CircleAlert, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IdeFile } from "@/lib/ide-data";
import { callMcpTool, parseMcpServer, type McpFramework } from "@/lib/mcp-sim";
import { cn } from "@/lib/utils";

type Props = {
  files: IdeFile[];
  entryPath: string;
  framework: McpFramework;
  runToken: number;
};

export function McpPreview({ files, entryPath, framework, runToken }: Props) {
  const source = files.find((f) => f.path === entryPath)?.content ?? "";
  const info = useMemo(() => parseMcpServer(source, framework), [source, framework]);

  const [booting, setBooting] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<{ ok: boolean; text: string; logs: string[] } | null>(null);

  // Re-run the server whenever the user saves.
  useEffect(() => {
    setBooting(true);
    setOutput(null);
    const t = setTimeout(() => setBooting(false), 700);
    return () => clearTimeout(t);
  }, [runToken]);

  useEffect(() => {
    if (!info.tools.some((t) => t.name === selected)) {
      setSelected(info.tools[0]?.name ?? "");
      setArgs({});
    }
  }, [info.tools, selected]);

  const tool = info.tools.find((t) => t.name === selected);
  const url = `http://localhost:${info.port}`;

  const invoke = () => {
    if (!tool) return;
    const r = callMcpTool(source, tool, args);
    setOutput({ ok: r.ok, text: r.result, logs: r.logs });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-panel px-3 py-2">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-[color:var(--success)]/70" />
        </div>
        <div className="ml-2 flex h-7 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 font-mono text-[11px] text-muted-foreground">
          <Globe className="size-3" />
          {url}
          <span className="text-foreground/40">·</span>
          <span className="text-[color:var(--accent-cyan)]">{info.path}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setBooting(true) || setTimeout(() => setBooting(false), 500)}>
          <RefreshCw className={cn("size-3.5", booting && "animate-spin")} /> Reload
        </Button>
      </div>

      {booting ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="size-5 animate-spin text-primary" />
          Restarting {framework === "fastmcp" ? "FastMCP" : "Gradio"} server on port {info.port}…
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
          <aside className="min-h-0 overflow-auto border-r border-border bg-panel">
            <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {framework === "fastmcp" ? "MCP tools" : "Exposed functions"}
            </div>
            {info.tools.map((t) => (
              <button
                key={t.name}
                onClick={() => { setSelected(t.name); setArgs({}); setOutput(null); }}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors",
                  t.name === selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/40",
                )}
              >
                <Wrench className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-mono">{t.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{t.description}</span>
                </span>
              </button>
            ))}
            {info.tools.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground">No tools exposed yet.</div>
            )}
          </aside>

          <div className="min-h-0 overflow-auto p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{info.serverName}</h2>
              <p className="text-xs text-muted-foreground">
                {framework === "fastmcp" ? "FastMCP" : "Gradio"} · transport {info.transport} ·{" "}
                {info.tools.length} tool{info.tools.length === 1 ? "" : "s"}
              </p>
            </div>

            {info.errors.map((e) => (
              <div key={e} className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {e}
              </div>
            ))}

            {tool ? (
              <div className="rounded-lg border border-border bg-panel p-4">
                <div className="font-mono text-sm">
                  {tool.name}({tool.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) → {tool.returnType}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>

                <div className="mt-4 grid gap-3">
                  {tool.params.map((p) => (
                    <label key={p.name} className="grid gap-1 text-xs">
                      <span className="font-mono text-muted-foreground">{p.name}: {p.type}</span>
                      <input
                        value={args[p.name] ?? ""}
                        onChange={(e) => setArgs((a) => ({ ...a, [p.name]: e.target.value }))}
                        placeholder={p.default ?? `enter ${p.name}`}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  ))}
                  {tool.params.length === 0 && (
                    <div className="text-xs text-muted-foreground">This tool takes no arguments.</div>
                  )}
                </div>

                <Button className="mt-4" size="sm" onClick={invoke}>
                  <Play className="size-3.5" /> Call tool
                </Button>

                {output && (
                  <div className="mt-4">
                    <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Response</div>
                    <pre className={cn(
                      "overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[12px]",
                      output.ok ? "text-foreground" : "text-destructive",
                    )}>{output.text}</pre>
                    {output.logs.length > 0 && (
                      <pre className="mt-2 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
                        {output.logs.join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Add a tool to your server, then press Save all.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
