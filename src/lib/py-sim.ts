// Tiny best-effort Python interpreter used by the in-browser runner.
// It transpiles a *simple* function body (assignments, prints, returns,
// single-level if/else) into JS and evaluates it. Enough for MCP tool
// handlers and code-problem solutions written in the editor.

let patched = false;
function patchStringHelpers() {
  if (patched) return;
  patched = true;
  const def = (name: string, value: unknown) => {
    if (!(name in String.prototype)) {
      Object.defineProperty(String.prototype, name, { value, enumerable: false });
    }
  };
  def("__pycount", function (this: string, s: string) { return this.split(s).length - 1; });
  def("__pylower", function (this: string) { return this.toLowerCase(); });
  def("__pyupper", function (this: string) { return this.toUpperCase(); });
  def("__pystrip", function (this: string) { return this.trim(); });
}

export type PyFunction = {
  name: string;
  params: { name: string; type: string; default?: string }[];
  doc: string;
  returnType: string;
  body: string;
  decorators: string[];
};

const INDENT = /^(\s*)/;

/** Parse all top-level `def` blocks (with decorators + docstrings). */
export function parsePythonFunctions(source: string): PyFunction[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const fns: PyFunction[] = [];
  let decorators: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dec = line.match(/^\s*@([\w.]+)\s*(\(.*\))?\s*$/);
    if (dec) { decorators.push(dec[1]); continue; }

    const def = line.match(/^(\s*)def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:\s*$/);
    if (!def) { if (line.trim()) decorators = []; continue; }

    const baseIndent = def[1].length;
    const bodyLines: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim()) { bodyLines.push(""); continue; }
      const ind = (l.match(INDENT)?.[1] ?? "").length;
      if (ind <= baseIndent) break;
      bodyLines.push(l.slice(baseIndent + 4 <= ind ? baseIndent + 4 : ind));
    }

    const rawBody = bodyLines.join("\n");
    const docMatch = rawBody.match(/^\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/);
    const doc = (docMatch?.[1] ?? docMatch?.[2] ?? "").trim().split("\n")[0] ?? "";

    fns.push({
      name: def[2],
      decorators,
      returnType: (def[4] ?? "").trim(),
      doc,
      body: docMatch ? rawBody.slice(docMatch[0].length) : rawBody,
      params: def[3]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p && p !== "self")
        .map((p) => {
          const [left, def0] = p.split("=").map((x) => x.trim());
          const [name, type] = left.split(":").map((x) => x.trim());
          return { name, type: type ?? "str", default: def0 };
        }),
    });

    decorators = [];
    i = j - 1;
  }
  return fns;
}

