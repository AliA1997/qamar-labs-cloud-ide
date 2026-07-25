import { useMemo } from "react";
import { FileCode2, FileText, FileJson, FileType2, Folder, FolderOpen } from "lucide-react";
import type { IdeFile } from "@/lib/ide-data";
import { cn } from "@/lib/utils";

type Node = {
  name: string;
  path: string;
  isDir: boolean;
  children: Node[];
  file?: IdeFile;
};

function build(files: IdeFile[]): Node {
  const root: Node = { name: "workspace", path: "", isDir: true, children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1;
      let next = cur.children.find((c) => c.name === part);
      if (!next) {
        next = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLeaf,
          children: [],
          file: isLeaf ? f : undefined,
        };
        cur.children.push(next);
      }
      cur = next;
    });
  }
  const sort = (n: Node) => {
    n.children.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

function iconFor(name: string) {
  if (name.endsWith(".cs")) return <FileCode2 className="size-3.5 text-[color:var(--accent-violet)]" />;
  if (name.endsWith(".csproj") || name.endsWith(".sln")) return <FileType2 className="size-3.5 text-[color:var(--accent-cyan)]" />;
  if (name.endsWith(".json")) return <FileJson className="size-3.5 text-warning" />;
  if (name.endsWith(".md")) return <FileText className="size-3.5 text-muted-foreground" />;
  return <FileText className="size-3.5 text-muted-foreground" />;
}

function Row({
  node, depth, activePath, onOpen,
}: { node: Node; depth: number; activePath: string; onOpen: (f: IdeFile) => void }) {
  if (node.isDir) {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground"
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          {depth === 0 ? <FolderOpen className="size-3.5" /> : <Folder className="size-3.5" />}
          <span className="font-medium tracking-wide uppercase">{node.name}</span>
        </div>
        {node.children.map((c) => (
          <Row key={c.path} node={c} depth={depth + 1} activePath={activePath} onOpen={onOpen} />
        ))}
      </div>
    );
  }
  const active = node.path === activePath;
  return (
    <button
      onClick={() => node.file && onOpen(node.file)}
      className={cn(
        "flex w-full items-center gap-1.5 px-2 py-1 text-left text-[13px] transition-colors",
        "hover:bg-accent/60",
        active && "bg-accent text-accent-foreground border-l-2 border-primary",
      )}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      {iconFor(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({
  files, activePath, onOpen,
}: { files: IdeFile[]; activePath: string; onOpen: (f: IdeFile) => void }) {
  const tree = useMemo(() => build(files), [files]);
  return (
    <div className="h-full overflow-auto bg-panel py-2">
      {tree.children.map((c) => (
        <Row key={c.path} node={c} depth={0} activePath={activePath} onOpen={onOpen} />
      ))}
    </div>
  );
}
