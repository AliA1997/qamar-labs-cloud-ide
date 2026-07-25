import { useState } from "react";
import { Play, TestTube2, Hammer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type LogLine = { kind: "out" | "err" | "info" | "ok"; text: string };

const BUILD_STREAM: LogLine[] = [
  { kind: "info", text: "$ dotnet restore NovaIDE.sln" },
  { kind: "out", text: "  Determining projects to restore..." },
  { kind: "out", text: "  Restored src/HelloApi/HelloApi.csproj (in 812 ms)." },
  { kind: "out", text: "  Restored src/OrderLambda/OrderLambda.csproj (in 934 ms)." },
  { kind: "info", text: "$ dotnet build -c Release --no-restore" },
  { kind: "out", text: "  HelloApi -> /workspace/src/HelloApi/bin/Release/net9.0/HelloApi.dll" },
  { kind: "out", text: "  OrderLambda -> /workspace/src/OrderLambda/bin/Release/net8.0/OrderLambda.dll" },
  { kind: "ok", text: "Build succeeded. 0 Warning(s)  0 Error(s)  Time Elapsed 00:00:04.11" },
];

const TEST_STREAM: LogLine[] = [
  { kind: "info", text: "$ dotnet test tests/HelloApi.Tests --logger \"console;verbosity=normal\"" },
  { kind: "out", text: "Starting test execution, please wait..." },
  { kind: "out", text: "  Passed SmokeTests.Addition_Works [3 ms]" },
  { kind: "out", text: "  Passed SmokeTests.City_IsNotEmpty(city: \"Paris\") [1 ms]" },
  { kind: "out", text: "  Passed SmokeTests.City_IsNotEmpty(city: \"Tokyo\") [1 ms]" },
  { kind: "info", text: "$ pytest python/tests -q" },
  { kind: "out", text: "..                                                                     [100%]" },
  { kind: "out", text: "1 passed in 0.08s" },
  { kind: "info", text: "$ node --test node/auth-lambda" },
  { kind: "out", text: "✔ returns 200 with echoed body (12.4ms)" },
  { kind: "ok", text: "All suites passed. Total: 5 passed, 0 failed." },
];

const colorFor = (k: LogLine["kind"]) =>
  k === "err" ? "text-destructive"
  : k === "ok" ? "text-[color:var(--success)]"
  : k === "info" ? "text-[color:var(--accent-cyan)]"
  : "text-foreground/85";

export function BuildPanel() {
  const [lines, setLines] = useState<LogLine[]>([
    { kind: "info", text: "Nova runner ready. Try Build or Test." },
  ]);
  const [busy, setBusy] = useState(false);

  const stream = async (batch: LogLine[]) => {
    setBusy(true);
    setLines((l) => [...l, ...batch.slice(0, 1)]);
    for (const line of batch.slice(1)) {
      await new Promise((r) => setTimeout(r, 180));
      setLines((l) => [...l, line]);
    }
    setBusy(false);
  };

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => stream(BUILD_STREAM)}>
          <Hammer className="size-3.5" /> Build
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => stream(TEST_STREAM)}>
          <TestTube2 className="size-3.5" /> Run Tests
        </Button>
        <Button size="sm" variant="secondary" disabled={busy}
          onClick={() => stream([{ kind: "info", text: "$ dotnet run --project src/HelloApi" },
            { kind: "out", text: "info: Microsoft.Hosting.Lifetime[14]" },
            { kind: "out", text: "      Now listening on: http://localhost:5000" },
            { kind: "ok", text: "Application started. Press Ctrl+C to shut down." }])}>
          <Play className="size-3.5" /> Run API
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setLines([])}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className={colorFor(l.kind)}>{l.text}</div>
        ))}
        {busy && <div className="mt-1 animate-pulse text-muted-foreground">▊</div>}
      </div>
    </div>
  );
}
