// Very small pretend-interpreter for the console-app template so the Run
// button reflects what the user actually typed into Program.cs. Handles:
//   - var X = "literal";
//   - var X = args.Length > 0 ? args[0] : "fallback";
//   - Console.WriteLine(...) / Console.Write(...)
//   - string literals "..." and interpolated $"...{ident}..."
// Anything fancier falls through to a best-effort string of the raw arg.

type Vars = Record<string, string>;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

function resolveExpr(expr: string, vars: Vars): string {
  const e = expr.trim();

  // "literal"
  const lit = e.match(/^"((?:[^"\\]|\\.)*)"$/);
  if (lit) return unescapeCs(lit[1]);

  // $"interpolated {x}"
  const interp = e.match(/^\$"((?:[^"\\]|\\.)*)"$/);
  if (interp) {
    return unescapeCs(interp[1]).replace(/\{([^{}:]+)(?::[^}]*)?\}/g, (_, name) => {
      const v = vars[name.trim()];
      return v !== undefined ? v : `{${name}}`;
    });
  }

  // args.Length > 0 ? args[0] : "fallback"
  const ternary = e.match(/^args\.Length\s*>\s*0\s*\?\s*args\[0\]\s*:\s*"((?:[^"\\]|\\.)*)"$/);
  if (ternary) return unescapeCs(ternary[1]);

  // identifier
  if (/^[A-Za-z_]\w*$/.test(e) && vars[e] !== undefined) return vars[e];

  // string concat with + (very naive)
  if (e.includes("+")) {
    return e
      .split("+")
      .map((p) => resolveExpr(p.trim(), vars))
      .join("");
  }

  return e;
}

function unescapeCs(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export function simulateCsharpConsole(source: string): { output: string[]; ok: boolean; error?: string } {
  const src = stripComments(source);
  const vars: Vars = {};
  const out: string[] = [];

  // Collect `var name = <expr>;` assignments (top-level, single line).
  const assignRe = /\bvar\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = assignRe.exec(src)) !== null) {
    vars[m[1]] = resolveExpr(m[2], vars);
  }

  // Walk Console.Write / WriteLine calls in source order.
  const callRe = /Console\.(WriteLine|Write)\s*\(([\s\S]*?)\)\s*;/g;
  while ((m = callRe.exec(src)) !== null) {
    const [, kind, rawArg] = m;
    const value = rawArg.trim().length === 0 ? "" : resolveExpr(rawArg, vars);
    if (kind === "WriteLine") {
      for (const line of value.split("\n")) out.push(line);
    } else {
      // Append to previous line if any, else start a new one.
      if (out.length === 0) out.push(value);
      else out[out.length - 1] += value;
    }
  }

  if (out.length === 0) {
    return { output: ["(no console output)"], ok: true };
  }
  return { output: out, ok: true };
}

/**
 * Evaluate the return value of a `Solution()`-style method for the code
 * problem template. Handles string/var locals and literal/interpolated
 * returns.
 */
export function evaluateCsharpSolution(
  source: string,
): { ok: boolean; value?: string; error?: string } {
  const src = stripComments(source);
  if (!/\bSolution\s*\(/.test(src)) {
    return { ok: false, error: "CS0103: no method named 'Solution' was found." };
  }
  const vars: Vars = {};
  const assignRe = /\b(?:var|string)\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = assignRe.exec(src)) !== null) vars[m[1]] = resolveExpr(m[2], vars);

  const returns = [...src.matchAll(/\breturn\s+([^;]+);/g)];
  if (returns.length === 0) {
    return { ok: false, error: "CS0161: 'Solution()' does not return a value on all code paths." };
  }
  return { ok: true, value: resolveExpr(returns[returns.length - 1][1], vars) };
}
