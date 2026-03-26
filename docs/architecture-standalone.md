# Architecture: lunchmoney-mcp

```mermaid
graph TD
    subgraph "Entry Points"
        NPX["npx lunchmoney-mcp"]
        NPX_HTTP["npx lunchmoney-mcp --http"]
        NPX_SETUP["npx lunchmoney-mcp setup"]
    end

    subgraph "CLI Layer"
        CLI[cli.ts<br/>Arg parsing + routing]
    end

    subgraph "Setup"
        WIZARD[Setup Wizard<br/>Interactive token prompt<br/>Opens browser to LM dev page]
    end

    subgraph "Server Factory"
        SF[server.ts<br/>Creates FastMCP instance<br/>Selects transport + auth]
    end

    subgraph "Auth Provider Factory"
        APF[auth-provider.ts<br/>Reads AUTH_PROVIDER env]
        GOOGLE[GoogleProvider]
        GITHUB[GitHubProvider]
        CYBERARK[OAuthProvider<br/>CyberArk Identity OIDC]
        CUSTOM[OAuthProvider<br/>User-supplied endpoints]
    end

    subgraph "Credential Store"
        CS[credential-store.ts<br/>getApiToken / setApiToken<br/>getOAuthCredentials<br/>getEncryptionKey]
        KEYCHAIN[OS Keychain<br/>macOS Keychain<br/>Linux Secret Service<br/>Windows Credential Manager]
        ENVFB[ENV Var Fallback<br/>LUNCH_MONEY_API_TOKEN<br/>For Docker / systemd]
    end

    subgraph "Session Store"
        SS[session-store.ts<br/>FastMCP TokenStorage interface]
        ETS[EncryptedTokenStorage<br/>AES-256-GCM]
        DS[DiskStore<br/>Platform data dir<br/>TTL-managed]
    end

    subgraph "MCP Server (FastMCP)"
        STDIO[stdio transport<br/>Default]
        HTTP[httpStream transport<br/>--http flag]
        SETUP_TOOL[configureLunchMoneyToken<br/>In-chat token setup tool]

        subgraph "Tool Modules (37 tools)"
            USER[user.ts — 1]
            CAT[categories.ts — 7]
            TAG[tags.ts — 4]
            TXN[transactions.ts — 10]
            REC[recurring.ts — 4]
            BUD[budgets.ts — 4]
            AST[assets.ts — 4]
            PLAID[plaid.ts — 2]
        end
    end

    subgraph "Shared"
        CLIENT[api/client.ts<br/>LunchMoneyClient]
        SCHEMAS[schemas/index.ts<br/>Zod validation]
        TYPES[types/index.ts<br/>TypeScript interfaces]
        ERRORS[utils/errors.ts<br/>Error formatting]
    end

    subgraph "External"
        LM_API[Lunch Money API<br/>dev.lunchmoney.app/v1]
        OAUTH_IDP[OAuth Identity Provider<br/>Google / GitHub /<br/>CyberArk Identity / Custom]
    end

    NPX --> CLI
    NPX_HTTP --> CLI
    NPX_SETUP --> CLI

    CLI -->|setup| WIZARD
    CLI -->|default| SF
    CLI -->|--http| SF

    WIZARD --> CS
    CS --> KEYCHAIN
    CS -.->|fallback| ENVFB

    SF -->|stdio| STDIO
    SF -->|http| HTTP
    SF --> APF
    SF --> SS

    APF --> GOOGLE
    APF --> GITHUB
    APF --> CYBERARK
    APF --> CUSTOM

    SS --> ETS
    ETS --> DS
    ETS -->|encryption key| CS

    SETUP_TOOL --> CS

    USER & CAT & TAG & TXN & REC & BUD & AST & PLAID --> CLIENT
    USER & CAT & TAG & TXN & REC & BUD & AST & PLAID --> ERRORS
    CLIENT -->|HTTPS| LM_API
    HTTP -->|OAuth flow| OAUTH_IDP
```

## Module Responsibilities

| Module | Interface | Internals | Testability |
|--------|-----------|-----------|-------------|
| **CLI** | `--http`, `setup`, `--version` flags | Arg parsing, routing to server factory or setup wizard | Unit test arg parsing, mock server/wizard |
| **Credential Store** | `getApiToken()`, `setApiToken()`, `getOAuthCredentials()`, `getEncryptionKey()`, `clear()` | OS keychain via `keytar`, ENV var fallback detection, service namespace management | Mock keychain, test fallback chain |
| **Session Store** | FastMCP `TokenStorage` interface (`set`, `get`, `delete`) | `EncryptedTokenStorage` wrapping `DiskStore`, encryption key from credential store, `env-paths` for data directory | Mock credential store, test encryption round-trip |
| **Auth Provider Factory** | `createAuthProvider(provider, credentialStore): AuthProvider` | Provider selection switch, credential retrieval, FastMCP provider instantiation | Test each provider path, test invalid provider error |
| **Server Factory** | `createServer(options): FastMCP` | Transport selection, auth provider wiring, tool registration, `configureLunchMoneyToken` tool | Mock FastMCP, test transport + auth combinations |
| **Setup Wizard** | `runSetup(): Promise<void>` | Interactive prompts, browser open, token validation (`GET /me`), keychain storage | Mock readline + keychain, test validation flow |
| **Tool Modules (8)** | 37 `addTool()` registrations | API calls via `LunchMoneyClient`, Zod validation, error formatting | Already tested — 157 tests, >90% coverage |

## Credential Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant CredStore as Credential Store
    participant Keychain as OS Keychain
    participant ENV as ENV Vars
    participant Server as MCP Server
    participant LM as Lunch Money API

    Note over User,LM: First Run — No Token

    User->>CLI: npx lunchmoney-mcp
    CLI->>CredStore: getApiToken()
    CredStore->>Keychain: get("lunchmoney-mcp", "api-token")
    Keychain-->>CredStore: null
    CredStore->>ENV: process.env.LUNCH_MONEY_API_TOKEN
    ENV-->>CredStore: undefined
    CredStore-->>CLI: null
    CLI->>Server: start (no token)
    Note over Server: All tools return "token not configured" message

    Note over User,LM: Setup — In Chat

    User->>Server: "set up my token: abc123"
    Server->>CredStore: setApiToken("abc123")
    CredStore->>LM: GET /me (validate token)
    LM-->>CredStore: 200 OK
    CredStore->>Keychain: set("lunchmoney-mcp", "api-token", "abc123")
    Server-->>User: "Token configured successfully"

    Note over User,LM: Subsequent Runs

    User->>CLI: npx lunchmoney-mcp
    CLI->>CredStore: getApiToken()
    CredStore->>Keychain: get("lunchmoney-mcp", "api-token")
    Keychain-->>CredStore: "abc123"
    CLI->>Server: start (with token)
    Server->>LM: API calls work
```

## Deployment Architecture

```mermaid
graph LR
    subgraph "Local (stdio)"
        CD[Claude Desktop] <-->|stdio| LOCAL[lunchmoney-mcp<br/>npx process]
        CC[Claude Code] <-->|stdio| LOCAL
        LOCAL -->|HTTPS| LM[Lunch Money API]
    end

    subgraph "Remote (HTTP)"
        CLAUDE_AI[Claude.ai<br/>any device] -->|OAuth + HTTPS| REMOTE[lunchmoney-mcp<br/>--http mode]
        REMOTE -->|HTTPS| LM2[Lunch Money API]
    end
```
