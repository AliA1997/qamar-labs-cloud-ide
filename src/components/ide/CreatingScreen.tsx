import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { Template } from "./Launcher";
import { cn } from "@/lib/utils";

const stepsFor = (t: Template) => [
  `Resolving ${t.name} template`,
  `Provisioning ${t.runtime} runtime`,
  "Scaffolding project files",
  "Restoring dependencies",
  "Warming up Nova IDE",
];

export function CreatingScreen({ template, onDone }: { template: Template; onDone: () => void }) {
  const steps = stepsFor(template);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= steps.length) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 550);
    return () => clearTimeout(t);
  }, [idx, steps.length, onDone]);

  const pct = Math.min(100, Math.round((idx / steps.length) * 100));

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-gradient-brand shadow-glow">
            <Loader2 className="size-5 animate-spin text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Creating project</div>
            <div className="text-base font-semibold">{template.name}</div>
          </div>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-brand transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-2">
          {steps.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li key={s} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-accent/40 text-foreground" : done ? "text-foreground" : "text-muted-foreground",
              )}>
                {done ? (
                  <Check className="size-4 text-[color:var(--success)]" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <span className="size-4 rounded-full border border-border" />
                )}
                <span>{s}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
