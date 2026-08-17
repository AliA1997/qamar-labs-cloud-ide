// Parses a Python MCP server (FastMCP or Gradio) so the IDE can show a live
// "localhost" preview and let the user call the exposed tools.

import { callPythonFunction, parsePythonFunctions, type PyFunction } from "./py-sim";

export type McpFramework = "fastmcp" | "gradio";

export type McpTool = {
  name: string;
  description: string;
  params: PyFunction["params"];
  returnType: string;
};

export type McpServerInfo = {
  framework: McpFramework;
  serverName: string;
  port: number;
  path: string;
  transport: string;
  tools: McpTool[];
  errors: string[];
};

export function parseMcpServer(source: string, framework: McpFramework): McpServerInfo {
  const fns = parsePythonFunctions(source);
  const errors: string[] = [];

  const nameMatch =
    source.match(/FastMCP\s*\(\s*["']([^"']+)["']/) ??
    source.match(/title\s*=\s*["']([^"']+)["']/);
  const portMatch = source.match(/(?:server_)?port\s*=\s*(\d+)/);
  const transportMatch = source.match(/transport\s*=\s*["']([^"']+)["']/);

  let tools: McpTool[];
  if (framework === "fastmcp") {
    tools = fns
      .filter((f) => f.decorators.some((d) => /tool$/.test(d)))
      .map(toTool);
    if (tools.length === 0) errors.push("No @mcp.tool() functions found — nothing will be exposed.");
    if (!/FastMCP\s*\(/.test(source)) errors.push("No FastMCP(...) instance found in server.py.");
  } else {
    const exposed = new Set(
      [...source.matchAll(/fn\s*=\s*([A-Za-z_]\w*)/g)].map((m) => m[1]),
    );
    tools = fns.filter((f) => exposed.has(f.name)).map(toTool);
    if (!/mcp_server\s*=\s*True/.test(source)) {
      errors.push("demo.launch(mcp_server=True) is missing — the MCP endpoint will be disabled.");
    }
    if (tools.length === 0) errors.push("No function wired to gr.Interface(fn=...).");
  }

  return {
    framework,
    serverName: nameMatch?.[1] ?? (framework === "fastmcp" ? "FastMCP Server" : "Gradio App"),
    port: portMatch ? Number(portMatch[1]) : framework === "fastmcp" ? 8000 : 7860,
    path: framework === "fastmcp" ? "/mcp" : "/gradio_api/mcp/sse",
    transport: transportMatch?.[1] ?? (framework === "fastmcp" ? "http" : "sse"),
    tools,
    errors,
  };
}

function toTool(f: PyFunction): McpTool {
  return {
    name: f.name,
    description: f.doc || "No docstring provided.",
    params: f.params,
    returnType: f.returnType || "str",
  };
}

export function callMcpTool(
  source: string,
  tool: McpTool,
  args: Record<string, string>,
): { ok: boolean; result: string; logs: string[] } {
  const r = callPythonFunction(source, tool.name, args);
  return {
    ok: r.ok,
    logs: r.logs,
    result: r.ok
      ? typeof r.value === "string"
        ? r.value
        : JSON.stringify(r.value, null, 2)
      : (r.error ?? "Unknown error"),
  };
}
