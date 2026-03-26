## Problem Statement

There is no production-ready, broadly deployable MCP server for Lunch Money. The existing `gilbitron/lunch-money-mcp` is unmaintained (3 months inactive, failing CI, 0 stars), supports only HTTP transport, has no tests, and lacks secure credential management. Users who want to query their finances through Claude must either run a fragile local setup or deploy an incomplete server with credentials stored in plain text.

## Solution

Launch `lunchmoney-mcp` as a standalone, npm-published MCP server that covers the full Lunch Money API with 37 tools, supports both local (stdio) and remote (HTTP) deployment, offers multiple OAuth providers for remote auth, and stores credentials securely via OS keychain with encrypted session persistence. Users install with `npx lunchmoney-mcp` and are querying finances in under a minute.

## Technical Constraints

- **Language:** TypeScript (strict mode, ES modules)
- **Runtime:** Node.js 22.x LTS (only — no Cloudflare Workers, Deno, or Bun)
- **Framework:** FastMCP (v3.23+) for MCP protocol, OAuth proxy, transport abstraction
- **API:** Lunch Money API v1 (`https://dev.lunchmoney.app/v1`)
- **Testing:** Vitest with >90% coverage
- **Publishing:** npm as `lunchmoney-mcp`
- **Credential storage:** OS keychain via `keytar` (or equivalent), AES-256-GCM encrypted disk store
- **License:** MIT (with attribution to original `gilbitron/lunch-money-mcp`)

## User Stories

1. **[P0]** As a Claude Desktop user, I want to install the Lunch Money MCP server with a single command, so that I can query my finances without complex setup
   - AC: `npx lunchmoney-mcp` starts the server in stdio mode
   - AC: First run without an API token returns a helpful message explaining how to configure it
   - AC: `npx lunchmoney-mcp setup` interactively prompts for the API token and stores it in the OS keychain
   - AC: Subsequent runs read the token from the keychain automatically — no ENV var needed

2. **[P0]** As a Claude Code user, I want to configure my API token without leaving the chat, so that setup is frictionless
   - AC: The server exposes a `configureLunchMoneyToken` MCP tool
   - AC: User says "set up my lunch money token, it's abc123" and Claude calls the tool
   - AC: The tool stores the token in the OS keychain
   - AC: All other tools work immediately after configuration

3. **[P0]** As a user, I want my credentials stored securely, so that my financial API token is never in plain text on disk
   - AC: API token and OAuth client credentials are stored in the OS keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
   - AC: OAuth session tokens are stored on disk encrypted with AES-256-GCM
   - AC: The disk store encryption key is stored in the OS keychain — disk files are useless without it
   - AC: `LUNCH_MONEY_API_TOKEN` ENV var works as fallback for headless environments (Docker, systemd)
   - AC: SECURITY.md documents the full credential architecture

4. **[P0]** As a self-hoster, I want to deploy the MCP server remotely with OAuth authentication, so that my family can access finances from any device via Claude.ai
   - AC: `npx lunchmoney-mcp --http` starts the server in HTTP stream mode
   - AC: Server requires OAuth authentication when running in HTTP mode
   - AC: Google OAuth works with `AUTH_PROVIDER=google` + client credentials
   - AC: GitHub OAuth works with `AUTH_PROVIDER=github` + client credentials
   - AC: CyberArk Identity works with `AUTH_PROVIDER=cyberark` + OIDC endpoints
   - AC: Any OAuth 2.0 provider works with `AUTH_PROVIDER=custom` + endpoint URLs
   - AC: OAuth sessions persist across server restarts (encrypted disk store)

5. **[P0]** As a user, I want all 37 Lunch Money tools available, so that I have full CRUD access to my financial data
   - AC: All 37 tools from the existing codebase work in both stdio and HTTP transport
   - AC: Tools include: user, categories (7), tags (4), transactions (10), recurring (4), budgets (4), assets (4), plaid accounts (2)
   - AC: 157 tests pass with >90% coverage

6. **[P1]** As a self-hoster, I want pre-built deployment configs, so that I can deploy to my infrastructure without writing configs from scratch
   - AC: `Dockerfile` and `docker-compose.yml` for container deployment
   - AC: systemd unit file for VPS/bare metal
   - AC: `railway.json` for Railway one-click deploy
   - AC: `render.yaml` for Render deployment
   - AC: `fly.toml` for Fly.io deployment
   - AC: Each deployment target documented in README

7. **[P1]** As a developer, I want to install the server from npm, so that I don't need to clone a repo
   - AC: `npm install -g lunchmoney-mcp` installs the package globally
   - AC: `npx lunchmoney-mcp` runs without prior installation
   - AC: Package published to npm with proper `bin` field, README, and keywords
   - AC: Package size is reasonable (<5MB)

