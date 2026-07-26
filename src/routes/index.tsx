import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Code2, Zap, BookOpen, Terminal, Save, GitBranch, Boxes, ArrowLeft } from "lucide-react";
import { filesForTemplate, type IdeFile } from "@/lib/ide-data";
import { FileTree } from "@/components/ide/FileTree";
import { EditorPane } from "@/components/ide/EditorPane";
import { BuildPanel } from "@/components/ide/BuildPanel";
import { LambdaTester } from "@/components/ide/LambdaTester";
import { DocsPanel } from "@/components/ide/DocsPanel";
import { Launcher, type Template } from "@/components/ide/Launcher";
import { CreatingScreen } from "@/components/ide/CreatingScreen";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova IDE — Create a .NET, Python or Node.js Project" },
      { name: "description", content: "Search a template, spin up a workspace, and start coding in Nova IDE — the in-browser IDE for .NET, Python and Node.js." },
      { property: "og:title", content: "Nova IDE — Create a .NET, Python or Node.js Project" },
      { property: "og:description", content: "Search a template, spin up a workspace, and start coding in Nova IDE — the in-browser IDE for .NET, Python and Node.js." },
    ],
  }),
  component: NovaIde,
});

type TopTab = "editor" | "lambda" | "docs";
type Phase =
  | { step: "launcher" }
  | { step: "creating"; template: Template }
  | { step: "ide"; template: Template; files: IdeFile[] };

function NovaIde() {
  const [phase, setPhase] = useState<Phase>({ step: "launcher" });

  if (phase.step === "launcher") {
    return <Launcher onSelect={(t) => setPhase({ step: "creating", template: t })} />;
  }
  if (phase.step === "creating") {
    return (
      <CreatingScreen
        template={phase.template}
        onDone={() =>
          setPhase({
            step: "ide",
            template: phase.template,
            files: filesForTemplate(phase.template.id),
          })
        }
      />
    );
  }

  return (
    <IdeWorkspace
      template={phase.template}
      initialFiles={phase.files}
      onExit={() => setPhase({ step: "launcher" })}
    />
  );
}

function IdeWorkspace({
  template, initialFiles, onExit,
}: { template: Template; initialFiles: IdeFile[]; onExit: () => void }) {
  const [files, setFiles] = useState<IdeFile[]>(initialFiles);
  const [openPaths, setOpenPaths] = useState<string[]>(
    initialFiles[0] ? [initialFiles[0].path] : [],
  );
  const [activePath, setActivePath] = useState(initialFiles[0]?.path ?? "");
  const [tab, setTab] = useState<TopTab>("editor");

  const openFiles = openPaths
    .map((p) => files.find((f) => f.path === p))
    .filter((x): x is IdeFile => Boolean(x));

  const openFile = (f: IdeFile) => {
    setOpenPaths((prev) => (prev.includes(f.path) ? prev : [...prev, f.path]));
    setActivePath(f.path);
    setTab("editor");
  };
  const closeFile = (p: string) => {
    setOpenPaths((prev) => {
      const next = prev.filter((x) => x !== p);
      if (activePath === p && next.length) setActivePath(next[next.length - 1]);
      return next;
    });
  };
  const changeFile = (p: string, v: string) => {
    setFiles((prev) => prev.map((f) => (f.path === p ? { ...f, content: v } : f)));
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2">
        <button
          onClick={onExit}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          title="New project"
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-gradient-brand shadow-glow">
            <Boxes className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{template.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {template.language} · {template.runtime}
            </div>
          </div>
        </div>
        <div className="mx-3 h-6 w-px bg-border" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <GitBranch className="size-3.5" />
          <span className="font-mono">main</span>
        </div>

        <nav className="ml-6 flex items-center gap-1">
          {([
            { id: "editor", icon: Code2, label: "Editor" },
            { id: "lambda", icon: Zap, label: "Lambda Tester" },
            { id: "docs", icon: BookOpen, label: "Docs / CLAUDE" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                tab === t.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-accent">
            <Save className="size-3.5" /> Save all
          </button>
          <div className="hidden items-center gap-1 rounded-md bg-secondary px-2 py-1 md:flex">
            <span className="size-1.5 rounded-full bg-[color:var(--success)]" />
            Runner online
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {tab === "editor" && (
          <div className="grid h-full grid-cols-[240px_1fr]">
            <aside className="min-h-0 border-r border-border">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Explorer
              </div>
              <FileTree files={files} activePath={activePath} onOpen={openFile} />
            </aside>
            <div className="grid min-h-0 grid-rows-[1fr_260px]">
              <EditorPane
                openFiles={openFiles}
                activePath={activePath}
                onSelect={setActivePath}
                onClose={closeFile}
                onChange={changeFile}
              />
              <div className="min-h-0 border-t border-border">
                <div className="flex items-center gap-4 border-b border-border bg-panel px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground">
                    <Terminal className="size-3.5" /> Runner
                  </span>
                  <span>Problems</span>
                  <span>Output</span>
                </div>
                <div className="h-[calc(100%-30px)]">
                  <BuildPanel template={template} files={files} />
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "lambda" && <LambdaTester />}
        {tab === "docs" && <DocsPanel />}
      </div>
    </div>
  );
}
