export type IdeFile = {
  path: string;
  language: "csharp" | "xml" | "json" | "markdown" | "yaml" | "typescript" | "python" | "javascript";
  content: string;
};

export const STARTER_PROJECT: IdeFile[] = [
  {
    path: "src/HelloApi/Program.cs",
    language: "csharp",
    content: `using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapGet("/", () => new { message = "Hello from .NET 9 on Nova IDE" });

app.MapGet("/weather/{city}", (string city) => new
{
    city,
    tempC = Random.Shared.Next(-5, 32),
    condition = "Partly Cloudy"
});

app.Run();
`,
  },
  {
    path: "src/HelloApi/HelloApi.csproj",
    language: "xml",
    content: `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
`,
  },
  {
    path: "src/OrderLambda/Function.cs",
    language: "csharp",
    content: `using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace OrderLambda;

public class Function
{
    public async Task<APIGatewayProxyResponse> Handler(
        APIGatewayProxyRequest request,
        ILambdaContext context)
    {
        context.Logger.LogInformation($"Received {request.HttpMethod} {request.Path}");

        var body = string.IsNullOrEmpty(request.Body)
            ? new { orderId = (string?)null }
            : JsonSerializer.Deserialize<dynamic>(request.Body);

        return new APIGatewayProxyResponse
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(new
            {
                ok = true,
                receivedAt = DateTime.UtcNow,
                echo = body
            }),
            Headers = new Dictionary<string, string> { ["Content-Type"] = "application/json" }
        };
    }
}
`,
  },
  {
    path: "src/OrderLambda/OrderLambda.csproj",
    language: "xml",
    content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AWSProjectType>Lambda</AWSProjectType>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Amazon.Lambda.Core" Version="2.3.0" />
    <PackageReference Include="Amazon.Lambda.APIGatewayEvents" Version="2.7.0" />
    <PackageReference Include="Amazon.Lambda.Serialization.SystemTextJson" Version="2.4.4" />
  </ItemGroup>
</Project>
`,
  },
  {
    path: "tests/HelloApi.Tests/UnitTest1.cs",
    language: "csharp",
    content: `using Xunit;

public class SmokeTests
{
    [Fact]
    public void Addition_Works() => Assert.Equal(4, 2 + 2);

    [Theory]
    [InlineData("Paris")]
    [InlineData("Tokyo")]
    public void City_IsNotEmpty(string city) => Assert.False(string.IsNullOrEmpty(city));
}
`,
  },
  {
    path: "NovaIDE.sln",
    language: "xml",
    content: `Microsoft Visual Studio Solution File, Format Version 12.00
# Nova IDE Sample Solution
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "HelloApi", "src\\HelloApi\\HelloApi.csproj", "{A1}"
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "OrderLambda", "src\\OrderLambda\\OrderLambda.csproj", "{A2}"
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "HelloApi.Tests", "tests\\HelloApi.Tests\\HelloApi.Tests.csproj", "{A3}"
`,
  },
  {
    path: "python/report_lambda/handler.py",
    language: "python",
    content: `"""AWS Lambda handler — Python 3.12 runtime.

Invoke locally from the Lambda Tester tab with an API Gateway event.
"""
import json
import os
from datetime import datetime, timezone


def handler(event: dict, context) -> dict:
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    print(f"[INFO] {method} {path}")

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError:
            body = {"raw": event["body"]}

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "ok": True,
            "runtime": f"python{os.sys.version_info.major}.{os.sys.version_info.minor}",
            "receivedAt": datetime.now(timezone.utc).isoformat(),
            "echo": body,
        }),
    }
`,
  },
  {
    path: "python/report_lambda/requirements.txt",
    language: "markdown",
    content: `boto3==1.35.0
pydantic==2.9.2
requests==2.32.3
`,
  },
  {
    path: "python/scripts/etl.py",
    language: "python",
    content: `"""Standalone Python script — run from the Runner terminal.

    $ python python/scripts/etl.py --source orders.csv
"""
import argparse
import csv
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Tiny ETL over a CSV")
    parser.add_argument("--source", required=True, type=Path)
    args = parser.parse_args()

    total = 0.0
    count = 0
    with args.source.open() as f:
        for row in csv.DictReader(f):
            total += float(row.get("amount", 0))
            count += 1

    print(f"rows={count} total={total:.2f} avg={total / max(count, 1):.2f}")


if __name__ == "__main__":
    main()
`,
  },
  {
    path: "python/tests/test_handler.py",
    language: "python",
    content: `import json
from report_lambda.handler import handler


def test_handler_returns_200():
    event = {"httpMethod": "POST", "path": "/x", "body": json.dumps({"a": 1})}
    res = handler(event, None)
    assert res["statusCode"] == 200
    body = json.loads(res["body"])
    assert body["ok"] is True
    assert body["echo"] == {"a": 1}
`,
  },
  {
    path: "node/auth-lambda/index.js",
    language: "javascript",
    content: `// AWS Lambda handler — Node.js 20.x runtime.
// Invoke from the Lambda Tester tab with an API Gateway (proxy) event.

