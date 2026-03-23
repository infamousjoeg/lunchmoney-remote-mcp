# Lunch Money Remote MCP Server

## What We're Building

A remotely-hosted Lunch Money MCP server on Joe's existing Hetzner VPS, exposed via Cloudflare Tunnel, so that both Joe and his wife can query their family finances from Claude.ai on any device (web, mobile, desktop) without VPN.

## Why

The current Lunch Money MCP server runs locally via npx/stdio in Claude Desktop on Joe's MacBook. This means:
- Only works from Claude Desktop on the MacBook
- Wife has zero access
- Can't use it from phone or Claude web

The CyberArk Secure AI Agents MCP server already works from Claude.ai because it's a hosted HTTP MCP server. We want the same for Lunch Money.

## Architecture

```
Claude.ai (any device, any user)
  → https://lunchmoney-mcp.<DOMAIN>/mcp
  → Cloudflare Tunnel (cloudflared on Hetzner VPS)
  → localhost:8080 (lunch-money-mcp Node.js server on Hetzner VPS)
  → Lunch Money API (api.lunchmoney.app)
```

## Target Environment

- **Deploy target:** Joe's existing Hetzner VPS (already running, has Tailscale, accessible via SSH)
- **Development machine:** MacBook Intel (Claude Code runs here, SSHs into Hetzner to deploy)
- **Domain/DNS:** Joe's existing Cloudflare-managed domain
- **Base project:** `gilbitron/lunch-money-mcp` (Node.js, streamable HTTP MCP server with API key auth)

## Existing Infrastructure on Hetzner

- Ubuntu Linux VPS
- Tailscale connected (Joe can SSH in)
- Cloudflare infrastructure already configured
- `cloudflared` may or may not be installed yet

## Key Requirements

1. Clone and build `gilbitron/lunch-money-mcp` on the Hetzner VPS
2. Configure with Joe's Lunch Money API token and a generated SERVER_API_KEY
3. Set up Cloudflare Tunnel from the VPS to expose the MCP server on a public subdomain
4. Run both the MCP server and cloudflared as systemd services (auto-start on boot, auto-restart on crash)
5. Both Joe and his wife can add the server URL in Claude.ai Settings > Integrations
6. Full CRUD access to Lunch Money data through Claude.ai from any device

## Security Considerations

- SERVER_API_KEY as bearer token auth (generated strong random key)
- Lunch Money API token stays on the VPS, never sent to Claude/Anthropic
- Cloudflare provides SSL termination, DDoS protection, request logging
- Optional: Cloudflare Access (Zero Trust) for email-based login gating on top of API key
- Both users share the same Lunch Money account and see the same data

## What to Grill

Before writing code, stress-test these decisions:

- Should we use Cloudflare Tunnel or just open a port with Cloudflare proxy (orange cloud)?
- systemd vs Docker for the Node.js process?
- Should we add Cloudflare Access on top of the API key, or is the API key sufficient?
- How do we handle the Lunch Money API token securely on the VPS (env var, dotenv, systemd EnvironmentFile)?
- Do we need a healthcheck endpoint for monitoring?
- Should we pin the Node.js version with nvm or use system Node?
- What happens when the gilbitron repo updates? Manual pull or automated?
- Should Claude Desktop keep using the local stdio server, or switch to the remote one too?

## Commands to Kick Off

```bash
# In Claude Code on MacBook Intel:
cd ~/Projects
mkdir lunchmoney-remote-mcp && cd lunchmoney-remote-mcp
git init

# Copy this file to the repo
# Then run:
# /grill
# /prd
# /decompose
```
