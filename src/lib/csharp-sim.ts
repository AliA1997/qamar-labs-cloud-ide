// A pragmatic C# -> JavaScript transpiler used to *simulate* running C# in the
// browser. It supports a useful subset: usings/namespaces, classes, static and
// instance methods, locals (var / typed), foreach / for / while, string
// interpolation, Console.Write(Line), Math.*, common string + LINQ members,
// List<T>, arrays and StringBuilder. Anything outside the subset is passed
// through as-is and may throw at runtime — the error is surfaced to the user.

const PH = "\u0001";

type Lit = { kind: "str" | "interp"; raw: string };

/** Replace comments with nothing and string literals with placeholders. */
function mask(src: string): { text: string; lits: Lit[] } {
  const lits: Lit[] = [];
  let out = "";
  let i = 0;
  const push = (l: Lit) => {
    lits.push(l);
    out += `${PH}${lits.length - 1}${PH}`;
  };
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if ((c === "$" && n === '"') || (c === "$" && n === "@" && src[i + 2] === '"')) {
      i += n === "@" ? 3 : 2;
      let buf = "";
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\") {
          buf += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        buf += src[i++];
      }
      i++;
      push({ kind: "interp", raw: buf });
      continue;
    }
    if (c === "@" && n === '"') {
      i += 2;
      let buf = "";
      while (i < src.length) {
        if (src[i] === '"' && src[i + 1] === '"') {
          buf += '\\"';
          i += 2;
          continue;
        }
        if (src[i] === '"') break;
        if (src[i] === "\n") buf += "\\n";
        else if (src[i] === "\\") buf += "\\\\";
        else buf += src[i];
        i++;
      }
      i++;
      push({ kind: "str", raw: buf });
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let buf = "";
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") {
          buf += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        buf += src[i] === '"' ? '\\"' : src[i];
        i++;
      }
      i++;
      push({ kind: "str", raw: buf });
      continue;
    }
    out += c;
    i++;
  }
  return { text: out, lits };
}