export const handler = async (event, context) => {
  console.info(\`\${event.httpMethod ?? "EVENT"} \${event.path ?? ""}\`.trim());

  const body = event.body ? JSON.parse(event.body) : {};

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      runtime: \`node\${process.versions.node}\`,
      requestId: context?.awsRequestId ?? null,
      receivedAt: new Date().toISOString(),
      echo: body,
    }),
  };
};
`,
  },
  {
    path: "node/auth-lambda/package.json",
    language: "json",
    content: `{
  "name": "auth-lambda",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "test": "node --test",
    "start": "node index.js"
  },
  "dependencies": {
    "aws-sdk": "^2.1691.0",
    "jsonwebtoken": "^9.0.2"
  }
}
`,
  },
  {
    path: "node/scripts/server.js",
    language: "javascript",
    content: `// Tiny Node.js HTTP server — run with:  node node/scripts/server.js
import { createServer } from "node:http";

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, path: req.url, method: req.method }));
});

server.listen(3000, () => console.log("listening on http://localhost:3000"));
`,
  },
  {
    path: "node/auth-lambda/handler.test.js",
    language: "javascript",
    content: `import { test } from "node:test";
import assert from "node:assert/strict";
import { handler } from "./index.js";

test("returns 200 with echoed body", async () => {
  const res = await handler(
    { httpMethod: "POST", path: "/login", body: JSON.stringify({ u: "n" }) },
    { awsRequestId: "req-1" },
  );
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.deepEqual(body.echo, { u: "n" });
});
`,
  },
  {
    path: "README.md",
    language: "markdown",
    content: `# Nova IDE Sample Workspace

A tiny .NET 9 web API, an AWS Lambda function, and an xUnit test project.

- \`src/HelloApi\` — minimal ASP.NET Core API
- \`src/OrderLambda\` — API Gateway proxy Lambda
- \`tests/HelloApi.Tests\` — xUnit tests

Open the **Lambda Tester** tab to invoke \`OrderLambda\` with a sample event.
`,
  },
];

export const SAMPLE_LAMBDA_EVENT = JSON.stringify(
  {
    httpMethod: "POST",
    path: "/orders",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: "ord_1234", total: 42.5, currency: "USD" }),
    isBase64Encoded: false,
  },
  null,
  2,
);

