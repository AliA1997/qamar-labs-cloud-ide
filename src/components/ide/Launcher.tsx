import { useMemo, useState } from "react";
import { Search, Boxes, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Template = {
  id: string;
  name: string;
  runtime: string;
  language: "C#" | "Python" | "Node.js";
  description: string;
  tags: string[];
};

export const TEMPLATES: Template[] = [
  { id: "dotnet-console", name: ".NET Console App", runtime: "net9.0", language: "C#",
    description: "Minimal top-level Program.cs console app.", tags: ["console", "dotnet", "cli"] },
  { id: "dotnet-webapi", name: "ASP.NET Core Web API", runtime: "net9.0", language: "C#",
    description: "Minimal API with sample endpoints and OpenAPI.", tags: ["web", "api", "dotnet"] },
  { id: "dotnet-lambda", name: ".NET AWS Lambda", runtime: "dotnet8", language: "C#",
    description: "API Gateway proxy Lambda in C#.", tags: ["lambda", "aws", "serverless"] },
  { id: "dotnet-xunit", name: "xUnit Test Project", runtime: "net9.0", language: "C#",
    description: "Ready-to-run xUnit test suite.", tags: ["tests", "xunit"] },
  { id: "python-lambda", name: "Python AWS Lambda", runtime: "python3.12", language: "Python",
    description: "Python 3.12 handler with API Gateway event.", tags: ["lambda", "aws", "python"] },
  { id: "python-script", name: "Python CLI Script", runtime: "python3.12", language: "Python",
    description: "Argparse CLI with a tiny CSV ETL example.", tags: ["cli", "script", "python"] },
  { id: "node-lambda", name: "Node.js AWS Lambda", runtime: "nodejs20.x", language: "Node.js",
    description: "ES module handler for API Gateway events.", tags: ["lambda", "aws", "node"] },
  { id: "node-server", name: "Node.js HTTP Server", runtime: "nodejs20.x", language: "Node.js",
    description: "Zero-dependency http server on port 3000.", tags: ["server", "http", "node"] },
];

const langAccent: Record<Template["language"], string> = {
  "C#": "text-[color:var(--accent-violet)] border-[color:var(--accent-violet)]/40",
  "Python": "text-warning border-warning/40",
  "Node.js": "text-[color:var(--success)] border-[color:var(--success)]/40",
};

export function Launcher({ onSelect }: { onSelect: (t: Template) => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TEMPLATES;
    return TEMPLATES.filter((t) =>
      [t.name, t.description, t.language, t.runtime, ...t.tags].some((v) =>
        v.toLowerCase().includes(s),
      ),
    );
  }, [q]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-background px-6 py-16 text-foreground">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-gradient-brand shadow-glow">
          <Boxes className="size-6 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Create a new project</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search a template to spin up a fresh workspace in Nova IDE.
        </p>

        <div className="relative mt-8 w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects — try 'console', 'lambda', 'python'…"
            className="h-12 w-full rounded-xl border border-border bg-panel pl-11 pr-4 text-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-8 grid w-full max-w-2xl gap-2">
        {results.length === 0 && (
          <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-muted-foreground">
            No templates match “{q}”.
          </div>
        )}
        {results.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={cn(
              "group flex items-center gap-4 rounded-lg border border-border bg-panel px-4 py-3 text-left transition-all",
              "hover:border-primary/60 hover:bg-accent/30 hover:shadow-glow",
            )}
          >
            <div className={cn(
              "grid size-10 shrink-0 place-items-center rounded-md border bg-background text-xs font-semibold",
              langAccent[t.language],
            )}>
              {t.language === "Node.js" ? "JS" : t.language === "Python" ? "PY" : "C#"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t.name}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {t.runtime}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}
