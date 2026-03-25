import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerTransactionTools } from "../../src/tools/transactions.js";
import { LunchMoneyClient } from "../../src/api/client.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";
import type {
  TransactionsResponse,
  Transaction,
} from "../../src/types/index.js";

// Capture registered tools via a fake FastMCP server
interface RegisteredTool {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

function createMockServer() {
  const tools: RegisteredTool[] = [];
  return {
    addTool: (tool: RegisteredTool) => {
      tools.push(tool);
    },
    tools,
  };
}

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as unknown as LunchMoneyClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

const sampleTransaction: Transaction = {
  id: 1,
  date: "2024-06-01",
  payee: "Starbucks",
  amount: "5.50",
  currency: "usd",
  notes: "Morning coffee",
  category_id: 10,
  account_id: 100,
  status: "cleared",
  type: "expense",
};

describe("Transaction tools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockClient: ReturnType<typeof createMockClient>;
  let tools: RegisteredTool[];

  beforeEach(() => {
    mockServer = createMockServer();
    mockClient = createMockClient();
    registerTransactionTools(mockServer as never, mockClient);
    tools = mockServer.tools;
  });

  it("registers six tools", () => {
    expect(tools).toHaveLength(6);
    expect(tools.map((t) => t.name)).toEqual([
      "getTransactions",
      "getTransaction",
      "createTransaction",
      "updateTransaction",
      "deleteTransaction",
      "bulkUpdateTransactions",
    ]);
  });

  // ---------- getTransactions ----------
  describe("getTransactions", () => {
    it("returns JSON stringified transactions on success", async () => {
      const mockResponse: TransactionsResponse = {
        transactions: [sampleTransaction],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "getTransactions")!;
      const result = await tool.execute({});

      expect(mockClient.get).toHaveBeenCalledWith("/transactions", {});
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockClient.get.mockRejectedValue(
        new LunchMoneyAPIError("Unauthorized", 401)
      );

      const tool = tools.find((t) => t.name === "getTransactions")!;
      const result = await tool.execute({});

      expect(result).toBe(
        "Lunch Money API Error: Unauthorized (Status: 401)"
      );
    });
  });

  // ---------- getTransaction ----------
  describe("getTransaction", () => {
    it("returns JSON stringified single transaction on success", async () => {
      mockClient.get.mockResolvedValue(sampleTransaction);

      const tool = tools.find((t) => t.name === "getTransaction")!;
      const result = await tool.execute({ id: 1 });

      expect(mockClient.get).toHaveBeenCalledWith("/transactions/1");
      expect(result).toBe(JSON.stringify(sampleTransaction, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockClient.get.mockRejectedValue(
        new LunchMoneyAPIError("Transaction not found", 404)
      );

      const tool = tools.find((t) => t.name === "getTransaction")!;
      const result = await tool.execute({ id: 99999 });

      expect(result).toBe(
        "Lunch Money API Error: Transaction not found (Status: 404)"
      );
    });
  });

  // ---------- createTransaction ----------
  describe("createTransaction", () => {
    it("returns JSON stringified created transaction on success", async () => {
      const mockResponse = { transaction: sampleTransaction };
      mockClient.post.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "createTransaction")!;
      const args = {
        date: "2024-06-01",
        amount: "5.50",
        payee: "Starbucks",
        account_id: 100,
      };
      const result = await tool.execute(args);

      expect(mockClient.post).toHaveBeenCalledWith("/transactions", args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockClient.post.mockRejectedValue(
        new LunchMoneyAPIError("Validation error", 422)
      );

      const tool = tools.find((t) => t.name === "createTransaction")!;
      const result = await tool.execute({
        date: "2024-06-01",
        amount: "5.50",
        account_id: 100,
      });

      expect(result).toBe(
        "Lunch Money API Error: Validation error (Status: 422)"
      );
    });
  });

  // ---------- updateTransaction ----------
  describe("updateTransaction", () => {
    it("returns JSON stringified updated transaction on success", async () => {
      const updatedTransaction = { ...sampleTransaction, payee: "Updated" };
      const mockResponse = { transaction: updatedTransaction };
      mockClient.put.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "updateTransaction")!;
      const result = await tool.execute({ id: 1, payee: "Updated" });

      expect(mockClient.put).toHaveBeenCalledWith("/transactions/1", {
        payee: "Updated",
      });
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockClient.put.mockRejectedValue(
        new LunchMoneyAPIError("Not found", 404)
      );

      const tool = tools.find((t) => t.name === "updateTransaction")!;
      const result = await tool.execute({ id: 99999, payee: "Updated" });

      expect(result).toBe(
        "Lunch Money API Error: Not found (Status: 404)"
      );
    });
  });

  // ---------- deleteTransaction ----------
  describe("deleteTransaction", () => {
    it("returns success message on delete", async () => {
      mockClient.delete.mockResolvedValue(undefined);

      const tool = tools.find((t) => t.name === "deleteTransaction")!;
      const result = await tool.execute({ id: 1 });

      expect(mockClient.delete).toHaveBeenCalledWith("/transactions/1");
      expect(result).toBe("Transaction 1 deleted successfully");
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockClient.delete.mockRejectedValue(
        new LunchMoneyAPIError("Not found", 404)
      );

      const tool = tools.find((t) => t.name === "deleteTransaction")!;
      const result = await tool.execute({ id: 99999 });

      expect(result).toBe(
        "Lunch Money API Error: Not found (Status: 404)"
      );
    });
  });

  // ---------- bulkUpdateTransactions ----------
  describe("bulkUpdateTransactions", () => {
    it("returns JSON stringified update count on success", async () => {
      const mockResponse = { updated: 3 };
      mockClient.post.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "bulkUpdateTransactions")!;
      const args = {
        transaction_ids: [1, 2, 3],
        status: "cleared",
      };
      const result = await tool.execute(args);

      expect(mockClient.post).toHaveBeenCalledWith("/transactions/bulk", args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockClient.post.mockRejectedValue(
        new LunchMoneyAPIError("Server error", 500)
      );

      const tool = tools.find((t) => t.name === "bulkUpdateTransactions")!;
      const result = await tool.execute({
        transaction_ids: [1, 2, 3],
        status: "cleared",
      });

      expect(result).toBe(
        "Lunch Money API Error: Server error (Status: 500)"
      );
    });
  });
});
