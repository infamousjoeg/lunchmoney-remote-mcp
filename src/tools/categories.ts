import { FastMCP } from "fastmcp";
import { z } from "zod";
import { LunchMoneyClient } from "../api/client.js";
import { formatErrorForMCP } from "../utils/errors.js";
import {
  createCategorySchema,
  updateCategorySchema,
  idSchema,
} from "../schemas/index.js";
import { CategoriesResponse, Category } from "../types/index.js";

export function registerCategoryTools(
  server: FastMCP,
  client: LunchMoneyClient
) {
  server.addTool({
    name: "getCategories",
    description: "List all categories including category groups and parent categories",
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await client.get<CategoriesResponse>("/categories");
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "createCategory",
    description: "Create a new spending or income category",
    parameters: createCategorySchema,
    execute: async (args: z.infer<typeof createCategorySchema>) => {
      try {
        const category = await client.post<{ category: Category }>(
          "/categories",
          args
        );
        return JSON.stringify(category, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "updateCategory",
    description: "Update an existing category's properties",
    parameters: idSchema.merge(updateCategorySchema),
    execute: async (args: z.infer<typeof idSchema> & z.infer<typeof updateCategorySchema>) => {
      try {
        const { id, ...updateData } = args;
        const category = await client.put<{ category: Category }>(
          `/categories/${id}`,
          updateData
        );
        return JSON.stringify(category, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "deleteCategory",
    description: "Delete a category by ID",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        await client.delete(`/categories/${args.id}`);
        return `Category ${args.id} deleted successfully`;
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });
}