const CONSOLE_APP: IdeFile[] = [
  {
    path: "src/ConsoleApp/Program.cs",
    language: "csharp",
    content: `Console.WriteLine("Hello from your new .NET console app!");

var name = args.Length > 0 ? args[0] : "world";
Console.WriteLine($"Greetings, {name}.");
`,
  },
  {
    path: "src/ConsoleApp/ConsoleApp.csproj",
    language: "xml",
    content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>ConsoleApp</RootNamespace>
  </PropertyGroup>
</Project>
`,
  },
];

const README = STARTER_PROJECT.find((f) => f.path === "README.md")!;

function pick(prefixes: string[]): IdeFile[] {
  return STARTER_PROJECT.filter((f) => prefixes.some((p) => f.path.startsWith(p)));
}

export function filesForTemplate(id: string): IdeFile[] {
  const extra = extraFilesForTemplate(id);
  if (extra) return extra;
  switch (id) {
    case "dotnet-console": return [...CONSOLE_APP, README];
    case "dotnet-webapi": return [...pick(["src/HelloApi/"]), README];
    case "dotnet-lambda": return [...pick(["src/OrderLambda/"]), README];
    case "dotnet-xunit": return [...pick(["tests/HelloApi.Tests/"]), README];
    case "python-lambda": return [...pick(["python/report_lambda/", "python/tests/"]), README];
    case "python-script": return [...pick(["python/scripts/"]), README];
    case "node-lambda": return [...pick(["node/auth-lambda/"]), README];
    case "node-server": return [...pick(["node/scripts/"]), README];
    default: return STARTER_PROJECT;
  }
}


const MCP_FASTMCP: IdeFile[] = [
  {
    path: "app/server.py",
    language: "python",
    content: `from fastmcp import FastMCP

mcp = FastMCP("Nova Tools")


@mcp.tool()
def greet(name: str) -> str:
    """Return a friendly greeting for the given name."""
    return f"Hello, {name}! Welcome to MCP."


@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers together."""
    return a + b


@mcp.tool()
def shout(text: str) -> str:
    """Uppercase the given text."""
    return text.upper()


if __name__ == "__main__":
    mcp.run(transport="http", port=8000)
`,
  },
  {
    path: "app/requirements.txt",
    language: "markdown",
    content: `fastmcp>=2.3.0
uvicorn>=0.30.0
`,
  },
  {
    path: "app/test_server.py",
    language: "python",
    content: `from server import greet, add


def test_greet():
    assert greet("Ada").startswith("Hello, Ada")


def test_add():
    assert add(2, 3) == 5
`,
  },
  {
    path: "README.md",
    language: "markdown",
    content: `# FastMCP Server

Edit \`app/server.py\`, hit **Save all**, and the runner restarts the server and
refreshes the **Preview** tab at \`http://localhost:8000\`.

Every function decorated with \`@mcp.tool()\` shows up in the preview's tool
inspector, where you can call it with real arguments.

Connect a client with:

\`\`\`json
{ "mcpServers": { "nova": { "url": "http://localhost:8000/mcp" } } }
\`\`\`
`,
  },
];

const MCP_GRADIO: IdeFile[] = [
  {
    path: "app/app.py",
    language: "python",
    content: `import gradio as gr


def letter_counter(word: str, letter: str) -> int:
    """Count how many times a letter appears in a word."""
    return word.lower().count(letter.lower())


demo = gr.Interface(
    fn=letter_counter,
    inputs=["text", "text"],
    outputs="number",
    title="Letter Counter",
    description="Counts occurrences of a letter inside a word.",
)

if __name__ == "__main__":
    demo.launch(mcp_server=True, server_port=7860)
`,
  },
  {
    path: "app/requirements.txt",
    language: "markdown",
    content: `gradio[mcp]>=5.0.0
`,
  },
  {
    path: "README.md",
    language: "markdown",
    content: `# Gradio MCP Server

Gradio can expose any \`gr.Interface\` function as an MCP tool by launching with
\`mcp_server=True\`.

Edit \`app/app.py\`, press **Save all**, and the **Preview** tab reloads the app
at \`http://localhost:7860\` with the MCP endpoint at
\`http://localhost:7860/gradio_api/mcp/sse\`.
`,
  },
];

const PROBLEM_MD: IdeFile = {
  path: "PROBLEM.md",
  language: "markdown",
  content: `# Practice problem — Hello, World!

Implement \`solution\` so that it returns the exact string:

\`\`\`
Hello, World!
\`\`\`

Edit the solution file, press **Save all**, and the test runner re-executes the
test file against your code.
`,
};

const PRACTICE_JS: IdeFile[] = [
  {
    path: "src/solution.js",
    language: "javascript",
    content: `// Return the string "Hello, World!"
function solution() {
  return "Hello, World!";
}

module.exports = { solution };
`,
  },
  {
    path: "tests/solution.test.js",
    language: "javascript",
    content: `const assert = require("node:assert");
const { test } = require("node:test");
const { solution } = require("../src/solution");

test("solution() is callable and returns a value", () => {
  assert.notStrictEqual(solution(), undefined);
});

test("solution() returns a string", () => {
  assert.strictEqual(typeof solution(), "string");
});

test('solution() returns exactly "Hello, World!"', () => {
  assert.strictEqual(solution(), "Hello, World!");
});
`,
  },
  PROBLEM_MD,
];

const PRACTICE_TS: IdeFile[] = [
  {
    path: "src/solution.ts",
    language: "typescript",
    content: `// Return the string "Hello, World!"
export function solution(): string {
  return "Hello, World!";
}
`,
  },
  {
    path: "tests/solution.test.ts",
    language: "typescript",
    content: `import { describe, expect, it } from "vitest";
import { solution } from "../src/solution";

describe("solution", () => {
  it("is callable and returns a value", () => {
    expect(solution()).toBeDefined();
  });

  it("returns a string", () => {
    expect(typeof solution()).toBe("string");
  });

  it('returns exactly "Hello, World!"', () => {
    expect(solution()).toBe("Hello, World!");
  });
});
`,
  },
  PROBLEM_MD,
];

const PRACTICE_PY: IdeFile[] = [
  {
    path: "src/solution.py",
    language: "python",
    content: `def solution():
    """Return the string "Hello, World!"."""
    return "Hello, World!"
`,
  },
  {
    path: "tests/test_solution.py",
    language: "python",
    content: `from src.solution import solution


def test_returns_value():
    assert solution() is not None


def test_returns_string():
    assert isinstance(solution(), str)


def test_returns_hello_world():
    assert solution() == "Hello, World!"
`,
  },
  PROBLEM_MD,
];

const PRACTICE_CS: IdeFile[] = [
  {
    path: "src/Solution.cs",
    language: "csharp",
    content: `public static class Problem
{
    // Return the string "Hello, World!"
    public static string Solution()
    {
        return "Hello, World!";
    }
}
`,
  },
  {
    path: "tests/SolutionTests.cs",
    language: "csharp",
    content: `using Xunit;

public class SolutionTests
{
    [Fact]
    public void Returns_A_Value() => Assert.NotNull(Problem.Solution());

    [Fact]
    public void Returns_A_String() => Assert.IsType<string>(Problem.Solution());

    [Fact]
    public void Returns_Hello_World() => Assert.Equal("Hello, World!", Problem.Solution());
}
`,
  },
  PROBLEM_MD,
];

export function extraFilesForTemplate(id: string): IdeFile[] | null {
  switch (id) {
    case "python-mcp-fastmcp": return MCP_FASTMCP;
    case "python-mcp-gradio": return MCP_GRADIO;
    case "practice-javascript": return PRACTICE_JS;
    case "practice-typescript": return PRACTICE_TS;
    case "practice-python": return PRACTICE_PY;
    case "practice-csharp": return PRACTICE_CS;
    default: return null;
  }
}
