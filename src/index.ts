import "dotenv/config";
import { FastMCP, GoogleProvider } from "fastmcp";
import { LunchMoneyClient } from "./api/client.js";
import { registerUserTools } from "./tools/user.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerTagTools } from "./tools/tags.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerRecurringTools } from "./tools/recurring.js";
import { registerBudgetTools } from "./tools/budgets.js";
import { registerAssetTools } from "./tools/assets.js";

// Load environment variables
const apiToken = process.env.LUNCH_MONEY_API_TOKEN;
const host = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "8080", 10);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const baseUrl = process.env.BASE_URL || `http://${host}:${port}`;
const jwtSigningKey = process.env.JWT_SIGNING_KEY;

if (!apiToken) {
    console.error(
        "Error: LUNCH_MONEY_API_TOKEN environment variable is required"
    );
    console.error(
        "Please set it in your .env file or as an environment variable"
    );
    process.exit(1);
}

if (!googleClientId || !googleClientSecret) {
    console.error(
        "Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required"
    );
    process.exit(1);
}

// Initialize API client
const client = new LunchMoneyClient(apiToken);

// Create FastMCP server instance with Google OAuth
const mcpServer = new FastMCP({
    name: "Lunch Money MCP",
    version: "1.0.0",
    instructions:
        "This MCP server provides full integration with the Lunch Money API. " +
        "You can manage user accounts, categories, tags, transactions, recurring items, budgets, and assets. " +
        "All operations support full CRUD capabilities with proper validation.",
    health: {
        enabled: true,
    },
    auth: new GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        baseUrl,
        scopes: ["openid", "email"],
        consentRequired: false,
        ...(jwtSigningKey ? { jwtSigningKey } : {}),
    }),
});

// Register all tool modules
registerUserTools(mcpServer, client);
registerCategoryTools(mcpServer, client);
registerTagTools(mcpServer, client);
registerTransactionTools(mcpServer, client);
registerRecurringTools(mcpServer, client);
registerBudgetTools(mcpServer, client);
registerAssetTools(mcpServer, client);

// Start FastMCP server
mcpServer.start({
    transportType: "httpStream",
    httpStream: {
        host,
        port,
        endpoint: "/mcp",
    },
});

console.log(`Lunch Money MCP Server started on port ${port}`);
console.log(`Server ready to accept connections at http://${host}:${port}/mcp`);
console.log(`Health check available at http://${host}:${port}/health`);
console.log(`Google OAuth enabled (base URL: ${baseUrl})`);
console.log(`OAuth callback: ${baseUrl}/oauth/callback`);
