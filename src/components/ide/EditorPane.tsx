import Editor, { loader } from "@monaco-editor/react";
import { X } from "lucide-react";
import type { IdeFile } from "@/lib/ide-data";
import { cn } from "@/lib/utils";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs" },
});

type Props = {
  openFiles: IdeFile[];
  activePath: string;
  onSelect: (p: string) => void;
  onClose: (p: string) => void;
  onChange: (path: string, value: string) => void;
};

export function EditorPane({ openFiles, activePath, onSelect, onClose, onChange }: Props) {
  const active = openFiles.find((f) => f.path === activePath);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-0 overflow-x-auto border-b border-border bg-panel">
        {openFiles.map((f) => {
          const activeTab = f.path === activePath;
          return (
            <div
              key={f.path}
              className={cn(
                "group flex cursor-pointer items-center gap-2 border-r border-border px-3 py-2 text-xs",
                activeTab
                  ? "bg-background text-foreground border-t-2 border-t-primary"
                  : "text-muted-foreground hover:bg-accent/40",
              )}
              onClick={() => onSelect(f.path)}
            >
              <span className="font-mono">{f.path.split("/").pop()}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(f.path); }}
                className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1">
        {active ? (
          <Editor
            key={active.path}
            path={active.path}
            language={active.language}
            value={active.content}
            onChange={(v) => onChange(active.path, v ?? "")}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              minimap: { enabled: false },
              smoothScrolling: true,
              scrollBeyondLastLine: false,
              tabSize: 4,
              renderLineHighlight: "gutter",
              padding: { top: 12 },
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a file to start editing
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-panel px-3 py-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="text-[color:var(--success)]">● connected</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>{active?.language ?? "—"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Nova IDE v0.1</span>
        </div>
      </div>
    </div>
  );
}
