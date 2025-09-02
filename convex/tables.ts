import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all tables
export const getTables = query({
  handler: async (ctx) => {
    return await ctx.db.query("tables").collect();
  },
});

// Get table by number
export const getTableByNumber = query({
  args: {
    number: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();
  },
});

// Create tables (initialization function)
export const createTable = mutation({
  args: {
    number: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tables", {
      number: args.number,
      isOccupied: false,
    });
  },
});

// Set table occupation status
export const setTableOccupation = mutation({
  args: {
    tableNumber: v.number(),
    isOccupied: v.boolean(),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const table = await ctx.db
      .query("tables")
      .withIndex("by_number", (q) => q.eq("number", args.tableNumber))
      .first();
    
    if (!table) {
      throw new Error("Table not found");
    }

    await ctx.db.patch(table._id, {
      isOccupied: args.isOccupied,
      currentOrder: args.orderId,
    });
  },
});
