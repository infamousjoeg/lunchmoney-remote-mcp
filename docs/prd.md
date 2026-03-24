## Problem Statement

The Lunch Money MCP server currently runs locally via npx/stdio in Claude Desktop on Joe's MacBook. This means only Joe can access family finance data, only from that one machine, and only through Claude Desktop. His wife has no access at all, and neither can use it from Claude.ai on the web or mobile.

## Solution

Deploy the existing `gilbitron/lunch-money-mcp` Node.js server on Joe's Hetzner VPS, exposed to the internet via a Cloudflare Tunnel at `lunchmoney-mcp.joe-garcia.com`. Both Joe and his wife connect from Claude.ai on any device. Two layers of auth protect the endpoint: Cloudflare Access Service Tokens (OAuth `client_credentials`) at the edge, and a `SERVER_API_KEY` Bearer token at the application layer.

## Technical Constraints

- **Runtime:** Node.js LTS (22.x) via NodeSource APT repo on Ubuntu
- **Deployment target:** Hetzner VPS (`178.156.141.254`), SSH as root
- **Networking:** Cloudflare Tunnel (`cloudflared`) — no inbound ports opened
- **Process management:** systemd for both the MCP server and `cloudflared`
- **Domain:** `lunchmoney-mcp.joe-garcia.com` via Cloudflare DNS
- **Base project:** Fork of `gilbitron/lunch-money-mcp` (no code modifications needed)
- **Cloudflare configuration:** Automated via Cloudflare MCP server in Claude Code
- **External dependencies:** Lunch Money API (`api.lunchmoney.app`), Cloudflare Zero Trust, FastMCP

## User Stories

1. **[P0]** As a family member, I want to query my Lunch Money data from Claude.ai on any device, so that I can check finances without being on Joe's MacBook
   - AC: Sending a message like "What did I spend on groceries this month?" in Claude.ai returns accurate Lunch Money data
   - AC: Works from Claude.ai web, mobile, and Claude Desktop
   - AC: Both Joe and his wife can use it independently from their own Claude.ai accounts

2. **[P0]** As the server operator, I want the MCP server to start automatically on VPS boot and restart on crash, so that it's always available without manual intervention
   - AC: `sudo systemctl enable lunchmoney-mcp` is configured and the service starts on reboot
   - AC: Killing the Node.js process results in automatic restart within 5 seconds
   - AC: `sudo systemctl enable cloudflared` is configured and the tunnel starts on reboot

3. **[P0]** As the server operator, I want two layers of authentication protecting the endpoint, so that financial data is not exposed to unauthorized users
   - AC: Requests without a valid Cloudflare Access Service Token are rejected at the edge (never reach the VPS)
   - AC: Requests without a valid `SERVER_API_KEY` Bearer token are rejected by the application with 401
   - AC: Joe and wife each have independent Cloudflare Access Service Tokens that can be revoked separately

4. **[P1]** As the server operator, I want a healthcheck endpoint for uptime monitoring, so that I know when the server goes down
   - AC: `GET /health` returns 200 with `{"status":"ok"}` without requiring authentication
   - AC: A Cloudflare WAF rate limiting rule limits `/health` to 10 requests/minute/IP
   - AC: `cloudflared` is configured to use the healthcheck for origin health verification

5. **[P1]** As the server operator, I want secrets stored securely on the VPS, so that API tokens are not exposed if the service user is compromised
   - AC: Tokens live in `/etc/lunchmoney-mcp/env` with mode `0600` owned by `root:root`
   - AC: The systemd service runs as a dedicated `lunchmoney` user (non-root)
   - AC: `systemctl show lunchmoney-mcp` does not display token values

6. **[P1]** As the server operator, I want to pull upstream updates easily, so that I get new Lunch Money tools and bug fixes
   - AC: `git fetch upstream && git merge upstream/main` on the VPS merges cleanly when no local code changes exist
   - AC: `npm install && npm run build && sudo systemctl restart lunchmoney-mcp` completes the update

