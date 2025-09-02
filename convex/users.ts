import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const getWaiters = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.eq(q.field("role"), "waiter"),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("waiter"), v.literal("kitchen"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
