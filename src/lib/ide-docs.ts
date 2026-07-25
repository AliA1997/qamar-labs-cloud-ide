export type DocSection = {
  id: string;
  title: string;
  summary: string;
  body: string;
  code?: { language: string; label: string; content: string }[];
};

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Overview — Anatomy of a Browser IDE",
    summary:
      "Every browser IDE is 6 layers: shell, file model, editor, language services, runtime, and collaboration.",
    body: `A modern IDE breaks down into six replaceable layers. When you write a
CLAUDE.md spec for building one, describe each layer independently so the
implementation agent can swap pieces without redesigning everything.

1. **Shell** — menus, tabs, panels, command palette, keybindings.
2. **File model** — an in-memory FS backed by IndexedDB, OPFS, git, or a remote API.
3. **Editor** — text buffer, cursors, selections, syntax highlighting.
4. **Language services** — LSP client, diagnostics, hover, completion, formatting.
5. **Runtime** — how code actually runs: WebContainers, remote sandbox, Wasm, or a real VM.
6. **Collaboration** — CRDT sync, presence, comments.

CLAUDE spec tip: list each layer with an explicit "responsibilities /
non-goals / interfaces" block so the agent doesn't blur boundaries.`,
    code: [
      {
        language: "markdown",
        label: "CLAUDE.md skeleton",
        content: `# CLAUDE.md — Nova IDE

## Goal
Ship a browser IDE for .NET + Lambda projects.

## Layers
- shell/          UI chrome, panels, palette
- fs/             virtual file system (OPFS + IndexedDB)
- editor/         Monaco integration
- lsp/            OmniSharp bridge over WebSocket
- runtime/        remote build runner + local Lambda mock
- collab/         Yjs CRDT + WebRTC provider

## Rules
- Never block the main thread > 16ms.
- All FS ops go through fs/ — no direct IndexedDB calls elsewhere.
- LSP messages are typed with vscode-languageserver-protocol.
`,
      },
    ],
  },
  {
    id: "monaco",
    title: "Editor Option 1 — Monaco (VS Code's editor)",
    summary:
      "The exact editor that powers VS Code. Best for TypeScript, C#, JSON. Heavy (~3MB) but batteries-included.",
    body: `Monaco is the reference choice when you need a "feels like VS Code"
experience. It ships built-in TypeScript, JSON, CSS, HTML services and
integrates with any LSP through monaco-languageclient.

**Strengths:** first-class TS/JS, rich decorations, diff editor, minimap.
**Weaknesses:** large bundle, awkward SSR, Web Worker setup on Vite.`,
    code: [
      {
        language: "tsx",
        label: "React + Monaco",
        content: `import Editor from "@monaco-editor/react";

export function CodePane({ path, value, onChange }: Props) {
  return (
    <Editor
      height="100%"
      path={path}
      defaultLanguage="csharp"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme="vs-dark"
      options={{
        fontSize: 13,
        fontFamily: "JetBrains Mono",
        minimap: { enabled: false },
        smoothScrolling: true,
        tabSize: 4,
      }}
    />
  );
}`,
      },
      {
        language: "ts",
        label: "Register an LSP client",
        content: `import { MonacoLanguageClient } from "monaco-languageclient";
import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from "vscode-ws-jsonrpc";

const socket = new WebSocket("wss://lsp.nova.dev/omnisharp");
socket.onopen = () => {
  const s = toSocket(socket);
  const client = new MonacoLanguageClient({
    name: "OmniSharp",
    clientOptions: { documentSelector: ["csharp"] },
    connectionProvider: {
      get: () => Promise.resolve({
        reader: new WebSocketMessageReader(s),
        writer: new WebSocketMessageWriter(s),
      }),
    },
  });
  client.start();
};`,
      },
    ],
  },
  {
    id: "codemirror",
    title: "Editor Option 2 — CodeMirror 6",
    summary:
      "Modular, tree-shakable, mobile-friendly. Perfect when bundle size matters.",
    body: `CodeMirror 6 is a set of packages you compose. Bundle can be as small as
~80 KB. Extensions cover syntax, linting, folding, autocompletion. No
built-in LSP — wire your own with codemirror-languageserver.`,
    code: [
      {
        language: "ts",
        label: "Minimal CM6 setup",
        content: `import { EditorView, basicSetup } from "codemirror";
import { csharp } from "@replit/codemirror-lang-csharp";
import { oneDark } from "@codemirror/theme-one-dark";

new EditorView({
  doc: initialCode,
  parent: hostEl,
  extensions: [basicSetup, csharp(), oneDark],
});`,
      },
    ],
  },
  {
    id: "ace",
    title: "Editor Option 3 — Ace",
    summary:
      "The classic (Cloud9). Lightweight, ~100 languages, but aging API.",
    body: `Ace is battle-tested and tiny. Great for read-only viewers, playgrounds,
and legacy embeds. Weak LSP story — use only when you need something
that just works today.`,
    code: [
      {
        language: "html",
        label: "Drop-in Ace",
        content: `<div id="editor" style="height:400px">let x = 1;</div>
<script src="https://cdn.jsdelivr.net/npm/ace-builds/src-min-noconflict/ace.js"></script>
<script>
  const editor = ace.edit("editor");
  editor.setTheme("ace/theme/dracula");
  editor.session.setMode("ace/mode/csharp");
</script>`,
      },
    ],
  },
  {
    id: "runtime",
    title: "Runtime — Running Code in the Browser",
    summary:
      "WebContainers for Node, Pyodide for Python, and remote runners for .NET / JVM / native.",
    body: `The browser cannot run .NET SDK builds directly (no process spawning,
no filesystem, no NuGet resolver). Options:

- **WebContainers (StackBlitz)** — full Node.js in-browser. No .NET.
- **Pyodide / Ruby.wasm** — language VMs compiled to Wasm.
- **Blazor WebAssembly** — runs .NET assemblies, but not \`dotnet build\`.
- **Remote runner** — Firecracker/Docker VM that exposes build+run over WebSocket. This is how CodeSandbox, Gitpod, GitHub Codespaces, and Replit ship .NET.

For Nova IDE, .NET builds and \`dotnet test\` go through a remote runner.
Only Lambda handlers are executed locally against a mocked API Gateway
event so you get instant feedback.`,
    code: [
      {
        language: "ts",
        label: "Remote build over WebSocket",
        content: `const ws = new WebSocket("wss://runner.nova.dev/build");
ws.onopen = () => ws.send(JSON.stringify({
  cmd: "dotnet",
  args: ["test", "tests/HelloApi.Tests"],
  cwd: "/workspace",
}));
ws.onmessage = (e) => appendTerminal(e.data);`,
      },
      {
        language: "ts",
        label: "WebContainers boot",
        content: `import { WebContainer } from "@webcontainer/api";
const wc = await WebContainer.boot();
await wc.mount(files);
const proc = await wc.spawn("npm", ["test"]);
proc.output.pipeTo(new WritableStream({ write: (c) => term.write(c) }));`,
      },
    ],
  },
  {
    id: "dotnet",
    title: ".NET Support — What to Build",
    summary:
      "Parse .csproj/.sln, drive the SDK on a runner, surface diagnostics via OmniSharp/Roslyn.",
    body: `Concrete build order for the .NET side:

1. **Project model** — parse \`.sln\` and each \`.csproj\` (they're MSBuild XML).
2. **Restore & build** — call \`dotnet restore\` then \`dotnet build\` on the runner. Stream stdout/stderr into a terminal panel.
3. **Diagnostics** — attach OmniSharp or Roslyn LSP; forward \`textDocument/publishDiagnostics\` to Monaco markers.
4. **Test** — run \`dotnet test --logger "trx"\`, parse TRX, render pass/fail tree.
5. **Debug** — the Debug Adapter Protocol (\`vsdbg\`) tunneled through a WebSocket, wired to Monaco's debug UI.

CLAUDE spec tip: define the wire format between IDE and runner (JSON
envelope with \`id / cmd / stream / exitCode\`) up front so agents don't
reinvent it per feature.`,
    code: [
      {
        language: "ts",
        label: "Parse .csproj target framework",
        content: `import { XMLParser } from "fast-xml-parser";
export function readTfm(csprojXml: string): string {
  const p = new XMLParser({ ignoreAttributes: false }).parse(csprojXml);
  const group = p.Project.PropertyGroup;
  return (Array.isArray(group) ? group[0] : group).TargetFramework;
}`,
      },
      {
        language: "json",
        label: "Runner protocol envelope",
        content: `{
  "id": "req_01H...",
  "cmd": "dotnet",
  "args": ["build", "src/HelloApi"],
  "cwd": "/workspace",
  "env": { "DOTNET_CLI_TELEMETRY_OPTOUT": "1" }
}`,
      },
    ],
  },
  {
    id: "lambda",
    title: "AWS Lambda Testing",
    summary:
      "Invoke handlers with synthetic events; mirror the AWS Lambda runtime contract.",
    body: `Two levels of Lambda testing you can offer in-IDE:

- **Local mock** — call the handler in a container with a synthetic event payload (API Gateway, S3, SQS, EventBridge). Fastest feedback loop.
- **Live invoke** — sign a request against \`lambda:InvokeFunction\` using the user's AWS credentials, so real IAM, VPC and layer behavior applies.

The tester panel in Nova IDE supports both. Under the hood it uses the
official AWS SDK v3 for live calls; the local mock runs the handler
inside the same runner that builds the project.`,
    code: [
      {
        language: "ts",
        label: "Live invoke with AWS SDK v3",
        content: `import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
const client = new LambdaClient({ region: "us-east-1" });
const res = await client.send(new InvokeCommand({
  FunctionName: "order-lambda-prod",
  Payload: new TextEncoder().encode(JSON.stringify(event)),
}));
const body = new TextDecoder().decode(res.Payload);`,
      },
      {
        language: "csharp",
        label: "Local handler contract",
        content: `public async Task<APIGatewayProxyResponse> Handler(
    APIGatewayProxyRequest request,
    ILambdaContext context)
{
    context.Logger.LogInformation($"{request.HttpMethod} {request.Path}");
    return new APIGatewayProxyResponse { StatusCode = 200, Body = "{\\"ok\\":true}" };
}`,
      },
    ],
  },
  {
    id: "fs",
    title: "Virtual File System",
    summary:
      "OPFS for durable files, IndexedDB for metadata, isomorphic-git for history.",
    body: `The IDE needs a filesystem it fully controls: Origin Private File System
(OPFS) gives you real files with sync-ish access from a worker.
IndexedDB stores project metadata (open tabs, cursor positions). Wrap
both behind a single \`Fs\` interface — that's the seam you'll test.`,
    code: [
      {
        language: "ts",
        label: "OPFS write",
        content: `const root = await navigator.storage.getDirectory();
const dir = await root.getDirectoryHandle("workspace", { create: true });
const file = await dir.getFileHandle("Program.cs", { create: true });
const w = await file.createWritable();
await w.write(source);
await w.close();`,
      },
    ],
  },
  {
    id: "claude",
    title: "Writing the CLAUDE.md",
    summary:
      "A tight spec beats a long one. Contract > prose. Examples > adjectives.",
    body: `When you turn this documentation into a CLAUDE specification for an
agent to implement, follow these rules:

- **One goal statement.** No paragraphs.
- **Explicit non-goals.** "No debugger in v1." "No JVM." "No offline builds."
- **Layer contracts.** Every layer lists its inputs, outputs, and forbidden imports.
- **File tree.** Fix the folder names so agents don't rename them mid-task.
- **Golden path.** One end-to-end user journey the agent must never break.
- **Test seeds.** Provide 3–5 sample events / requests / files the agent must keep green.

The sample below is the exact template the Nova IDE team uses.`,
    code: [
      {
        language: "markdown",
        label: "CLAUDE.md — full example",
        content: `# CLAUDE.md — Nova IDE

## Goal
A browser IDE that edits, builds, and tests .NET 8/9 projects and
invokes AWS Lambda handlers.

## Non-goals (v1)
- No native debugger.
- No Windows-only project types (WinForms, WPF).
- No offline builds.

## Layers
### fs/
Owns: files, directories, watch events.
Exports: \`Fs\` interface { read, write, list, watch }.
Forbidden: direct calls to IndexedDB or OPFS from anywhere else.

### editor/
Owns: Monaco integration, tab state, cursor persistence.
Exports: \`<EditorHost/>\`, \`useEditor()\`.
Forbidden: knowledge of .NET or Lambda.

### runtime/
Owns: remote build runner client, terminal streaming.
Exports: \`runCommand(cmd, args)\`, \`streamLogs(id)\`.
Wire format: see \`docs/runner-protocol.md\`.

## Golden path
1. User opens \`src/HelloApi/Program.cs\`.
2. Saves. Diagnostics appear within 400ms.
3. Runs "Build". Terminal streams \`dotnet build\` output. Exit 0.
4. Opens Lambda Tester, picks OrderLambda, clicks Invoke.
5. Response panel shows status 200 and echoed body.

## Test seeds
- \`fixtures/apigw-post.json\`
- \`fixtures/apigw-get.json\`
- \`fixtures/sqs-batch.json\`
`,
      },
    ],
  },
];
