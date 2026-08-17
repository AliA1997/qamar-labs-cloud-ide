// Code-problem runner: evaluates the user's `solution` function in the
// browser and checks it against the assertions declared in the test file.

import { callPythonFunction } from "./py-sim";
import { evaluateCsharpSolution } from "./csharp-sim";

export type PracticeLanguage = "javascript" | "typescript" | "python" | "csharp";

export type TestCase = {
  name: string;
  expected: string;
  check: (value: unknown) => boolean;
};

export const HELLO_TESTS: TestCase[] = [
  {
    name: "solution() is callable and returns a value",
    expected: "a defined return value",
    check: (v) => v !== undefined && v !== null,
  },
  {
    name: "solution() returns a string",
    expected: "typeof result === 'string'",
    check: (v) => typeof v === "string",
  },
  {
    name: 'solution() returns exactly "Hello, World!"',
    expected: "Hello, World!",
    check: (v) => v === "Hello, World!",
  },
];

export type RunResult = {
  ok: boolean;
  value?: unknown;
  logs: string[];
  error?: string;
};

function stripTypes(src: string): string {
  return src
    .replace(/^\s*(export\s+)?(interface|type)\s+[\s\S]*?\n\}/gm, "")
    .replace(/^\s*(export\s+)?type\s+\w+\s*=.*;$/gm, "")
    .replace(/\bas\s+(const|[A-Za-z_][\w<>[\]|]*)/g, "")
    .replace(/:\s*(string|number|boolean|any|unknown|void|never|object|Array<[^>]+>|[A-Za-z_]\w*(\[\])?)(?=\s*[),={;\n])/g, "")
    .replace(/<[A-Za-z_][\w,\s]*>(?=\s*\()/g, "")
    .replace(/\bexport\s+/g, "");
}

export function runSolution(language: PracticeLanguage, source: string): RunResult {
  const logs: string[] = [];
  try {
    if (language === "javascript" || language === "typescript") {
      const code = language === "typescript" ? stripTypes(source) : source.replace(/\bexport\s+/g, "");
      const body = `"use strict";\n${code}\nif (typeof solution !== "function") { throw new Error("No function named 'solution' was found."); }\nreturn solution();`;
      // eslint-disable-next-line no-new-func
      const fn = new Function("console", body) as (c: unknown) => unknown;
      const value = fn({
        log: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
        error: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
      });
      return { ok: true, value, logs };
    }
    if (language === "python") {
      const r = callPythonFunction(source, "solution");
      return { ok: r.ok, value: r.value, logs: r.logs, error: r.error };
    }
    const r = evaluateCsharpSolution(source);
    return { ok: r.ok, value: r.value, logs: [], error: r.error };
  } catch (err) {
    return { ok: false, logs, error: `${(err as Error).name}: ${(err as Error).message}` };
  }
}

export type TestOutcome = { name: string; pass: boolean; expected: string; actual: string };

export function runTests(
  language: PracticeLanguage,
  source: string,
  cases: TestCase[] = HELLO_TESTS,
): { outcomes: TestOutcome[]; logs: string[]; error?: string; durationMs: number } {
  const started = performance.now();
  const run = runSolution(language, source);
  const actual = run.ok ? format(run.value) : "(threw)";
  const outcomes = cases.map((c) => ({
    name: c.name,
    pass: run.ok && c.check(run.value),
    expected: c.expected,
    actual,
  }));
  return {
    outcomes,
    logs: run.logs,
    error: run.error,
    durationMs: Math.max(1, Math.round(performance.now() - started)),
  };
}

export function format(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (v === undefined) return "undefined";
  try { return JSON.stringify(v); } catch { return String(v); }
}
