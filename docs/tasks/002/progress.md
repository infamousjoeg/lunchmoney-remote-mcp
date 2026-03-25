# Task 002: Configure Cloudflare Access with Service Tokens

## Status: Blocked

**Blocked on:** Cloudflare API credentials with Access/Zero Trust permissions.

The `cloudflared` tunnel token (`cfut_*`) is scoped to tunnel management only. The Wrangler OAuth token is scoped to Workers/KV/D1/Pages and does not include Access permissions. No Cloudflare API token with `Access: Organizations, Identity Providers, and Groups` or `Access: Apps and Policies` permissions is available in the environment.

## What Needs to Be Done

All steps use the Cloudflare API v4 against account `ccf3bdc2df6627d78f1b217a5fc4acfe`.

### Prerequisites

Create a Cloudflare API Token at https://dash.cloudflare.com/profile/api-tokens with these permissions:
- **Account > Access: Apps and Policies > Edit**
- **Account > Access: Service Tokens > Edit**
- **Zone > Zone > Read** (for zone `joe-garcia.com`, ID `71c2397c768b8ccbafcca5e9e36073b3`)

Export it:
```bash
export CF_API_TOKEN="<your-token>"
export CF_ACCOUNT_ID="ccf3bdc2df6627d78f1b217a5fc4acfe"
```

### Step 1: Create Two Service Tokens

```bash
# Create Service Token for Joe
curl -s -X POST \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Joe - Lunch Money MCP","duration":"8760h"}' \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/service_tokens" \
  | python3 -m json.tool

# IMPORTANT: Save the client_id and client_secret from the response.
# The client_secret is only shown ONCE at creation time.

# Create Service Token for Wife
curl -s -X POST \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Wife - Lunch Money MCP","duration":"8760h"}' \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/service_tokens" \
  | python3 -m json.tool

# IMPORTANT: Save the client_id and client_secret from this response too.
```

### Step 2: Create the Cloudflare Access Application

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunch Money MCP Server",
    "domain": "lunchmoney-mcp.joe-garcia.com",
    "type": "self_hosted",
    "session_duration": "24h",
    "auto_redirect_to_identity": false,
    "http_only_cookie_attribute": true,
    "service_auth_401_redirect": false,
    "skip_interstitial": true
  }' \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps" \
  | python3 -m json.tool

# Save the app "id" (UUID) from the response for the next steps.
```

### Step 3: Create the Service Auth Policy

Using the app ID from Step 2 and the service token IDs from Step 1:

```bash
APP_ID="<app-id-from-step-2>"
JOE_TOKEN_ID="<joe-service-token-id>"
WIFE_TOKEN_ID="<wife-service-token-id>"

curl -s -X POST \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Require Service Token",
    "decision": "non_identity",
    "include": [
      {
        "service_token": {"token_id": "'"${JOE_TOKEN_ID}"'"}
      },
      {
        "service_token": {"token_id": "'"${WIFE_TOKEN_ID}"'"}
      }
    ],
    "precedence": 1
  }' \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${APP_ID}/policies" \
  | python3 -m json.tool
```

### Step 4: Exclude /health from Access Policy

Create a bypass policy for the /health path. This can be done either by:

**Option A: Path-based bypass policy on the same app**

```bash
curl -s -X POST \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Allow Health Endpoint",
    "decision": "bypass",
    "include": [
      {"everyone": {}}
    ],
    "precedence": 0
  }' \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${APP_ID}/policies" \
  | python3 -m json.tool
```

Then update the Access Application to add a path exclusion for /health:

```bash
curl -s -X PUT \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lunch Money MCP Server",
    "domain": "lunchmoney-mcp.joe-garcia.com/mcp",
    "type": "self_hosted",
    "session_duration": "24h",
    "auto_redirect_to_identity": false,
    "http_only_cookie_attribute": true,
    "service_auth_401_redirect": false,
    "skip_interstitial": true
  }' \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/access/apps/${APP_ID}" \
  | python3 -m json.tool
```

**Option B (Recommended): Scope the Access Application to specific paths**

Instead of protecting the entire domain, create the Access Application scoped to just the paths that need protection. Set `domain` to `lunchmoney-mcp.joe-garcia.com` and use `path` to restrict it. Since the Access API may not support path-level scoping on self_hosted apps, an alternative is:

1. Set the Access Application domain to `lunchmoney-mcp.joe-garcia.com`
2. Add a Bypass policy with precedence 0 that matches the `/health` path
3. Add the Service Token policy with precedence 1 for everything else

The best approach is likely to use the Cloudflare dashboard or the newer Access Application path configuration if the API supports it.

### Step 5: Verify Configuration

```bash
# Should return 403 (Cloudflare Access blocks it)
curl -s -o /dev/null -w "%{http_code}" \
  "https://lunchmoney-mcp.joe-garcia.com/mcp"

# Should return 200 (health is excluded from Access)
curl -s -o /dev/null -w "%{http_code}" \
  "https://lunchmoney-mcp.joe-garcia.com/health"

# Should reach the MCP server (pass through Access, then app auth)
curl -s -o /dev/null -w "%{http_code}" \
  -H "CF-Access-Client-Id: <joe-client-id>" \
  -H "CF-Access-Client-Secret: <joe-client-secret>" \
  -H "Authorization: Bearer <SERVER_API_KEY>" \
  "https://lunchmoney-mcp.joe-garcia.com/mcp"
```

### Step 6: Store Service Token Credentials

After creating the service tokens, securely store the credentials:

| User | CF-Access-Client-Id | CF-Access-Client-Secret | Notes |
|------|---------------------|------------------------|-------|
| Joe  | (from Step 1)       | (from Step 1)          | For Claude.ai MCP integration & Claude Desktop |
| Wife | (from Step 1)       | (from Step 1)          | For Claude.ai MCP integration |

These credentials will be needed for Task 004 (Claude.ai MCP integrations) and Task 005 (Claude Desktop migration).

## Alternative: Cloudflare Dashboard

All of the above can also be done via the Cloudflare Zero Trust dashboard:

1. Go to https://one.dash.cloudflare.com/ > Access > Service Auth > Service Tokens
2. Create two tokens ("Joe - Lunch Money MCP", "Wife - Lunch Money MCP")
3. Go to Access > Applications > Add an application > Self-hosted
4. Set domain to `lunchmoney-mcp.joe-garcia.com`
5. Add policy: "Require Service Token" with Action = Service Auth, Include = the two service tokens
6. Under the application settings, add `/health` as a bypass path
7. Verify with curl commands from Step 5

## Acceptance Criteria Checklist

- [ ] Cloudflare Access Application exists for lunchmoney-mcp.joe-garcia.com
- [ ] Access policy requires valid Service Token (Service Auth)
- [ ] Two Service Tokens created: one for Joe, one for wife
- [ ] Requests without Service Token credentials receive 403 from Cloudflare (never reach VPS)
- [ ] Requests with valid Service Token + valid SERVER_API_KEY Bearer token reach the MCP server
- [ ] /health endpoint is excluded from Access policy (remains unauthenticated)
