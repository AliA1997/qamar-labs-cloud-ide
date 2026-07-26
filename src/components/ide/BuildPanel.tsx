import { useEffect, useRef, useState } from "react";
import { Play, TestTube2, Hammer, Trash2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Template } from "./Launcher";
import type { IdeFile } from "@/lib/ide-data";
import { simulateCsharpConsole } from "@/lib/csharp-sim";

type LogLine = { kind: "out" | "err" | "info" | "ok"; text: string };

const BUILD_STREAM: LogLine[] = [
  { kind: "info", text: "$ dotnet restore" },
  { kind: "out", text: "  Determining projects to restore..." },
  { kind: "out", text: "  Restored project (in 812 ms)." },
  { kind: "info", text: "$ dotnet build -c Release --no-restore" },
  { kind: "ok", text: "Build succeeded. 0 Warning(s)  0 Error(s)  Time Elapsed 00:00:04.11" },
];

const TEST_STREAM: LogLine[] = [
  { kind: "info", text: "$ dotnet test" },
  { kind: "out", text: "Starting test execution, please wait..." },
  { kind: "out", text: "  Passed SmokeTests.Addition_Works [3 ms]" },
  { kind: "out", text: "  Passed SmokeTests.City_IsNotEmpty(city: \"Paris\") [1 ms]" },
  { kind: "ok", text: "Passed! - Failed: 0, Passed: 3, Skipped: 0" },
];

type RunProfile = {
  label: string;
  runLabel: string;
  build: LogLine[];
  test: LogLine[];
  run: LogLine[];
  runKeepAlive?: boolean; // whether the run process stays alive until stopped
  stopLine?: LogLine;
};

function profileFor(t: Template, files: IdeFile[]): RunProfile {
  switch (t.id) {
    case "dotnet-console": {
      const program = files.find((f) => f.path.endsWith("Program.cs"));
      const sim = program ? simulateCsharpConsole(program.content) : { output: ["(no Program.cs found)"], ok: true as const };
      const runLines: LogLine[] = [
        { kind: "info", text: "$ dotnet run --project src/ConsoleApp" },
        ...sim.output.map((line): LogLine => ({ kind: "out", text: line })),
        { kind: sim.ok ? "ok" : "err", text: sim.ok ? "Process exited with code 0" : `Process exited with code 1: ${sim.error ?? ""}` },
      ];
      return {
        label: ".NET Console",
        runLabel: "Run Console",
        build: BUILD_STREAM,
        test: TEST_STREAM,
        run: runLines,
      };
    }
    case "dotnet-webapi":
      return {
        label: "ASP.NET Core",
        runLabel: "Run Web API",
        build: BUILD_STREAM,
        test: TEST_STREAM,
        runKeepAlive: true,
        run: [
          { kind: "info", text: "$ dotnet run --project src/HelloApi" },
          { kind: "out", text: "info: Microsoft.Hosting.Lifetime[14]" },
          { kind: "out", text: "      Now listening on: http://localhost:5000" },
          { kind: "out", text: "info: Microsoft.Hosting.Lifetime[0]" },
          { kind: "out", text: "      Application started. Press Ctrl+C to shut down." },
        ],
        stopLine: { kind: "err", text: "Application is shutting down... (SIGINT)" },
      };
    case "dotnet-lambda":
      return {
        label: ".NET Lambda",
        runLabel: "Invoke Locally",
        build: BUILD_STREAM,
        test: TEST_STREAM,
        run: [
          { kind: "info", text: "$ dotnet lambda invoke-function OrderLambda" },
          { kind: "out", text: "{\"ok\":true,\"receivedAt\":\"2026-07-26T04:12:00Z\"}" },
          { kind: "ok", text: "Duration: 142.11 ms  Billed: 143 ms  Memory: 128 MB" },
        ],
      };
    case "dotnet-xunit":
      return {
        label: "xUnit",
        runLabel: "Run Tests",
        build: BUILD_STREAM,
        test: TEST_STREAM,
        run: TEST_STREAM,
      };
    case "python-lambda":
      return {
        label: "Python Lambda",
        runLabel: "Invoke Locally",
        build: [
          { kind: "info", text: "$ pip install -r python/report_lambda/requirements.txt" },
          { kind: "ok", text: "Successfully installed boto3 pydantic requests" },
        ],
        test: [
          { kind: "info", text: "$ pytest python/tests -q" },
          { kind: "out", text: ".                                                                     [100%]" },
          { kind: "ok", text: "1 passed in 0.08s" },
        ],
        run: [
          { kind: "info", text: "$ python -c 'from report_lambda.handler import handler; ...'" },
          { kind: "out", text: "[INFO] POST /orders" },
          { kind: "out", text: "{\"ok\": true, \"runtime\": \"python3.12\"}" },
          { kind: "ok", text: "Exit code 0" },
        ],
      };
    case "python-script":
      return {
        label: "Python",
        runLabel: "Run Script",
        build: [{ kind: "ok", text: "No build step required for Python." }],
        test: [
          { kind: "info", text: "$ pytest -q" },
          { kind: "ok", text: "no tests ran in 0.02s" },
        ],
        run: [
          { kind: "info", text: "$ python python/scripts/etl.py --source fixtures/orders.csv" },
          { kind: "out", text: "rows=1284 total=48219.55 avg=37.55" },
          { kind: "ok", text: "Exit code 0 · 0.42s" },
        ],
      };
    case "node-lambda":
      return {
        label: "Node.js Lambda",
        runLabel: "Invoke Locally",
        build: [
          { kind: "info", text: "$ npm install" },
          { kind: "ok", text: "added 24 packages in 3s" },
        ],
        test: [
          { kind: "info", text: "$ node --test node/auth-lambda" },
          { kind: "out", text: "✔ returns 200 with echoed body (12.4ms)" },
          { kind: "ok", text: "tests 1  pass 1  fail 0" },
        ],
        run: [
          { kind: "info", text: "$ node -e 'import(\"./node/auth-lambda/index.js\").then(m => m.handler(...))'" },
          { kind: "out", text: "POST /login" },
          { kind: "out", text: "{\"ok\":true,\"runtime\":\"node20.11.1\"}" },
          { kind: "ok", text: "Exit code 0" },
        ],
      };
    case "node-server":
      return {
        label: "Node.js Server",
        runLabel: "Run Server",
        build: [
          { kind: "info", text: "$ npm install" },
          { kind: "ok", text: "up to date" },
        ],
        test: [
          { kind: "info", text: "$ node --test" },
          { kind: "ok", text: "no test files found" },
        ],
        runKeepAlive: true,
        run: [
          { kind: "info", text: "$ node node/scripts/server.js" },
          { kind: "out", text: "listening on http://localhost:3000" },
          { kind: "out", text: "GET / 200 4ms" },
          { kind: "out", text: "GET /health 200 1ms" },
        ],
        stopLine: { kind: "err", text: "^C — server stopped (SIGINT)" },
      };
    default:
      return {
        label: "Runner",
        runLabel: "Run",
        build: BUILD_STREAM,
        test: TEST_STREAM,
        run: [{ kind: "ok", text: "Nothing to run." }],
      };
  }
}

