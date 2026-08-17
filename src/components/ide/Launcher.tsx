import { useMemo, useState } from "react";
import { Search, Boxes, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PracticeLanguage } from "@/lib/practice";

export type TemplateLanguage = "C#" | "Python" | "Node.js" | "JavaScript" | "TypeScript";

export type Template = {
  id: string;
  name: string;
  runtime: string;
  language: TemplateLanguage;
  description: string;
  tags: string[];
  kind?: "mcp-fastmcp" | "mcp-gradio" | "practice";
  practiceLanguage?: PracticeLanguage;
  entryPath?: string;
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
  { id: "practice-csharp", name: "Practice Code Problems", runtime: "net9.0", language: "C#",
    description: "A solution() stub plus an xUnit test file that grades it.",
    tags: ["practice", "problems", "tests", "interview"], kind: "practice",
    practiceLanguage: "csharp", entryPath: "src/Solution.cs" },

  { id: "python-mcp-fastmcp", name: "MCP Server with FastMCP", runtime: "python3.12", language: "Python",
    description: "@mcp.tool() server with a live localhost preview + inspector.",
    tags: ["mcp", "fastmcp", "server", "ai"], kind: "mcp-fastmcp", entryPath: "app/server.py" },
  { id: "python-mcp-gradio", name: "MCP Server with Gradio", runtime: "python3.12", language: "Python",
    description: "gr.Interface app launched with mcp_server=True.",
    tags: ["mcp", "gradio", "ui", "ai"], kind: "mcp-gradio", entryPath: "app/app.py" },
  { id: "practice-python", name: "Practice Code Problems", runtime: "python3.12", language: "Python",
    description: "A solution() stub plus a pytest file that grades it.",
    tags: ["practice", "problems", "pytest"], kind: "practice",
    practiceLanguage: "python", entryPath: "src/solution.py" },
  { id: "python-lambda", name: "Python AWS Lambda", runtime: "python3.12", language: "Python",
    description: "Python 3.12 handler with API Gateway event.", tags: ["lambda", "aws", "python"] },
  { id: "python-script", name: "Python CLI Script", runtime: "python3.12", language: "Python",
    description: "Argparse CLI with a tiny CSV ETL example.", tags: ["cli", "script", "python"] },

  { id: "practice-javascript", name: "Practice Code Problems", runtime: "nodejs20.x", language: "JavaScript",
    description: "A solution() stub plus a node:test file that grades it.",
    tags: ["practice", "problems", "tests"], kind: "practice",
    practiceLanguage: "javascript", entryPath: "src/solution.js" },
  { id: "node-lambda", name: "Node.js AWS Lambda", runtime: "nodejs20.x", language: "JavaScript",
    description: "ES module handler for API Gateway events.", tags: ["lambda", "aws", "node"] },
  { id: "node-server", name: "Node.js HTTP Server", runtime: "nodejs20.x", language: "JavaScript",
    description: "Zero-dependency http server on port 3000.", tags: ["server", "http", "node"] },

  { id: "practice-typescript", name: "Practice Code Problems", runtime: "tsx / vitest", language: "TypeScript",
    description: "A typed solution() stub plus a Vitest file that grades it.",
    tags: ["practice", "problems", "vitest"], kind: "practice",
    practiceLanguage: "typescript", entryPath: "src/solution.ts" },
];

const LANGUAGES: { id: TemplateLanguage; badge: string; blurb: string }[] = [
  { id: "C#", badge: "C#", blurb: ".NET 9 console, web API, Lambda & practice problems" },
  { id: "Python", badge: "PY", blurb: "MCP servers, Lambdas, scripts & practice problems" },
  { id: "JavaScript", badge: "JS", blurb: "Node 20 servers, Lambdas & practice problems" },
  { id: "TypeScript", badge: "TS", blurb: "Typed practice problems graded with Vitest" },
];

const langAccent: Record<TemplateLanguage, string> = {
  "C#": "text-[color:var(--accent-violet)] border-[color:var(--accent-violet)]/40",
  "Python": "text-warning border-warning/40",
  "Node.js": "text-[color:var(--success)] border-[color:var(--success)]/40",
  "JavaScript": "text-warning border-warning/40",
  "TypeScript": "text-[color:var(--accent-cyan)] border-[color:var(--accent-cyan)]/40",
};

const badgeFor = (l: TemplateLanguage) =>
  l === "TypeScript" ? "TS" : l === "JavaScript" || l === "Node.js" ? "JS" : l === "Python" ? "PY" : "C#";

export function Launcher({ onSelect }: { onSelect: (t: Template) => void }) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<TemplateLanguage | null>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = lang ? TEMPLATES.filter((t) => t.language === lang) : TEMPLATES;
    if (!s) return pool;
    return pool.filter((t) =>
      [t.name, t.description, t.language, t.runtime, ...t.tags].some((v) =>
        v.toLowerCase().includes(s),
      ),
    );
  }, [q, lang]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-background px-6 py-16 text-foreground">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-gradient-brand shadow-glow">
          <Boxes className="size-6 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {lang ? `Pick a ${lang} boilerplate` : "Create a new project"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang
            ? "Choose the starting point — we scaffold the files and wire up the runner."
            : "Start by choosing a language, or search every template."}
        </p>

        <div className="relative mt-8 w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects — try 'mcp', 'practice', 'lambda'…"
            className="h-12 w-full rounded-xl border border-border bg-panel pl-11 pr-4 text-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      {!lang && !q.trim() ? (
        <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className="group flex items-center gap-4 rounded-lg border border-border bg-panel px-4 py-4 text-left transition-all hover:border-primary/60 hover:bg-accent/30 hover:shadow-glow"
            >
              <div className={cn(
                "grid size-10 shrink-0 place-items-center rounded-md border bg-background text-xs font-semibold",
                langAccent[l.id],
              )}>
                {l.badge}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{l.id}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{l.blurb}</div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid w-full max-w-2xl gap-2">
          {lang && (
            <button
              onClick={() => setLang(null)}
              className="mb-1 flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> All languages
            </button>
          )}
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
                {badgeFor(t.language)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {t.runtime}
                  </span>
                  {t.kind && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      {t.kind === "practice" ? "graded" : "mcp"}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
