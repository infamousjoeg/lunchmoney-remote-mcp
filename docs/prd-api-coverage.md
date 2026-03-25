## Problem Statement

The Lunch Money MCP server covers only 27 of ~40 Lunch Money API v1 endpoints (67.5% coverage). Critical gaps include Plaid account balances (can't answer "what's my checking balance?"), transaction grouping/splitting (can't manage split transactions through chat), and category group management (can't reorganize budget categories). Additionally, the codebase has zero automated tests, making upstream contributions and ongoing maintenance risky.

## Solution

Add 10 new MCP tools covering the 3 missing endpoint categories, plus a comprehensive Vitest test suite covering all 37 tools (27 existing + 10 new). Contribute the new tools and test suite upstream to `gilbitron/lunch-money-mcp` as a PR.

## Technical Constraints

- **Language:** TypeScript (strict mode, ES modules)
- **Runtime:** Node.js 22.x LTS
- **Testing:** Vitest with coverage reporting
- **Style:** Must exactly match upstream patterns — same error handling (`formatErrorForMCP`), same Zod schemas, same registration function structure
- **API:** Lunch Money API v1 (`https://dev.lunchmoney.app/v1`), Bearer token auth
- **Contribution target:** `gilbitron/lunch-money-mcp` — PR must be clean, well-tested, and free of our deployment/OAuth changes

## User Stories

1. **[P0]** As a family member, I want to check my bank account balances through Claude, so that I can see how much money I have without opening the Lunch Money app
   - AC: `getPlaidAccounts` tool returns all Plaid-connected accounts with current balances
   - AC: Response includes institution name, account name, mask, balance, and last update timestamp
   - AC: Tool works through the MCP server (Claude.ai, Claude Code, Claude Desktop)

2. **[P0]** As a family member, I want to trigger a Plaid data sync through Claude, so that I can get fresh balance and transaction data on demand
   - AC: `fetchPlaidAccounts` tool triggers a Plaid sync for all connected accounts
   - AC: Response confirms sync was triggered successfully

3. **[P0]** As a family member, I want to look up a single transaction by ID through Claude, so that I can get full details on a specific charge
   - AC: `getTransaction` tool returns a single transaction with all fields
   - AC: Returns a clear error if the transaction ID doesn't exist

4. **[P1]** As a family member, I want to group related transactions through Claude, so that I can combine multiple charges into one logical expense
   - AC: `createTransactionGroup` tool groups multiple transaction IDs under a single parent
   - AC: `getTransactionGroup` tool retrieves a group with all its child transactions
   - AC: `deleteTransactionGroup` tool ungroups transactions, restoring them as individual items

5. **[P1]** As a family member, I want to unsplit transactions through Claude, so that I can undo a previous split
   - AC: `unsplitTransactions` tool reverses a split, merging children back into the parent
   - AC: Returns the restored parent transaction

6. **[P1]** As a family member, I want to look up a single category by ID and manage category groups through Claude, so that I can reorganize my budget structure
   - AC: `getCategory` tool returns a single category with all fields
   - AC: `createCategoryGroup` tool creates a new category group
   - AC: `addToGroup` tool adds an existing category to a group

7. **[P0]** As a contributor, I want comprehensive automated tests for all MCP tools, so that changes can be validated without manual testing
   - AC: Vitest test suite covers all 37 tools (27 existing + 10 new)
   - AC: Each tool has tests for success cases and error cases
   - AC: API calls are mocked — tests don't hit the real Lunch Money API
   - AC: `npm test` runs all tests and reports coverage
   - AC: Coverage report shows >90% line coverage for tool modules

## Implementation Decisions

**New tool modules:**
- **Plaid accounts module** — new file, registers `getPlaidAccounts` and `fetchPlaidAccounts`. New types: `PlaidAccount`, `PlaidAccountsResponse`. New schema: none needed (no input parameters for list, empty for fetch).
- **Transaction grouping** — extend existing transactions module with `getTransaction`, `createTransactionGroup`, `deleteTransactionGroup`, `unsplitTransactions`. New schemas: `createTransactionGroupSchema` (transaction_ids array), `unsplitTransactionsSchema` (parent_ids array).
- **Category groups** — extend existing categories module with `getCategory`, `createCategoryGroup`, `addToGroup`. New schemas: `createCategoryGroupSchema` (name, category_ids), `addToGroupSchema` (group_id, category_ids).

**Registration:** New Plaid module registered in `src/index.ts` alongside existing modules. Transaction and category tools added to their existing registration functions.

**Types:** Add `PlaidAccount` and `PlaidAccountsResponse` interfaces to `src/types/index.ts`.

**Schemas:** Add new Zod schemas to `src/schemas/index.ts`.

**Test structure:**
- `tests/tools/*.test.ts` — one test file per tool module
- `tests/api/client.test.ts` — API client tests
- Mock the `LunchMoneyClient` methods, not HTTP requests — tests validate tool logic, not HTTP plumbing
- Table-driven test cases where appropriate (multiple inputs → expected outputs)

## Testing Decisions

- **Framework:** Vitest — native ESM, TypeScript, built-in mocking, coverage
- **Mocking strategy:** Mock `LunchMoneyClient.get/post/put/delete` methods via `vi.fn()`. Each tool test creates a mock client, passes it to the registration function, and asserts the tool's output.
- **Coverage target:** >90% line coverage for `src/tools/`, `src/api/`, `src/utils/`
- **What makes a good test:** Tests tool behavior through the public `execute` function. Success case returns expected JSON. Error case returns formatted error string. Schema validation rejects bad input.
- **Prior art:** None — this is the first test suite for the project

## Out of Scope

- Cryptocurrency endpoints (`GET /crypto`, `PUT /crypto/manual/{id}`)
- OAuth/deployment changes (kept in our fork only, not part of upstream PR)
- Modifying existing tool behavior or fixing upstream bugs
- Performance optimization or caching
- Force-delete category endpoint (`DELETE /categories/{id}/force`)

## Further Notes

- The upstream PR should contain ONLY the new tools, types, schemas, and test suite — no OAuth, no deployment config, no docs from our fork
- The `getRecurringItems` tool uses the deprecated `/recurring_expenses` endpoint — we won't fix this in our PR (upstream's choice to migrate)
- Transaction grouping endpoints use different URL patterns than standard CRUD: `/transactions/group` (not `/transactions/{id}/group`)
- The Lunch Money API returns Plaid account balances as strings, consistent with how amounts are handled throughout the API
