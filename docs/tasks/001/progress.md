# Task 001: Deploy MCP server on VPS with Cloudflare Tunnel

## Status: Complete

## Completed Steps

- [x] Node.js 22.22.1 LTS installed via NodeSource
- [x] `lunchmoney` system user created (uid=999, no login shell)
- [x] Fork cloned to /opt/lunchmoney-mcp, built successfully
- [x] Environment file at /etc/lunchmoney-mcp/env (0600, root:root) with LUNCH_MONEY_API_TOKEN, SERVER_API_KEY, PORT=8090
- [x] systemd unit lunchmoney-mcp.service created (Restart=always, RestartSec=5, runs as lunchmoney user)
- [x] `systemctl show` does not expose token values (EnvironmentFile used, not Environment)
- [x] Auto-restart verified: kill process → service restarts within 5 seconds
- [x] cloudflared 2026.3.0 installed, tunnel `lunchmoney-mcp` created (ID: 6bfee962-36ea-4e1b-9f64-c9c2a2f10c96)
- [x] DNS CNAME routed: lunchmoney-mcp.joe-garcia.com → tunnel
- [x] cloudflared systemd service enabled and running
- [x] Public healthcheck verified: `curl https://lunchmoney-mcp.joe-garcia.com/health` returns 200
- [x] Auth rejection verified: unauthenticated POST to /mcp returns 401

## Notes

- Port 8080 was already in use by a Python process; using port 8090 instead
- Tunnel ID: 6bfee962-36ea-4e1b-9f64-c9c2a2f10c96
- VPS reboot test deferred (would disrupt other services on the VPS)
