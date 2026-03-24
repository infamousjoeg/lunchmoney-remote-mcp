# Task 006: Verify Upstream Sync Workflow on VPS

## Status: Complete

## Date: 2026-03-23

## Summary

Verified the upstream sync workflow on the VPS (root@178.156.141.254) to ensure
the deployment at /opt/lunchmoney-mcp can pull changes from the original
gilbitron/lunch-money-mcp repository and rebuild cleanly.

## Steps Completed

### 1. SSH Access Verified
- Connected to VPS at root@178.156.141.254
- Host: ubuntu-4gb-ash-1 (Linux 6.8.0-101-generic, x86_64)

### 2. Git Safe Directory
- Added /opt/lunchmoney-mcp to git safe.directory config (required because
  repo ownership differs from the running user)

### 3. Upstream Remote Configured
- Added upstream remote: `https://github.com/gilbitron/lunch-money-mcp.git`
- Verified remotes:
  - origin: `https://github.com/infamousjoeg/lunchmoney-remote-mcp.git`
  - upstream: `https://github.com/gilbitron/lunch-money-mcp.git`

### 4. Fetch & Merge
- `git fetch upstream` - fetched upstream/main branch
- `git merge upstream/main` - completed with "Already up to date" (no conflicts)

### 5. Build & Restart
- `npm install` - 185 packages audited, 0 vulnerabilities
- `npm run build` (tsc) - compiled successfully
- `sudo systemctl restart lunchmoney-mcp` - restart succeeded

### 6. Service Verification
- systemctl status: **active (running)**
- PID: 1705905
- Listening on port 8090
- Health check at http://0.0.0.0:8090/health
- MCP endpoint at http://0.0.0.0:8090/mcp
- API key authentication enabled

## Update Runbook

To sync with upstream changes on the VPS:

```bash
ssh root@178.156.141.254
cd /opt/lunchmoney-mcp
git fetch upstream
git merge upstream/main
npm install
npm run build
sudo systemctl restart lunchmoney-mcp
systemctl status lunchmoney-mcp
```
