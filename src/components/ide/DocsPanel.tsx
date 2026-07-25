import { useState } from "react";
import { BookOpen, Copy, Check, ChevronRight } from "lucide-react";
import { DOC_SECTIONS } from "@/lib/ide-docs";
import { cn } from "@/lib/utils";

function CodeBlock({ code }: { code: { label: string; language: string; content: string } }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border bg-background/40 px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {code.label} · <span className="text-[color:var(--accent-cyan)]">{code.language}</span>
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(code.content); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-accent"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-auto p-3 font-mono text-[12px] leading-relaxed text-foreground/90">
        {code.content}
      </pre>
    </div>
  );
}

export function DocsPanel() {
  const [active, setActive] = useState(DOC_SECTIONS[0].id);
  const section = DOC_SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="grid h-full grid-cols-[240px_1fr] bg-background">
      <aside className="overflow-auto border-r border-border bg-panel py-3">
        <div className="mb-2 flex items-center gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <BookOpen className="size-3.5" /> Docs & CLAUDE Spec
        </div>
        {DOC_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60",
              s.id === active && "bg-accent text-accent-foreground border-l-2 border-primary",
            )}
          >
            <ChevronRight className="size-3 opacity-60" />
            <span className="truncate">{s.title.replace(/^[^—]+— /, "")}</span>
          </button>
        ))}
      </aside>
      <div className="overflow-auto">
        <article className="mx-auto max-w-3xl px-8 py-10">
          <div className="mb-2 text-xs uppercase tracking-wider text-[color:var(--accent-cyan)]">
            {section.id === "claude" ? "Specification" : "Guide"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{section.title}</h1>
          <p className="mt-3 text-base text-muted-foreground">{section.summary}</p>
          <div className="mt-6 whitespace-pre-wrap text-[14px] leading-7 text-foreground/90">
            {section.body}
          </div>
          {section.code?.map((c, i) => <CodeBlock key={i} code={c} />)}
          <div className="mt-10 flex justify-between border-t border-border pt-6 text-sm">
            {DOC_SECTIONS.findIndex((s) => s.id === active) > 0 ? (
              <button
                onClick={() => setActive(DOC_SECTIONS[DOC_SECTIONS.findIndex((s) => s.id === active) - 1].id)}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Previous
              </button>
            ) : <span />}
            {DOC_SECTIONS.findIndex((s) => s.id === active) < DOC_SECTIONS.length - 1 && (
              <button
                onClick={() => setActive(DOC_SECTIONS[DOC_SECTIONS.findIndex((s) => s.id === active) + 1].id)}
                className="text-primary hover:underline"
              >
                Next →
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