8. **[P1]** As a user, I want comprehensive documentation, so that I can set up and troubleshoot the server
   - AC: README covers quick start, features, setup, auth providers, deployment, tools reference
   - AC: SECURITY.md documents credential storage architecture, encryption details, threat model
   - AC: README badges show npm version, test status, coverage, license

9. **[P2]** As a contributor, I want clear contribution guidelines, so that I can submit quality pull requests
   - AC: CONTRIBUTING.md with development setup, test instructions, PR guidelines
   - AC: GitHub Actions CI runs tests and coverage on PRs

## Implementation Decisions

**Major modules:**

- **CLI module** — Parses `--http`, `setup`, and other CLI arguments. Routes to the correct entrypoint (stdio server, HTTP server, or setup wizard). Uses `commander` or minimal arg parsing.
- **Credential store module** — Abstracts OS keychain access (get/set/delete for `lunchmoney-mcp` service namespace). Falls back to ENV vars when keychain is unavailable. Provides `getApiToken()`, `getOAuthCredentials()`, `setApiToken()`, etc.
- **Encrypted session store module** — Wraps FastMCP's `EncryptedTokenStorage` + `DiskStore`. Fetches encryption key from keychain. Creates data directory via `env-paths`. Implements FastMCP's `TokenStorage` interface.
- **Auth provider factory** — Reads `AUTH_PROVIDER` env var, returns the correct FastMCP auth provider instance (GoogleProvider, GitHubProvider, generic OAuthProvider). Fetches client credentials from credential store.
- **Server factory** — Creates and configures the FastMCP server instance. Registers all 37 tools + the `configureLunchMoneyToken` setup tool. Selects transport based on CLI flag. Wires auth provider and token storage for HTTP mode.
- **Tool modules** — Existing 8 tool files (user, categories, tags, transactions, recurring, budgets, assets, plaid). No changes needed.
- **Setup wizard** — Interactive CLI flow for `npx lunchmoney-mcp setup`. Prompts for API token, optionally opens browser to Lunch Money developer page, stores in keychain.

**Key interfaces:**

- `CredentialStore` — `getApiToken(): Promise<string | null>`, `setApiToken(token: string): Promise<void>`, `getOAuthCredentials(): Promise<{clientId, clientSecret} | null>`, `setOAuthCredentials(creds): Promise<void>`, `getEncryptionKey(): Promise<string>`, `clear(): Promise<void>`
- `createServer(options: { transport: 'stdio' | 'http', credentialStore: CredentialStore }): FastMCP` — factory function
- `createAuthProvider(provider: string, credentialStore: CredentialStore): AuthProvider` — factory function

**npm package configuration:**
- `bin` field: `{ "lunchmoney-mcp": "./dist/cli.js" }`
- Entry point split: `cli.ts` (CLI parsing) → `server.ts` (server factory) → `index.ts` (tool registration)
- `files` field to include only `dist/`, `README.md`, `LICENSE`, `SECURITY.md`

## Testing Decisions

- **Existing tests:** All 157 tests for tools and API client carry over unchanged. They mock `LunchMoneyClient` and don't touch auth/transport — fully portable.
- **New tests needed:**
  - Credential store module: mock keychain, test get/set/fallback to ENV
  - Auth provider factory: test each provider selection, test invalid provider
  - CLI module: test arg parsing, test routing
  - Setup wizard: test interactive flow with mocked stdin
  - Server factory: test stdio vs HTTP transport selection
  - `configureLunchMoneyToken` tool: test keychain storage
- **Coverage target:** >90% on all modules
- **CI:** GitHub Actions running `npm test` on push/PR

## Out of Scope

- Cloudflare Workers / edge runtime support
- Lunch Money API v2 (stay on v1 until v2 is GA)
- Cryptocurrency endpoints
- SaaS / hosted offering
- Multi-user account management (each deployment is single-account)
- Mobile app or web UI
- Rate limiting / request throttling (Lunch Money API handles this)
- Kubernetes deployment configs

## Further Notes

- Credit `gilbitron/lunch-money-mcp` (MIT) in LICENSE and README as the original project this was derived from
- The `configureLunchMoneyToken` tool should validate the token by making a test API call (`GET /me`) before storing it
- For Docker deployments, keychain is unavailable — ENV vars are the credential path. Document this clearly.
- The `keytar` npm package provides cross-platform keychain access but requires native compilation. If this causes install issues, consider `@aspect-build/secret-service` or `node-keytar` alternatives. Evaluate during implementation.
- Consider adding a `npx lunchmoney-mcp doctor` command that checks: Node version, keychain access, API token validity, network connectivity to Lunch Money API
