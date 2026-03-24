# Task 003: Configure WAF Rate Limiting on /health

## Status: Blocked

**Blocked on:** Cloudflare API credentials not available in the local environment. No `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_API_KEY`, or `CLOUDFLARE_EMAIL` environment variables are set, and no MCP tools for Cloudflare are configured.

## What Needs to Be Done

Create a Cloudflare WAF rate limiting rule for the `/health` endpoint on `lunchmoney-mcp.joe-garcia.com` to prevent abuse of the unauthenticated healthcheck endpoint.

### Rule Specification

| Parameter | Value |
|---|---|
| Zone | joe-garcia.com |
| Hostname match | `lunchmoney-mcp.joe-garcia.com` |
| Path match | `/health` |
| Rate limit | 10 requests per 60 seconds |
| Scope | Per source IP |
| Action | Block |
| Block duration | 60 seconds (1 minute) |

### Option A: Cloudflare Dashboard (Manual)

1. Log in to Cloudflare Dashboard
2. Select zone **joe-garcia.com**
3. Navigate to **Security > WAF > Rate limiting rules**
4. Create a new rule:
   - **Rule name:** `Rate limit /health endpoint`
   - **If incoming requests match:**
     - Hostname equals `lunchmoney-mcp.joe-garcia.com`
     - AND URI Path equals `/health`
   - **Rate limit:** 10 requests per 1 minute
   - **Counting expression:** Same as rule expression (per IP)
   - **Action:** Block
   - **Duration:** 1 minute

### Option B: Cloudflare API (Automated)

Requires a Cloudflare API Token with `Zone.Firewall Services` permission for zone `joe-garcia.com`.

#### Step 1: Get the Zone ID

```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=joe-garcia.com" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  | jq -r '.result[0].id'
```

#### Step 2: Create the Rate Limiting Rule

```bash
ZONE_ID="<zone_id_from_step_1>"

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_ratelimit/entrypoint" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "rules": [
      {
        "description": "Rate limit /health endpoint",
        "expression": "(http.host eq \"lunchmoney-mcp.joe-garcia.com\" and http.request.uri.path eq \"/health\")",
        "action": "block",
        "ratelimit": {
          "characteristics": ["ip.src"],
          "period": 60,
          "requests_per_period": 10,
          "mitigation_timeout": 60
        }
      }
    ]
  }'
```

#### Step 3: Verify the Rule

```bash
curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_ratelimit/entrypoint" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.result.rules'
```

### Option C: Terraform (Infrastructure as Code)

```hcl
resource "cloudflare_ruleset" "health_rate_limit" {
  zone_id = var.cloudflare_zone_id
  name    = "Rate limiting rules"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules {
    action      = "block"
    expression  = "(http.host eq \"lunchmoney-mcp.joe-garcia.com\" and http.request.uri.path eq \"/health\")"
    description = "Rate limit /health endpoint"

    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 10
      mitigation_timeout  = 60
    }
  }
}
```

### Verification Plan

After the rule is applied, verify with:

1. **Normal traffic passes:** A single request to `https://lunchmoney-mcp.joe-garcia.com/health` returns `200 OK`.
2. **Rate limit triggers:** Send 11+ requests in 60 seconds from the same IP and confirm the 11th is blocked (HTTP 429 or Cloudflare block page).
3. **Monitoring unaffected:** At 1 request/minute (typical monitoring cadence), the rate limit is never triggered.

```bash
# Quick verification script
for i in $(seq 1 12); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://lunchmoney-mcp.joe-garcia.com/health)
  echo "Request $i: HTTP $STATUS"
  sleep 1
done
# Expect: requests 1-10 return 200, requests 11-12 return 429 or block
```

## To Unblock

Set up one of the following in the environment:
- `CLOUDFLARE_API_TOKEN` (preferred) - scoped API token with `Zone.Firewall Services` write permission
- `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` - legacy global API key authentication

Then re-run this task to execute the API calls from Option B above.
