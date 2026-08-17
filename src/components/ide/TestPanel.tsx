import { useEffect, useState } from "react";
import { Check, X, FlaskConical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runTests, type PracticeLanguage, type TestOutcome } from "@/lib/practice";
import { cn } from "@/lib/utils";

type Props = {
  language: PracticeLanguage;
  source: string;
  testFile: string;
  runToken: number;
};

const CMD: Record<PracticeLanguage, string> = {
  javascript: "$ node --test tests/",
  typescript: "$ vitest run",
  python: "$ pytest tests -q",
  csharp: "$ dotnet test",
};

export function TestPanel({ language, source, testFile, runToken }: Props) {
  const [result, setResult] = useState<{
    outcomes: TestOutcome[]; logs: string[]; error?: string; durationMs: number;
  } | null>(null);

  const run = () => setResult(runTests(language, source));

  useEffect(() => {
    setResult(runTests(language, source));
    // Re-grade on every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken, language]);

  const passed = result?.outcomes.filter((o) => o.pass).length ?? 0;
  const total = result?.outcomes.length ?? 0;
  const allPass = total > 0 && passed === total;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <FlaskConical className="size-3.5 text-primary" />
        <span className="font-mono text-[11px] text-muted-foreground">{CMD[language]}</span>
        <span className="text-[11px] text-muted-foreground">· {testFile}</span>
        <div className="flex-1" />
        {result && (
          <span className={cn("text-[11px]", allPass ? "text-[color:var(--success)]" : "text-destructive")}>
            {passed}/{total} passing · {result.durationMs}ms
          </span>
        )}
        <Button size="sm" variant="secondary" onClick={run}>
          <Play className="size-3.5" /> Run tests
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px]">
        {result?.error && (
          <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
            {result.error}
          </div>
        )}
        {result?.logs.map((l, i) => (
          <div key={`log-${i}`} className="text-muted-foreground">stdout: {l}</div>
        ))}
        {result?.outcomes.map((o) => (
          <div key={o.name} className="mt-1 flex items-start gap-2">
            {o.pass ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-[color:var(--success)]" />
            ) : (
              <X className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <div className={o.pass ? "text-foreground/85" : "text-destructive"}>{o.name}</div>
              {!o.pass && (
                <div className="text-[11px] text-muted-foreground">
                  expected {o.expected} · received {o.actual}
                </div>
              )}
            </div>
          </div>
        ))}
        {result && (
          <div className={cn("mt-3", allPass ? "text-[color:var(--success)]" : "text-destructive")}>
            {allPass
              ? `Passed! - Failed: 0, Passed: ${passed}, Skipped: 0`
              : `Failed! - Failed: ${total - passed}, Passed: ${passed}, Skipped: 0`}
          </div>
        )}
      </div>
    </div>
  );
}
