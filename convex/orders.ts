import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const orderItemSchema = v.object({
  itemId: v.id("menuItems"),
  quantity: v.number(),
  unitPrice: v.number(),
  totalPrice: v.number(),
  notes: v.optional(v.string()),
  status: v.union(v.literal("pending"), v.literal("preparing"), v.literal("ready")),
});

export const getByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .filter((q) => 
        q.and(
          q.eq(q.field("tableId"), args.tableId),
          q.neq(q.field("status"), "served"),
          q.neq(q.field("status"), "cancelled")
        )
      )
      .order("desc")
      .first();
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("status"), args.status))
      .order("desc")
      .collect();
  },
});

export const getKitchenQueue = query({
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("orders")
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "confirmed"),
          q.eq(q.field("status"), "preparing")
        )
      )
      .order("asc")
      .collect();

    // Get table information for each order
    const ordersWithTables = await Promise.all(
      orders.map(async (order) => {
        const table = await ctx.db.get(order.tableId);
        return { ...order, table };
      })
    );

    return ordersWithTables;
  },
});

export const create = mutation({
  args: {
    tableId: v.id("tables"),
    waiterId: v.id("users"),
    items: v.array(orderItemSchema),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Calculate totals
    const totalAmount = args.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = totalAmount * 0.18; // 18% tax
    const finalAmount = totalAmount + taxAmount;

    const orderId = await ctx.db.insert("orders", {
      tableId: args.tableId,
      waiterId: args.waiterId,
      status: "pending",
      items: args.items,
      totalAmount,
      taxAmount,
      finalAmount,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Update table status to occupied
    await ctx.db.patch(args.tableId, {
      status: "occupied",
      updatedAt: now,
    });

    return orderId;
  },
});

export const addItems = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(orderItemSchema),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const updatedItems = [...order.items, ...args.items];
    const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = totalAmount * 0.18;
    const finalAmount = totalAmount + taxAmount;

    return await ctx.db.patch(args.orderId, {
      items: updatedItems,
      totalAmount,
      taxAmount,
      finalAmount,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("served"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "confirmed") {
      updates.confirmedAt = now;
    } else if (args.status === "ready") {
      updates.preparedAt = now;
    } else if (args.status === "served") {
      updates.servedAt = now;
      
      // Update table status to available when order is served
      const order = await ctx.db.get(args.orderId);
      if (order) {
        await ctx.db.patch(order.tableId, {
          status: "available",
          updatedAt: now,
        });
      }
    }

    return await ctx.db.patch(args.orderId, updates);
  },
});

export const cancel = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const order = await ctx.db.get(args.orderId);
    
    if (order) {
      // Update table status to available
      await ctx.db.patch(order.tableId, {
        status: "available",
        updatedAt: now,
      });
    }

    return await ctx.db.patch(args.orderId, {
      status: "cancelled",
      updatedAt: now,
    });
  },
});
