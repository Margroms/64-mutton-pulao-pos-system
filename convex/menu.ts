import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all menu items
export const getMenuItems = query({
  handler: async (ctx) => {
    return await ctx.db.query("menuItems").collect();
  },
});

// Get menu items by category
export const getMenuItemsByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Add menu item (admin function)
export const addMenuItem = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    category: v.string(),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("menuItems", {
      name: args.name,
      price: args.price,
      category: args.category,
      isAvailable: args.isAvailable ?? true,
    });
  },
});

// Update menu item availability
export const updateMenuItemAvailability = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.menuItemId, {
      isAvailable: args.isAvailable,
    });
  },
});
