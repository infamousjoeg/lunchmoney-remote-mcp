# Design Decisions

Resolved during `/grill` session on 2026-03-23.

## 1. Networking: Cloudflare Tunnel

**Decision:** Use `cloudflared` tunnel (outbound-only from VPS to Cloudflare edge).

**Rationale:** No inbound ports to open on VPS firewall. Automatic SSL termination, DDoS protection. Single binary with systemd unit — minimal operational overhead. Tailscale on the VPS does not conflict (different network layers: userspace WireGuard on `tailscale0` vs. outbound HTTPS).

**Rejected:** Direct port exposure with Cloudflare orange-cloud proxy (requires opening ports, managing TLS certs, firewall rules).

## 2. Process Management: systemd

**Decision:** Run the Node.js MCP server as a systemd service.

**Rationale:** Consistent operational model with `cloudflared` (also systemd). Provides auto-restart on crash (`Restart=on-failure`), boot-start (`enable`), environment file support, and `journalctl` logging out of the box. Single-process app on a VPS doesn't benefit from Docker's isolation/reproducibility.

**Rejected:** Docker (unnecessary abstraction layer, extra daemon to manage for a single Node.js process).

## 3. Secret Management: systemd EnvironmentFile

**Decision:** Store tokens in `/etc/lunchmoney-mcp/env` (mode `0600`, owned by `root:root`). Reference via `EnvironmentFile=` in the systemd unit. Service runs as a dedicated non-root user (`lunchmoney`).

**Contents of env file:**
```
LUNCHMONEY_API_KEY=<lunch_money_token>
SERVER_API_KEY=<mcp_bearer_token>
```

**Rationale:** systemd reads the env file as root before dropping privileges. The service user cannot read the file directly. Better than dotenv (risk of git commit), bare env vars in unit file (visible via `systemctl show`), or a secrets manager (overkill for personal VPS).

## 4. Authentication: Cloudflare Access + Application API Key (Two Layers)

**Decision:** Use Cloudflare Access with Service Tokens (OAuth `client_credentials`) as the edge layer, plus `SERVER_API_KEY` Bearer token as the application layer.

**Rationale:** Financial data warrants defense in depth. Claude.ai's remote MCP config supports `client_credentials` flow, so Cloudflare Access Service Tokens work. Benefits:
- Edge-level rejection — unauthenticated requests never reach the VPS
- Per-user revocation — separate Service Tokens for Joe and wife, independently revocable
- Audit logs via Cloudflare Access dashboard
- Two independent credential layers

**Rejected:** API key only (single layer insufficient for financial data). Cloudflare Access with interactive login (incompatible with machine-to-machine MCP auth).

## 5. Healthcheck: Yes, with Rate Limiting

**Decision:** Add a `/health` endpoint returning `{"status":"ok"}` (200 OK). Exempt it from Cloudflare Access auth. Apply a Cloudflare WAF rate limiting rule: 10 requests/minute/IP.

**Rationale:** Enables uptime monitoring, `cloudflared` origin health checks, and manual verification. Rate limiting prevents DDoS abuse on the unauthenticated endpoint. Minimal response with no backend calls keeps resource cost near zero.

## 6. Node.js Version: System Node via NodeSource (LTS)

**Decision:** Install Node.js LTS (e.g., 22.x) via the NodeSource APT repository. Managed through standard `apt upgrade`.

**Rationale:** Single-purpose VPS running one app doesn't need `nvm`'s version switching. NodeSource pins to a major version (security patches via apt, no surprise major bumps). `nvm` is user-scoped and awkward in systemd units.

**Rejected:** nvm (designed for developer workstations, not servers).

## 7. Upstream Sync: Fork with Upstream Remote

**Decision:** This repo (`infamousjoeg/lunchmoney-remote-mcp`) is a GitHub fork of `gilbitron/lunch-money-mcp`. Upstream tracked via `git remote add upstream`. Sync with `git fetch upstream && git merge upstream/main`.

**Rationale:** The upstream repo cannot be consumed as an npm dependency (entry point starts the server immediately, tools registered inline, not published to npm). Fork-and-extend is the only practical approach. Our changes (healthcheck, deployment config) are isolated from upstream's tool logic, keeping merges clean.

**Rejected:** npm wrapper (upstream not importable as library). Two-repo split (unnecessary complexity for a small project).

## 8. Claude Desktop: Switch to Remote Server

**Decision:** Migrate Claude Desktop from local stdio transport to the remote HTTP server.

**Rationale:** Single source of truth — one server, one config, one API token. Updates to tools/config on VPS are picked up by all clients immediately. Eliminates local Node.js process. Offline access is moot since the Lunch Money API requires internet anyway.

## 9. Repo Structure: Single Repo (Fork)

**Decision:** This repo serves as both the application code (forked from upstream) and the infrastructure/deployment config. No separate infra repo.

**Rationale:** Small project with a single deployment target. Splitting code and infra across two repos adds overhead with no benefit.

---

Resolved during `/grill` session on 2026-03-25. Topic: closing API coverage gaps.

## 10. API Coverage Gaps: Scope

**Decision:** Implement 10 new MCP tools covering 3 gap categories. Skip cryptocurrency endpoints.

**Endpoints to implement:**
- **Plaid Accounts (2):** `GET /plaid_accounts` (list accounts with balances), `POST /plaid_accounts/fetch` (trigger Plaid sync)
- **Transaction Grouping (5):** `GET /transactions/{id}` (single lookup), `POST /transactions/unsplit`, `GET /transactions/group`, `POST /transactions/group`, `DELETE /transactions/group/{id}`
- **Category Groups (3):** `GET /categories/{id}` (single lookup), `POST /categories/group` (create group), `POST /categories/group/{id}/add` (add to group)

**Rejected:** Cryptocurrency endpoints (`GET /crypto`, `PUT /crypto/manual/{id}`) — not used.

**Rationale:** Plaid account balances are essential (can't answer "what's my balance?" without them). Transaction grouping enables splitting/managing transactions through chat. Category group management supports evolving the needs/wants/savings structure over time.

## 11. Code Style: Match Upstream Patterns

**Decision:** All new tools must follow the exact same patterns as existing upstream tools — same error handling, same Zod schemas, same registration function style.

**Rationale:** These tools will be contributed upstream as a PR. Matching the existing style maximizes the chance of acceptance and keeps the codebase consistent. Style improvements, if any, should be a separate PR.

## 12. Testing: Vitest with Full Coverage

**Decision:** Add Vitest as the test framework. Write tests for all 37 tools (27 existing + 10 new), not just the new ones.

**Rationale:** Upstream has no automated test suite — only a manual `test:client` script. A comprehensive test suite makes the upstream PR more valuable and gives confidence when merging upstream changes. Vitest chosen for native ESM support (project uses `"type": "module"`), zero-config TypeScript, built-in mocking, and coverage reporting.

**Test approach:**
- Unit tests for each tool with mocked API responses
- Integration-style tests for the API client methods
- Full coverage reporting

## 13. Upstream Contribution

**Decision:** Contribute the new tools and test suite back to `gilbitron/lunch-money-mcp` as a PR, separate from our OAuth/deployment changes.

**Rationale:** Standard API endpoint coverage benefits all users. Keeping our fork's delta small reduces merge conflicts long-term. The PR must meet production quality: rigorous tests, full coverage, and code that matches upstream conventions exactly.
