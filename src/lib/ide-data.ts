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