7. **[P2]** As a Claude Desktop user, I want to switch from the local stdio MCP server to the remote HTTP server, so that I have one consistent setup everywhere
   - AC: Claude Desktop MCP config points to `https://lunchmoney-mcp.joe-garcia.com/mcp`
   - AC: Local `npx` MCP server entry is removed from Claude Desktop config

## Implementation Decisions

**Modules / Components:**

- **systemd unit: `lunchmoney-mcp.service`** — Runs `node dist/index.js` as the `lunchmoney` user. Uses `EnvironmentFile=/etc/lunchmoney-mcp/env`. Configured with `Restart=on-failure`, `RestartSec=5`.
- **systemd unit: `cloudflared.service`** — Runs the Cloudflare Tunnel daemon. May already be installed; if not, install and configure. Routes `lunchmoney-mcp.joe-garcia.com` to `localhost:8080`.
- **Cloudflare Tunnel** — Named tunnel authenticated to Cloudflare, routing the subdomain to the VPS origin. Configured via `cloudflared tunnel` CLI on the VPS.
- **Cloudflare Access Application** — Protects `lunchmoney-mcp.joe-garcia.com` with a Service Auth policy. Configured via Cloudflare MCP server.
- **Cloudflare Access Service Tokens** — One per user (Joe, wife). Configured via Cloudflare MCP server. Credentials stored in each user's Claude.ai MCP integration settings.
- **Cloudflare WAF Rate Limiting Rule** — Scoped to `/health` path, 10 req/min/IP. Configured via Cloudflare MCP server.
- **VPS environment file** — `/etc/lunchmoney-mcp/env` containing `LUNCH_MONEY_API_TOKEN` and `SERVER_API_KEY`.
- **Deployment** — SSH to VPS as root, `git clone` the fork, `npm install && npm run build`, create systemd units, configure cloudflared tunnel, configure Cloudflare Access.

**Interfaces:**

- Claude.ai → `https://lunchmoney-mcp.joe-garcia.com/mcp` (MCP over HTTP stream, Bearer token auth, OAuth client_credentials via Cloudflare Access)
- MCP server → `https://dev.lunchmoney.app/v1/*` (Lunch Money API, Bearer token auth)
- Healthcheck → `https://lunchmoney-mcp.joe-garcia.com/health` (unauthenticated, rate-limited)

## Testing Decisions

This is an infrastructure/deployment project with no custom application code. Testing is operational verification:

- **Healthcheck:** `curl https://lunchmoney-mcp.joe-garcia.com/health` returns 200
- **Auth rejection:** `curl https://lunchmoney-mcp.joe-garcia.com/mcp` without credentials returns 403 (Cloudflare Access) or 401 (application)
- **Auth acceptance:** Claude.ai with configured MCP integration can list Lunch Money tools
- **Service resilience:** `sudo systemctl kill lunchmoney-mcp` → service restarts within 5 seconds
- **Boot persistence:** VPS reboot → both services come back up automatically

No unit tests or integration test suites — the upstream project owns those.

## Out of Scope

- Custom Lunch Money tool development (upstream's 28+ tools used as-is)
- CI/CD pipeline (SSH + git pull is the deployment method)
- Multi-tenant auth (both users share one Lunch Money account, one SERVER_API_KEY)
- Log aggregation beyond `journalctl`
- Automated upstream sync (manual `git merge` when desired)
- Modifying the upstream MCP server code

## Further Notes

- The env var for the Lunch Money token is `LUNCH_MONEY_API_TOKEN` (upstream's convention), not `LUNCHMONEY_API_KEY`
- The upstream FastMCP server already provides `/health` and `/ready` endpoints, Bearer token auth, and configurable host/port — no code changes needed
- Cloudflare Access Service Tokens use `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers; Claude.ai's `client_credentials` support handles this
- The VPS already has Tailscale installed; `cloudflared` does not conflict (different network layers)