const colorFor = (k: LogLine["kind"]) =>
  k === "err" ? "text-destructive"
  : k === "ok" ? "text-[color:var(--success)]"
  : k === "info" ? "text-[color:var(--accent-cyan)]"
  : "text-foreground/85";

export function BuildPanel({ template }: { template: Template }) {
  const profile = profileFor(template);
  const [lines, setLines] = useState<LogLine[]>([
    { kind: "info", text: `Nova runner ready for ${profile.label}. Try Build or ${profile.runLabel}.` },
  ]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    // reset on template change
    cancelRef.current = true;
    setBusy(false);
    setRunning(false);
    setLines([
      { kind: "info", text: `Nova runner ready for ${profile.label}. Try Build or ${profile.runLabel}.` },
    ]);
  }, [template.id, profile.label, profile.runLabel]);

  const stream = async (batch: LogLine[], opts?: { keepAlive?: boolean }) => {
    cancelRef.current = false;
    setBusy(true);
    if (opts?.keepAlive) setRunning(true);
    for (const line of batch) {
      if (cancelRef.current) break;
      await new Promise((r) => setTimeout(r, 180));
      if (cancelRef.current) break;
      setLines((l) => [...l, line]);
    }
    setBusy(false);
    if (!opts?.keepAlive) setRunning(false);
  };

  const stop = () => {
    cancelRef.current = true;
    setBusy(false);
    setRunning(false);
    setLines((l) => [
      ...l,
      profile.stopLine ?? { kind: "err", text: "^C — process terminated" },
    ]);
  };

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button size="sm" variant="secondary" disabled={busy || running} onClick={() => stream(profile.build)}>
          <Hammer className="size-3.5" /> Build
        </Button>
        <Button size="sm" variant="secondary" disabled={busy || running} onClick={() => stream(profile.test)}>
          <TestTube2 className="size-3.5" /> Test
        </Button>
        {running ? (
          <Button size="sm" variant="destructive" onClick={stop}>
            <Square className="size-3.5" /> Stop
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => stream(profile.run, { keepAlive: profile.runKeepAlive })}
          >
            <Play className="size-3.5" /> {profile.runLabel}
          </Button>
        )}
        <div className="flex-1" />
        {running && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--success)]" />
            running
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setLines([])}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className={colorFor(l.kind)}>{l.text}</div>
        ))}
        {(busy || running) && <div className="mt-1 animate-pulse text-muted-foreground">▊</div>}
      </div>
    </div>
  );
}
