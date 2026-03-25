# Lunch Money MCP Tools Reference

## Available MCP Tools (27 total)

### User (1 tool)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getUser` | `GET /me` | Account details, email, name, currency preferences |

### Categories (4 tools)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getCategories` | `GET /categories` | List all categories and groups |
| `createCategory` | `POST /categories` | Create category |
| `updateCategory` | `PUT /categories/{id}` | Update category |
| `deleteCategory` | `DELETE /categories/{id}` | Delete category |

### Tags (4 tools)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getTags` | `GET /tags` | List all tags |
| `createTag` | `POST /tags` | Create tag |
| `updateTag` | `PUT /tags/{id}` | Update tag |
| `deleteTag` | `DELETE /tags/{id}` | Delete tag |

### Transactions (5 tools)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getTransactions` | `GET /transactions` | List/filter transactions (date, category, tags, account, status, pending) |
| `createTransaction` | `POST /transactions` | Create transaction |
| `updateTransaction` | `PUT /transactions/{id}` | Update transaction |
| `deleteTransaction` | `DELETE /transactions/{id}` | Delete transaction |
| `bulkUpdateTransactions` | `POST /transactions/bulk` | Bulk update multiple transactions |

### Recurring Items (4 tools)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getRecurringItems` | `GET /recurring_expenses` | List recurring expenses/income |
| `createRecurringItem` | `POST /recurring_expenses` | Create recurring item |
| `updateRecurringItem` | `PUT /recurring_expenses/{id}` | Update recurring item |
| `deleteRecurringItem` | `DELETE /recurring_expenses/{id}` | Delete recurring item |

### Budgets (4 tools)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getBudgets` | `GET /budgets` | List budgets with category assignments |
| `createBudget` | `POST /budgets` | Create budget |
| `updateBudget` | `PUT /budgets/{id}` | Update budget |
| `deleteBudget` | `DELETE /budgets/{id}` | Delete budget |

### Assets (4 tools)
| Tool | API Endpoint | Description |
|------|-------------|-------------|
| `getAssets` | `GET /assets` | List manually-managed assets (NOT Plaid-connected accounts) |
| `createAsset` | `POST /assets` | Create manual asset |
| `updateAsset` | `PUT /assets/{id}` | Update asset (including balance) |
| `deleteAsset` | `DELETE /assets/{id}` | Delete asset |

## NOT Implemented (API endpoints that exist but have no MCP tool)

### Plaid Accounts (COMPLETELY MISSING)
| API Endpoint | What it does |
|-------------|-------------|
| `GET /plaid_accounts` | **List Plaid-connected accounts WITH BALANCES** |
| `POST /plaid_accounts/fetch` | Trigger Plaid data sync |

### Cryptocurrency (COMPLETELY MISSING)
| API Endpoint | What it does |
|-------------|-------------|
| `GET /crypto` | List crypto assets |
| `PUT /crypto/manual/{id}` | Update manual crypto asset |

### Transaction Grouping
| API Endpoint | What it does |
|-------------|-------------|
| `GET /transactions/{id}` | Get single transaction by ID |
| `POST /transactions/unsplit` | Unsplit transactions |
| `GET /transactions/group` | Get transaction group |
| `POST /transactions/group` | Create transaction group |
| `DELETE /transactions/group/{id}` | Delete transaction group |

### Category Groups
| API Endpoint | What it does |
|-------------|-------------|
| `GET /categories/{id}` | Get single category |
| `POST /categories/group` | Create category group |
| `POST /categories/group/{id}/add` | Add category to group |

## Key Gotchas

- **`getAssets` returns ONLY manually-managed assets.** Plaid-connected accounts (like bank accounts) are NOT included. To see Plaid account balances, use the Lunch Money API directly: `GET /v1/plaid_accounts`
- **Account balances** for Plaid-connected accounts are available via the API but not exposed through any MCP tool
- **`getRecurringItems`** uses the deprecated `/recurring_expenses` endpoint
- **Transaction amounts** with `debit_as_negative: true` show debits as negative, credits as positive

## API Client

- **Base URL:** `https://dev.lunchmoney.app/v1`
- **Auth:** Bearer token via `LUNCH_MONEY_API_TOKEN`
- **Source:** `src/api/client.ts` — generic HTTP client with `get()`, `post()`, `put()`, `delete()` methods