/** Translate a single Python expression into JS. */
export function pyExprToJs(expr: string): string {
  let e = expr.trim();
  // f-strings -> template literals
  e = e.replace(/\bf(["'])((?:\\.|(?!\1)[^\\])*)\1/g, (_m, _q, body: string) => {
    const inner = body
      .replace(/`/g, "\\`")
      .replace(/\{\{/g, "\u0001").replace(/\}\}/g, "\u0002")
      .replace(/\{([^{}]+?)(?::[^{}]*)?\}/g, (_x, code: string) => "${" + pyExprToJs(code) + "}")
      .replace(/\u0001/g, "{").replace(/\u0002/g, "}");
    return "`" + inner + "`";
  });
  e = e
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bnot\s+/g, "!")
    .replace(/\s+and\s+/g, " && ")
    .replace(/\s+or\s+/g, " || ")
    .replace(/\blen\s*\(/g, "__len(")
    .replace(/\bstr\s*\(/g, "String(")
    .replace(/\bint\s*\(/g, "__int(")
    .replace(/\bfloat\s*\(/g, "Number(")
    .replace(/\bsum\s*\(/g, "__sum(")
    .replace(/\.count\s*\(/g, ".__pycount(")
    .replace(/\.lower\s*\(/g, ".__pylower(")
    .replace(/\.upper\s*\(/g, ".__pyupper(")
    .replace(/\.strip\s*\(/g, ".__pystrip(")
    .replace(/\bmath\.sqrt\b/g, "Math.sqrt")
    .replace(/\*\*/g, "**");
  return e;
}

function bodyToJs(body: string): string {
  const out: string[] = [];
  const declared = new Set<string>();
  for (const raw of body.split("\n")) {
    const line = raw.replace(/#.*$/, "");
    if (!line.trim()) continue;
    const indent = (line.match(INDENT)?.[1] ?? "").length;
    const pad = " ".repeat(indent);
    const t = line.trim();

    const block = t.match(/^(if|elif|else|for|while)\b(.*):$/);
    if (block) {
      const kw = block[1];
      const cond = pyExprToJs(block[2].replace(/:$/, "").trim());
      if (kw === "else") out.push(`${pad}} else {`);
      else if (kw === "elif") out.push(`${pad}} else if (${cond}) {`);
      else if (kw === "for") {
        const m = block[2].trim().match(/^([A-Za-z_]\w*)\s+in\s+(.+)$/);
        out.push(m ? `${pad}for (const ${m[1]} of ${pyExprToJs(m[2])}) {` : `${pad}{`);
      } else out.push(`${pad}${kw === "if" ? "if" : "while"} (${cond}) {`);
      out.push("\u0000OPEN");
      continue;
    }

    const ret = t.match(/^return\b\s*(.*)$/);
    if (ret) { out.push(`${pad}return ${ret[1] ? pyExprToJs(ret[1]) : "null"};`); continue; }

    const pr = t.match(/^print\s*\((.*)\)$/);
    if (pr) { out.push(`${pad}__log(${pr[1] ? pyExprToJs(pr[1]) : '""'});`); continue; }

    const assign = t.match(/^([A-Za-z_]\w*)\s*(\+?)=\s*(.+)$/);
    if (assign && !t.startsWith("==")) {
      const [, name, plus, value] = assign;
      if (plus) out.push(`${pad}${name} += ${pyExprToJs(value)};`);
      else {
        out.push(`${pad}${declared.has(name) ? "" : "let "}${name} = ${pyExprToJs(value)};`);
        declared.add(name);
      }
      continue;
    }
    out.push(`${pad}${pyExprToJs(t)};`);
  }

  // close blocks by indentation
  const lines = out.filter((l) => l !== "\u0000OPEN");
  const closed: string[] = [];
  const stack: number[] = [];
  for (const l of lines) {
    const ind = (l.match(INDENT)?.[1] ?? "").length;
    while (stack.length && ind <= stack[stack.length - 1]) {
      stack.pop();
      closed.push("}");
    }
    closed.push(l);
    if (l.trimEnd().endsWith("{")) stack.push(ind);
  }
  while (stack.length) { stack.pop(); closed.push("}"); }
  return closed.join("\n");
}

export type PyCallResult = { ok: boolean; value?: unknown; logs: string[]; error?: string };

export function callPythonFunction(
  source: string,
  name: string,
  args: Record<string, unknown> = {},
): PyCallResult {
  patchStringHelpers();
  const fn = parsePythonFunctions(source).find((f) => f.name === name);
  if (!fn) return { ok: false, logs: [], error: `NameError: function '${name}' is not defined` };

  const logs: string[] = [];
  const helpers = {
    __log: (v: unknown) => logs.push(typeof v === "string" ? v : JSON.stringify(v)),
    __len: (v: unknown) => (typeof v === "string" || Array.isArray(v) ? v.length : 0),
    __int: (v: unknown) => Math.trunc(Number(v)),
    __sum: (v: unknown[]) => (Array.isArray(v) ? v.reduce((a: number, b) => a + Number(b), 0) : 0),
  };

  try {
    const js = bodyToJs(fn.body);
    const paramNames = fn.params.map((p) => p.name);
    const body = `"use strict";\n${js}\nreturn undefined;`;
    // eslint-disable-next-line no-new-func
    const compiled = new Function(...Object.keys(helpers), ...paramNames, body) as (
      ...a: unknown[]
    ) => unknown;
    const values = fn.params.map((p) => {
      const v = args[p.name];
      if (v !== undefined) return coerce(v, p.type);
      if (p.default !== undefined) return JSON.parse(safeJson(p.default));
      return p.type.includes("int") || p.type.includes("float") ? 0 : "";
    });
    const value = compiled(...Object.values(helpers), ...values);
    return { ok: true, value, logs };
  } catch (err) {
    return { ok: false, logs, error: `${(err as Error).name}: ${(err as Error).message}` };
  }
}

function safeJson(v: string) {
  const t = v.trim().replace(/'/g, '"').replace(/\bTrue\b/, "true").replace(/\bFalse\b/, "false");
  try { JSON.parse(t); return t; } catch { return JSON.stringify(v); }
}

function coerce(v: unknown, type: string) {
  if (type.includes("int")) return Math.trunc(Number(v));
  if (type.includes("float")) return Number(v);
  if (type.includes("bool")) return v === true || v === "true";
  return v;
}
