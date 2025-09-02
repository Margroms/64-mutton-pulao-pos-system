import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCategories = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("menuCategories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();
  },
});

export const getItems = query({
  args: { categoryId: v.optional(v.id("menuCategories")) },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("menuItems")
      .filter((q) => q.eq(q.field("isActive"), true));
    
    if (args.categoryId) {
      query = query.filter((q) => q.eq(q.field("categoryId"), args.categoryId));
    }
    
    return await query.collect();
  },
});

export const getItemsWithCategories = query({
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("menuCategories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();

    const itemsPromises = categories.map(async (category) => {
      const items = await ctx.db
        .query("menuItems")
        .filter((q) => 
          q.and(
            q.eq(q.field("categoryId"), category._id),
            q.eq(q.field("isActive"), true),
            q.eq(q.field("isAvailable"), true)
          )
        )
        .collect();
      
      return {
        ...category,
        items,
      };
    });

    return await Promise.all(itemsPromises);
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menuCategories", {
      name: args.name,
      description: args.description,
      sortOrder: args.sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createItem = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    categoryId: v.id("menuCategories"),
    preparationTime: v.number(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("menuItems", {
      name: args.name,
      description: args.description,
      price: args.price,
      categoryId: args.categoryId,
      preparationTime: args.preparationTime,
      imageUrl: args.imageUrl,
      isAvailable: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    preparationTime: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
