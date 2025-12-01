#!/usr/bin/env node
/**
 * MCP Test Client for Lunch Money MCP Server
 *
 * This script connects to the MCP server via HTTP streaming transport (StreamableHTTP)
 * and provides a simple interface to test tools.
 *
 * Usage:
 *   npm run test:client
 *   npm run test:client -- --tool getUser
 *   npm run test:client -- --tool getCategories
 */

import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const PORT = parseInt(process.env.PORT || "8080", 10);
const SERVER_URL = process.env.MCP_SERVER_URL || `http://localhost:${PORT}`;
const MCP_ENDPOINT = process.env.MCP_ENDPOINT || "/mcp"; // FastMCP default endpoint
const SERVER_API_KEY = process.env.SERVER_API_KEY; // Optional API key for authentication
const DEFAULT_TOOL = "getUser";

interface ToolCall {
    name: string;
    arguments?: Record<string, unknown>;
}

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const toolArgIndex = args.indexOf("--tool");
    const toolName = toolArgIndex >= 0 && args[toolArgIndex + 1]
        ? args[toolArgIndex + 1]
        : DEFAULT_TOOL;

    const helpIndex = args.indexOf("--help") || args.indexOf("-h");
    if (helpIndex >= 0) {
        console.log(`
MCP Test Client for Lunch Money MCP Server

Usage:
  npm run test:client [options]

Options:
  --tool <name>    Tool to call (default: getUser)
  --list           List all available tools
  --help, -h       Show this help message

Environment Variables:
  PORT             Server port (default: 8080)
  MCP_SERVER_URL   Server URL (default: http://localhost:<PORT>)
  MCP_ENDPOINT     MCP endpoint path (default: /mcp)
  SERVER_API_KEY   API key for authentication (optional, required if server has auth enabled)

Examples:
  npm run test:client
  npm run test:client -- --tool getUser
  npm run test:client -- --tool getCategories
  npm run test:client -- --tool getTransactions --args '{"start_date":"2024-01-01"}'
  npm run test:client -- --list
`);
        process.exit(0);
    }

    const listTools = args.includes("--list");

    console.log(`Connecting to MCP server at ${SERVER_URL}${MCP_ENDPOINT}...\n`);

    // Build headers for the transport
    const headers: Record<string, string> = {
        "Accept": "application/json, text/event-stream",
    };

    // Add Authorization header if API key is provided
    if (SERVER_API_KEY) {
        // Support both "Bearer <key>" and direct key formats
        // Use Bearer format as it's standard
        headers["Authorization"] = SERVER_API_KEY.startsWith("Bearer ")
            ? SERVER_API_KEY
            : `Bearer ${SERVER_API_KEY}`;
        console.log("✓ Using API key authentication");
    } else {
        console.log("⚠ No API key provided (SERVER_API_KEY not set)");
        console.log("  If the server requires authentication, requests will fail");
    }
    console.log();

    try {
        // Create StreamableHTTP transport for HTTP streaming
        const transportUrl = `${SERVER_URL}${MCP_ENDPOINT}`;
        console.log(`Connecting to: ${transportUrl}`);

        const transport = new StreamableHTTPClientTransport(
            new URL(transportUrl),
            {
                // FastMCP requires Accept header for both JSON and SSE
                requestInit: {
                    headers,
                },
            }
        );

        // Create MCP client
        const client = new Client(
            {
                name: "lunch-money-test-client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            }
        );

        // Connect to server (initialization happens automatically)
        await client.connect(transport);
        console.log("✓ Connected to MCP server\n");

        // Get server info (available after initialization)
        const serverVersion = client.getServerVersion();
        const instructions = client.getInstructions();
        console.log("Server Info:");
        if (serverVersion) {
            console.log(`  Name: ${serverVersion.name}`);
            console.log(`  Version: ${serverVersion.version}`);
        }
        if (instructions) {
            console.log(`  Instructions: ${instructions}`);
        }
        console.log();

        // List available tools
        const tools = await client.listTools();
        const toolsList = Array.isArray(tools.tools) ? tools.tools : [];
        console.log(`Available tools (${toolsList.length}):`);
        toolsList.forEach((tool: { name: string; description?: string }) => {
            console.log(`  - ${tool.name}: ${tool.description || "No description"}`);
        });
        console.log();

        if (listTools) {
            await client.close();
            process.exit(0);
        }

        // Find the requested tool
        const tool = toolsList.find((t: { name: string }) => t.name === toolName);
        if (!tool) {
            console.error(`Error: Tool "${toolName}" not found`);
            console.error(`Available tools: ${toolsList.map((t: { name: string }) => t.name).join(", ")}`);
            await client.close();
            process.exit(1);
        }

        // Parse tool arguments if provided
        let toolArgs: Record<string, unknown> = {};
        const argsIndex = args.indexOf("--args");
        if (argsIndex >= 0 && args[argsIndex + 1]) {
            try {
                toolArgs = JSON.parse(args[argsIndex + 1]);
            } catch (error) {
                console.error(`Error parsing --args: ${error}`);
                await client.close();
                process.exit(1);
            }
        }

        // Call the tool
        console.log(`Calling tool: ${toolName}`);
        if (Object.keys(toolArgs).length > 0) {
            console.log(`Arguments: ${JSON.stringify(toolArgs, null, 2)}`);
        }
        console.log();

        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs,
        });

        console.log("Result:");
        const content = result.content;
        if (content && Array.isArray(content) && content.length > 0) {
            content.forEach((item: { type: string; text?: string;[key: string]: unknown }) => {
                if (item.type === "text" && item.text) {
                    try {
                        // Try to parse and pretty-print JSON
                        const parsed = JSON.parse(item.text);
                        console.log(JSON.stringify(parsed, null, 2));
                    } catch {
                        // If not JSON, just print as-is
                        console.log(item.text);
                    }
                } else {
                    console.log(JSON.stringify(item, null, 2));
                }
            });
        } else {
            console.log("(No content returned)");
        }

        if (result.isError) {
            console.error("\nTool returned an error");
            process.exit(1);
        }

        // Close the connection
        await client.close();
        console.log("\n✓ Test completed successfully");
    } catch (error) {
        console.error("\n❌ Error:", error);
        if (error instanceof Error) {
            console.error("Message:", error.message);

            // Provide helpful error messages for common issues
            if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
                console.error("\n💡 Tip: Make sure your MCP server is running!");
                console.error("   Start it with: npm run dev");
                console.error(`   Expected server URL: ${SERVER_URL}${MCP_ENDPOINT}`);
            }

            if (error.message.includes("404") || error.message.includes("Not Found")) {
                console.error("\n💡 Tip: The server endpoint might be incorrect.");
                console.error(`   Trying to connect to: ${SERVER_URL}${MCP_ENDPOINT}`);
                console.error("   Check your FastMCP server configuration.");
                console.error("   FastMCP httpStream default endpoint is /mcp");
            }

            if (error.message.includes("Invalid content type") || error.message.includes("text/event-stream") || error.message.includes("Not Acceptable")) {
                console.error("\n💡 Tip: The endpoint might not be serving the correct content type.");
                console.error(`   Trying to connect to: ${SERVER_URL}${MCP_ENDPOINT}`);
                console.error("   Make sure the server is using httpStream transport with stateless mode enabled.");
                console.error("   FastMCP httpStream endpoint should be /mcp by default");
            }

            if (error.message.includes("401") || error.message.includes("Unauthorized")) {
                console.error("\n💡 Tip: Authentication failed. The server requires an API key.");
                console.error("   Set the SERVER_API_KEY environment variable:");
                console.error("   export SERVER_API_KEY=your_api_key_here");
                console.error("   Or add it to your .env file:");
                console.error("   SERVER_API_KEY=your_api_key_here");
                console.error("\n   The API key should be sent in the Authorization header:");
                console.error("   Authorization: Bearer <your_api_key>");
            }

            if (error.stack && process.env.DEBUG) {
                console.error("\nStack:", error.stack);
            }
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