function unmask(text: string, lits: Lit[], transformExpr: (s: string) => string): string {
  return text.replace(new RegExp(`${PH}(\\d+)${PH}`, "g"), (_, idx) => {
    const lit = lits[Number(idx)];
    if (!lit) return '""';
    if (lit.kind === "str") return `"${lit.raw}"`;
    // interpolated -> template literal
    const body = lit.raw
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${")
      .replace(/\{\{/g, "\u0002")
      .replace(/\}\}/g, "\u0003")
      .replace(/\{([^{}]+)\}/g, (_m, expr: string) => {
        const [e] = String(expr).split(/,(?![^(]*\))|:(?![^(]*\))/);
        return "${" + transformExpr(e.trim()) + "}";
      })
      .replace(/\u0002/g, "{")
      .replace(/\u0003/g, "}");
    return "`" + body + "`";
  });
}

const CONTROL = new Set([
  "if", "for", "foreach", "while", "switch", "catch", "using", "lock", "fixed",
  "return", "do", "else", "new", "get", "set", "yield", "await", "in",
]);

const PRIMS = "int|long|double|float|decimal|bool|string|char|byte|sbyte|short|ushort|uint|ulong|object|var|void";

function stripParams(params: string): string {
  if (!params.trim()) return "";
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of params) {
    if (ch === "<" || ch === "(" || ch === "[") depth++;
    if (ch === ">" || ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => {
      const t = p.trim().replace(/^(?:ref|out|in|params|this)\s+/, "");
      const m = t.match(/^[\w<>,.\[\]?]+\s+([A-Za-z_]\w*)\s*(=\s*(.+))?$/);
      if (m) return m[3] ? `${m[1]} = ${m[3]}` : m[1];
      return t;
    })
    .join(", ");
}

/** Move class declarations to the top so top-level statements can use them. */
function hoistClasses(text: string): { code: string; classNames: string[] } {
  const classNames: string[] = [];
  const blocks: string[] = [];
  let rest = "";
  let i = 0;
  const re = /\bclass\s+([A-Za-z_]\w*)[^{;]*\{/g;
  let m: RegExpExecArray | null;
  const found: { start: number; end: number; name: string }[] = [];
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    let depth = 0;
    let j = m.index + m[0].length - 1;
    for (; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (found.some((f) => start > f.start && start < f.end)) continue;
    found.push({ start, end: j + 1, name: m[1] });
  }
  for (const f of found) {
    rest += text.slice(i, f.start);
    blocks.push(text.slice(f.start, f.end));
    classNames.push(f.name);
    i = f.end;
  }
  rest += text.slice(i);
  return { code: `${blocks.join("\n")}\n${rest}`, classNames };
}

const MATH: Record<string, string> = {
  Pow: "pow", Sqrt: "sqrt", Abs: "abs", Floor: "floor", Ceiling: "ceil",
  Round: "round", Max: "max", Min: "min", Log: "log", Log10: "log10",
  Exp: "exp", Sign: "sign", Truncate: "trunc", PI: "PI", E: "E",
};

function transform(text: string): string {
  let s = text;

  // usings + namespaces
  s = s.replace(/^\s*using\s+(static\s+)?[\w.=\s<>,]+;\s*$/gm, "");
  s = s.replace(/^\s*namespace\s+[\w.]+\s*;\s*$/gm, "");
  s = s.replace(/\bnamespace\s+[\w.]+\s*\{/g, "{");
  // attributes on their own line
  s = s.replace(/^\s*\[[^\]\n]*\]\s*$/gm, "");

  // auto-properties -> plain fields
  s = s.replace(
    /(?:(?:public|private|protected|internal|static|readonly|virtual|override)\s+)+[\w<>,.\[\]?]+\s+([A-Za-z_]\w*)\s*\{\s*get;\s*(?:(?:private|protected|internal)\s+)?set;\s*\}\s*(=\s*[^;]+;)?/g,
    (_m, name: string, init?: string) => (init ? `${name} ${init}` : `${name};`),
  );

  // class / struct / record / interface
  s = s.replace(
    /(?:(?:public|private|protected|internal|static|sealed|abstract|partial)\s+)+(class|struct|record)\s+/g,
    "class ",
  );
  s = s.replace(/\b(?:struct|record)\s+([A-Za-z_]\w*)/g, "class $1");
  // drop base/interface lists
  s = s.replace(/\bclass\s+([A-Za-z_]\w*)\s*:\s*[^{]+\{/g, "class $1 {");

  // expression-bodied methods:  Type Name(args) => expr;
  s = s.replace(
    /((?:(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|new)\s+)*)([\w<>,.\[\]?]+)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=>\s*([^;]+);/g,
    (full, mods: string, type: string, name: string, params: string, expr: string) => {
      if (CONTROL.has(name) || CONTROL.has(type)) return full;
      const isStatic = /\bstatic\b/.test(mods) ? "static " : "";
      return `${isStatic}${name}(${stripParams(params)}) { return ${expr}; }`;
    },
  );

  // method declarations
  s = s.replace(
    /((?:(?:public|private|protected|internal|static|virtual|override|abstract|sealed|async|extern|unsafe|new)\s+)*)([\w<>,.\[\]?]+)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/g,
    (full, mods: string, type: string, name: string, params: string) => {
      if (CONTROL.has(name) || CONTROL.has(type) || /^(if|for|while|switch)$/.test(type)) return full;
      const isStatic = /\bstatic\b/.test(mods) ? "static " : "";
      return `${isStatic}${name}(${stripParams(params)}) {`;
    },
  );
  // constructors
  s = s.replace(
    /(?:(?:public|private|protected|internal)\s+)+([A-Z]\w*)\s*\(([^)]*)\)\s*\{/g,
    (_m, _name: string, params: string) => `constructor(${stripParams(params)}) {`,
  );

  // fields with modifiers -> plain
  s = s.replace(
    /(?:(?:public|private|protected|internal|static|readonly|const)\s+)+[\w<>,.\[\]?]+\s+([A-Za-z_]\w*)\s*(=|;)/g,
    "$1 $2",
  );

  // const / readonly modifiers on locals
  s = s.replace(/\b(?:readonly|const)\s+(?=[A-Za-z_])/g, "");

  // loops
  s = s.replace(
    new RegExp(`\\bforeach\\s*\\(\\s*(?:${PRIMS}|[\\w<>,.\\[\\]?]+)\\s+([A-Za-z_]\\w*)\\s+in\\s+`, "g"),
    "for (const $1 of ",
  );
  s = s.replace(new RegExp(`\\bfor\\s*\\(\\s*(?:${PRIMS})\\s+`, "g"), "for (let ");

  // local declarations
  s = s.replace(/\bvar\s+([A-Za-z_]\w*)\s*=/g, "let $1 =");
  s = s.replace(
    new RegExp(`(^|[;{}()\\n]\\s*)(?:${PRIMS})(?:\\[\\])?\\s+([A-Za-z_]\\w*)\\s*(=[^=]|;)`, "g"),
    "$1let $2 $3",
  );
  s = s.replace(
    /(^|[;{}\n]\s*)[A-Z]\w*(?:<[^;<>()]*>)?(?:\[\])?\s+([A-Za-z_]\w*)\s*=\s*new\b/g,
    "$1let $2 = new",
  );

  // collections
  s = s.replace(/\bnew\s+(?:List|HashSet|Stack|Queue)\s*<[^>]*>\s*\(\s*\)/g, "[]");
  s = s.replace(/\bnew\s+(?:List|HashSet)\s*<[^>]*>\s*\{([^{}]*)\}/g, "[$1]");
  s = s.replace(/\bnew\s+[\w.<>]+\[\]\s*\{([^{}]*)\}/g, "[$1]");
  s = s.replace(/\bnew\s+[\w.<>]+\[\s*([^\]]*)\]/g, "new Array($1).fill(0)");
  s = s.replace(/\bnew\s+Dictionary\s*<[^>]*>\s*\(\s*\)/g, "new Map()");
  s = s.replace(/\bnew\s+StringBuilder\s*\(\s*\)/g, "__sb()");

  // console
  s = s.replace(/\bConsole\.WriteLine\s*\(/g, "__writeLine(");
  s = s.replace(/\bConsole\.Write\s*\(/g, "__write(");
  s = s.replace(/\bConsole\.Error\.WriteLine\s*\(/g, "__writeLine(");
  s = s.replace(/\bConsole\.ReadLine\s*\(\s*\)/g, '""');

  // conversions
  s = s.replace(/\b(?:int|long|Int32|Int64|short|byte)\.Parse\s*\(/g, "__parseInt(");
  s = s.replace(/\b(?:double|float|decimal|Double|Single)\.Parse\s*\(/g, "__parseNum(");
  s = s.replace(/\bConvert\.To(?:Int32|Int64)\s*\(/g, "__parseInt(");
  s = s.replace(/\bConvert\.To(?:Double|Single|Decimal)\s*\(/g, "__parseNum(");
  s = s.replace(/\bConvert\.ToString\s*\(/g, "String(");
  s = s.replace(/\bbool\.Parse\s*\(/g, "__parseBool(");

  // Math
  s = s.replace(/\bMath\.([A-Za-z]\w*)/g, (_m, name: string) => `Math.${MATH[name] ?? name.toLowerCase()}`);

  // string statics
  s = s.replace(/\bstring\.Join\s*\(/g, "__join(");
  s = s.replace(/\bstring\.IsNullOrEmpty\s*\(/g, "__isNullOrEmpty(");
  s = s.replace(/\bstring\.IsNullOrWhiteSpace\s*\(/g, "__isNullOrEmpty(");
  s = s.replace(/\bstring\.Format\s*\(/g, "__format(");
  s = s.replace(/\bstring\.Empty\b/g, '""');

  // instance members
  const MEMBERS: [RegExp, string][] = [
    [/\.ToString\s*\(\s*\)/g, ".__toStr()"],
    [/\.ToString\s*\(/g, ".__toStr("],
    [/\.Length\b/g, ".length"],
    [/\.Count\s*\(\s*\)/g, ".length"],
    [/\.Count\b(?!\s*\()/g, ".length"],
    [/\.ToCharArray\s*\(\s*\)/g, '.split("")'],
    [/\.Split\s*\(/g, ".__split("],
    [/\.Substring\s*\(/g, ".__substring("],
    [/\.ToUpper(?:Invariant)?\s*\(\s*\)/g, ".toUpperCase()"],
    [/\.ToLower(?:Invariant)?\s*\(\s*\)/g, ".toLowerCase()"],
    [/\.Trim\s*\(\s*\)/g, ".trim()"],
    [/\.TrimStart\s*\(\s*\)/g, ".trimStart()"],
    [/\.TrimEnd\s*\(\s*\)/g, ".trimEnd()"],
    [/\.Replace\s*\(/g, ".__replace("],
    [/\.Contains\s*\(/g, ".__contains("],
    [/\.StartsWith\s*\(/g, ".startsWith("],
    [/\.EndsWith\s*\(/g, ".endsWith("],
    [/\.IndexOf\s*\(/g, ".indexOf("],
    [/\.PadLeft\s*\(/g, ".padStart("],
    [/\.PadRight\s*\(/g, ".padEnd("],
    [/\.Add\s*\(/g, ".push("],
    [/\.Append\s*\(/g, ".Append("],
    [/\.ToList\s*\(\s*\)/g, ".slice()"],
    [/\.ToArray\s*\(\s*\)/g, ".slice()"],
    [/\.Select\s*\(/g, ".map("],
    [/\.Where\s*\(/g, ".filter("],
    [/\.Any\s*\(/g, ".__any("],
    [/\.All\s*\(/g, ".every("],
    [/\.Sum\s*\(/g, ".__sum("],
    [/\.OrderByDescending\s*\(/g, ".__orderByDesc("],
    [/\.OrderBy\s*\(/g, ".__orderBy("],
    [/\.Reverse\s*\(\s*\)/g, ".slice().reverse()"],
    [/\.Distinct\s*\(\s*\)/g, ".__distinct()"],
    [/\.First\s*\(/g, ".__first("],
    [/\.Last\s*\(/g, ".__last("],
    [/\.Max\s*\(\s*\)/g, ".__max()"],
    [/\.Min\s*\(\s*\)/g, ".__min()"],
  ];
  for (const [re, rep] of MEMBERS) s = s.replace(re, rep);

  // casts
  s = s.replace(/\((?:int|long|short|byte)\)\s*/g, "~~");
  s = s.replace(/\((?:double|float|decimal)\)\s*/g, "+");
  s = s.replace(/\((?:string|char|object)\)\s*/g, "");

  // misc keywords
  s = s.replace(/\b(\w+)\s+is\s+null\b/g, "$1 === null");

  return s;
}

function transpile(source: string): { code: string; classNames: string[] } {
  const { text, lits } = mask(source);
  const transformed = transform(text);
  const { code, classNames } = hoistClasses(transformed);
  const finalCode = unmask(code, lits, (expr) => transform(expr));
  return { code: finalCode, classNames };
}

const RUNTIME = `
const args = [];
const __out = [];
const __writeLine = (v) => { const s = v === undefined ? "" : __str(v); for (const line of String(s).split("\\n")) __out.push({ nl: true, text: line }); };
const __write = (v) => { __out.push({ nl: false, text: v === undefined ? "" : __str(v) }); };
const __str = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
};
const __parseInt = (v) => { const n = parseInt(String(v).trim(), 10); if (Number.isNaN(n)) throw new Error("FormatException: The input string '" + v + "' was not in a correct format."); return n; };
const __parseNum = (v) => { const n = Number(String(v).trim()); if (Number.isNaN(n)) throw new Error("FormatException: The input string '" + v + "' was not in a correct format."); return n; };
const __parseBool = (v) => String(v).trim().toLowerCase() === "true";
const __join = (sep, arr) => (Array.isArray(arr) ? arr : [arr]).map(__str).join(sep);
const __isNullOrEmpty = (v) => v === null || v === undefined || String(v).trim() === "";
const __format = (fmt, ...args) => String(fmt).replace(/\\{(\\d+)(?::[^}]*)?\\}/g, (_m, i) => __str(args[Number(i)]));
const __sb = () => {
  const parts = [];
  return {
    Append(v) { parts.push(__str(v)); return this; },
    AppendLine(v) { parts.push(__str(v === undefined ? "" : v) + "\\n"); return this; },
    __toStr() { return parts.join(""); },
    get length() { return parts.join("").length; },
  };
};
const __proto = (obj, name, fn) => { if (!Object.prototype.hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, { value: fn, enumerable: false, writable: true, configurable: true }); };
__proto(Object.prototype, "__toStr", function () { return __str(this); });
__proto(Number.prototype, "__toStr", function (fmt) {
  if (typeof fmt === "string") {
    const m = fmt.match(/^[FfNn](\\d+)$/);
    if (m) return this.toFixed(Number(m[1]));
  }
  return String(this);
});
__proto(String.prototype, "__split", function (...args) {
  const seps = args.flat().filter((a) => typeof a === "string");
  if (seps.length === 0 || (seps.length === 1 && seps[0] === "")) return this.split("");
  return this.split(new RegExp(seps.map((s) => s.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&")).join("|")));
});
__proto(String.prototype, "__substring", function (start, len) { return len === undefined ? this.substring(start) : this.substring(start, start + len); });
__proto(String.prototype, "__replace", function (a, b) { return this.split(String(a)).join(String(b)); });
__proto(String.prototype, "__contains", function (v) { return this.includes(String(v)); });
__proto(Array.prototype, "__contains", function (v) { return this.includes(v); });
__proto(Array.prototype, "__any", function (f) { return f ? this.some(f) : this.length > 0; });
__proto(Array.prototype, "__sum", function (f) { return this.reduce((a, b) => a + Number(f ? f(b) : b), 0); });
__proto(Array.prototype, "__orderBy", function (f) { return this.slice().sort((a, b) => { const A = f ? f(a) : a, B = f ? f(b) : b; return A < B ? -1 : A > B ? 1 : 0; }); });
__proto(Array.prototype, "__orderByDesc", function (f) { return this.__orderBy(f).reverse(); });
__proto(Array.prototype, "__distinct", function () { return [...new Set(this)]; });
__proto(Array.prototype, "__first", function (f) { const r = f ? this.find(f) : this[0]; if (r === undefined) throw new Error("InvalidOperationException: Sequence contains no matching element"); return r; });
__proto(Array.prototype, "__last", function (f) { const a = f ? this.filter(f) : this; return a[a.length - 1]; });
__proto(Array.prototype, "__max", function () { return Math.max(...this); });
__proto(Array.prototype, "__min", function () { return Math.min(...this); });
`;

function execute(
  source: string,
  epilogue: (classNames: string[]) => string,
): { ok: boolean; output: string[]; value?: unknown; error?: string } {
  let code = "";
  let classNames: string[] = [];
  try {
    const t = transpile(source);
    code = t.code;
    classNames = t.classNames;
  } catch (err) {
    return { ok: false, output: [], error: `Transpile error: ${(err as Error).message}` };
  }

  const body = `${RUNTIME}\nlet __value;\ntry {\n${code}\n${epilogue(classNames)}\n} catch (e) {\n  return { out: __out, err: (e && e.message) ? e.message : String(e) };\n}\nreturn { out: __out, value: __value };`;

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(body) as () => { out: { nl: boolean; text: string }[]; value?: unknown; err?: string };
    const res = fn();
    const output: string[] = [];
    for (const chunk of res.out) {
      if (output.length === 0) output.push("");
      output[output.length - 1] += chunk.text;
      if (chunk.nl) output.push("");
    }
    if (output.length && output[output.length - 1] === "") output.pop();
    if (res.err) return { ok: false, output, error: res.err };
    return { ok: true, output, value: res.value };
  } catch (err) {
    return { ok: false, output: [], error: `${(err as Error).name}: ${(err as Error).message}` };
  }
}

export function simulateCsharpConsole(source: string): { output: string[]; ok: boolean; error?: string } {
  const hasMain = /\bstatic\s+(?:async\s+)?(?:void|int|Task[\w<>]*)\s+Main\s*\(/.test(source);
  const res = execute(source, (classes) => {
    if (!hasMain) return "";
    const list = JSON.stringify(classes);
    return `for (const __c of ${list}) { try { const __k = eval(__c); if (__k && typeof __k.Main === "function") { __k.Main([]); break; } } catch (_) {} }`;
  });

  if (!res.ok) {
    return { output: res.output, ok: false, error: res.error };
  }
  if (res.output.length === 0) {
    const hint = /\bclass\b/.test(source) && !hasMain
      ? [
          "(no console output)",
          "hint: this file has no entry point — add top-level statements or a static Main().",
          '      e.g. Console.WriteLine(Kata.Narcissistic(153));',
        ]
      : ["(no console output)"];
    return { output: hint, ok: true };
  }
  return { output: res.output, ok: true };
}

/**
 * Evaluate a `Solution()`-style method (free function or static class member)
 * for the code-problem template.
 */
export function evaluateCsharpSolution(
  source: string,
): { ok: boolean; value?: unknown; logs: string[]; error?: string } {
  const names = ["Solution", "solution", "Solve", "Run", "Main"];
  if (!names.some((n) => new RegExp(`\\b${n}\\s*\\(`).test(source))) {
    return { ok: false, logs: [], error: "CS0103: no method named 'Solution' was found." };
  }
  const res = execute(source, (classes) => {
    const list = JSON.stringify(classes);
    const ns = JSON.stringify(names);
    return `{
  let __done = false;
  for (const __n of ${ns}) {
    try { const __f = eval(typeof __n === "string" ? __n : ""); if (typeof __f === "function") { __value = __f(); __done = true; break; } } catch (e) { /* not defined */ }
  }
  if (!__done) {
    outer: for (const __c of ${list}) {
      let __k; try { __k = eval(__c); } catch (e) { continue; }
      for (const __n of ${ns}) {
        if (__k && typeof __k[__n] === "function") { __value = __k[__n](); __done = true; break outer; }
        if (__k && typeof __k.prototype?.[__n] === "function") { __value = new __k()[__n](); __done = true; break outer; }
      }
    }
  }
  if (!__done) throw new Error("CS0103: no callable 'Solution' was found.");
}`;
  });
  return { ok: res.ok, value: res.value, logs: res.output, error: res.error };
}


/** Exposed for debugging/tests: returns the generated JavaScript. */
export function __debugTranspile(source: string): string {
  return transpile(source).code;
}
