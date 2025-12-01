# Lunch Money MCP Server (HTTP)

A MCP (HTTP) server providing full integration with the Lunch Money API. This server enables AI assistants to interact with your Lunch Money financial data through a standardized interface.

Note: This is designed to be used as a streamable HTTP server. If you're looking for local MCP support (stdio transport), see [akutishevsky/lunchmoney-mcp](https://github.com/akutishevsky/lunchmoney-mcp).

## Features

- **User Management** - Access user account details
- **Categories** - Create, update, and organize spending categories
- **Tags** - Manage transaction tags
- **Transactions** - Full CRUD operations on transactions with advanced filtering
- **Recurring Items** - Track and manage recurring expenses
- **Budgets** - Create and monitor budgets by category
- **Assets** - Track manually-managed assets

## Prerequisites

- Node.js 18+ (for native fetch support)
- A Lunch Money API access token ([Get one here](https://my.lunchmoney.app/developers))

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and add your API token:

```bash
cp .env.example .env
```

Edit `.env` and add your Lunch Money API token:

```
LUNCH_MONEY_API_TOKEN=your_api_token_here
PORT=8080
```

## Usage

### Development Mode

Run the server in development mode with hot reload:

```bash
npm run dev
```

### Production Mode

Build and run:

```bash
npm run build
npm start
```

The server will start on port 8080 (or the port specified in your `.env` file).

### Testing with FastMCP CLI

You can test the server using the FastMCP development tools:

```bash
npx fastmcp dev src/index.ts
```

Or use the MCP Inspector:

```bash
npx fastmcp inspect src/index.ts
```

### Testing with MCP Test Client

This project includes a test client script that connects to your MCP server and allows you to test tools programmatically.

First, make sure your server is running:

```bash
npm run dev
```

Then in another terminal, install dependencies (if not already installed) and run the test client:

```bash
npm install
npm run test:client
```

**Available test client commands:**

- List all available tools:
  ```bash
  npm run test:client -- --list
  ```

- Call a specific tool (defaults to `getUser`):
  ```bash
  npm run test:client -- --tool getUser
  npm run test:client -- --tool getCategories
  npm run test:client -- --tool getTransactions
  ```

- Call a tool with arguments:
  ```bash
  npm run test:client -- --tool getTransactions --args '{"start_date":"2024-01-01","end_date":"2024-12-31"}'
  ```

- Show help:
  ```bash
  npm run test:client -- --help
  ```

**Environment Variables:**

You can configure the test client using environment variables:

- `MCP_SERVER_URL` - Server URL (default: `http://localhost:8080`)
- `MCP_ENDPOINT` - MCP endpoint path (default: `/mcp` - FastMCP's httpStream default)

## Available Tools

### User Management

- **getUser** - Get the current user's account details including email, name, currency preferences, and settings

### Categories

- **getCategories** - List all categories including category groups and parent categories
- **createCategory** - Create a new spending or income category
- **updateCategory** - Update an existing category's properties
- **deleteCategory** - Delete a category by ID

### Tags

- **getTags** - List all transaction tags
- **createTag** - Create a new tag for categorizing transactions
- **updateTag** - Update an existing tag's name
- **deleteTag** - Delete a tag by ID

### Transactions

- **getTransactions** - List transactions with advanced filtering options including:
  - Date range (start_date, end_date)
  - Category (category_id)
  - Tags (tag_id)
  - Account (account_id)
  - Status (cleared, uncleared, recurring, recurring_suggested)
  - Pagination (offset, limit)
- **createTransaction** - Create a new transaction (expense, income, or transfer)
- **updateTransaction** - Update an existing transaction's properties
- **deleteTransaction** - Delete a transaction by ID
- **bulkUpdateTransactions** - Bulk update multiple transactions with the same changes

### Recurring Items

- **getRecurringItems** - List all recurring expense and income items
- **createRecurringItem** - Create a new recurring expense or income item
- **updateRecurringItem** - Update an existing recurring item's properties
- **deleteRecurringItem** - Delete a recurring item by ID

### Budgets

- **getBudgets** - List all budgets with their category assignments and date ranges
- **createBudget** - Create a new budget for a category with amount and date range
- **updateBudget** - Update an existing budget's amount, category, or date range
- **deleteBudget** - Delete a budget by ID

### Assets

- **getAssets** - List all manually-managed assets
- **createAsset** - Create a new manually-managed asset
- **updateAsset** - Update an existing asset's properties including balance and metadata
- **deleteAsset** - Delete an asset by ID

## Configuration

### Environment Variables

- `LUNCH_MONEY_API_TOKEN` (required) - Your Lunch Money API access token
- `PORT` (optional) - Server port, defaults to 8080
- `SERVER_API_KEY` (optional) - API key for server authentication. If set, all requests must include this key in the `Authorization` header (format: `Bearer <key>` or just `<key>`)

### Using with Claude Desktop

Add the following to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "lunch-money": {
      "command": "node",
      "args": ["/path/to/lunch-money-mcp/dist/index.js"],
      "env": {
        "LUNCH_MONEY_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "lunch-money": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/lunch-money-mcp",
      "env": {
        "LUNCH_MONEY_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

## Deployment

### Deploying to Fly.io

This MCP server can be deployed to Fly.io with API key authentication.

#### Prerequisites

1. Install the Fly.io CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Authenticate with Fly.io:
   ```bash
   fly auth login
   ```

#### Initial Setup

1. Launch your app (this will create `fly.toml` if it doesn't exist):
   ```bash
   fly launch --no-deploy
   ```

   During setup:
   - Choose a unique app name (or use the default)
   - Select your preferred region
   - Decline adding a database (not needed)
   - Don't deploy yet (we'll set secrets first)

2. Set your secrets (API keys):
   ```bash
   fly secrets set LUNCH_MONEY_API_TOKEN=your_lunch_money_token
   fly secrets set SERVER_API_KEY=your_secure_api_key_here
   ```

   **Important:** Generate a strong, random API key for `SERVER_API_KEY`. This will be used to authenticate requests to your MCP server.

3. Deploy your application:
   ```bash
   fly deploy
   ```

4. Verify deployment:
   ```bash
   fly status
   ```

#### Using Your Deployed Server

Once deployed, your server will be available at `https://your-app-name.fly.dev/mcp`.

**With API Key Authentication:**

All requests must include the API key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer your_secure_api_key_here" \
     https://your-app-name.fly.dev/mcp
```

**Health Check:**

The server includes a health check endpoint using FastMCP's built-in `/health` endpoint (no authentication required):

```bash
curl https://your-app-name.fly.dev/health
```

#### Managing Secrets

- View secrets: `fly secrets list`
- Update a secret: `fly secrets set SERVER_API_KEY=new_key`
- Remove a secret: `fly secrets unset SERVER_API_KEY`

#### Updating Your Deployment

After making code changes:

```bash
fly deploy
```

#### Viewing Logs

```bash
fly logs
```

## API Reference

This MCP server integrates with the [Lunch Money API v1](https://lunchmoney.dev/). All endpoints follow the official API documentation.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
