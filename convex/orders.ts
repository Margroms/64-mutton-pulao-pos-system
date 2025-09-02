import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new order (supports both table and parcel orders)
export const createOrder = mutation({
  args: {
    tableNumber: v.optional(v.number()),
    orderType: v.union(v.literal("table"), v.literal("parcel")),
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      menuItemName: v.string(),
      quantity: v.number(),
      price: v.number(),
    })),
    waiterId: v.optional(v.string()), // Changed from v.id("users") to v.string()
    waiterName: v.optional(v.string()),
    customerInfo: v.optional(v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const totalAmount = args.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderId = await ctx.db.insert("orders", {
      tableNumber: args.tableNumber,
      orderType: args.orderType,
      items: args.items,
      status: "pending",
      createdAt: Date.now(),
      waiterId: args.waiterId,
      waiterName: args.waiterName,
      totalAmount,
      customerInfo: args.customerInfo,
    });

    return orderId;
  },
});

// Send order to kitchen (update status)
export const sendToKitchen = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: "sent_to_kitchen",
    });
  },
});

// Send order to billing
export const sendToBilling = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "sent_to_billing",
    });

    // Create bill
    const billItems = order.items.map((item: any) => ({
      menuItemName: item.menuItemName,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    }));

    const subtotal = order.totalAmount;
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;

    await ctx.db.insert("bills", {
      orderId: args.orderId,
      tableNumber: order.tableNumber || 0, // Use 0 for parcel orders
      orderType: order.orderType,
      items: billItems,
      subtotal,
      tax,
      total,
      status: "pending",
      createdAt: Date.now(),
      customerInfo: order.customerInfo,
    });
  },
});

// Get orders by status
export const getOrdersByStatus = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("sent_to_kitchen"), v.literal("sent_to_billing")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Get orders for a specific table
export const getOrdersByTable = query({
  args: {
    tableNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_table", (q) => q.eq("tableNumber", args.tableNumber))
      .order("desc")
      .collect();
  },
});

// Get orders by type (table or parcel)
export const getOrdersByType = query({
  args: {
    orderType: v.union(v.literal("table"), v.literal("parcel")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_type", (q) => q.eq("orderType", args.orderType))
      .order("desc")
      .collect();
  },
});

// Add item to existing order
export const addItemToOrder = mutation({
  args: {
    orderId: v.id("orders"),
    menuItemId: v.id("menuItems"),
    menuItemName: v.string(),
    quantity: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const newItem = {
      menuItemId: args.menuItemId,
      menuItemName: args.menuItemName,
      quantity: args.quantity,
      price: args.price,
    };

    const updatedItems = [...order.items, newItem];
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await ctx.db.patch(args.orderId, {
      items: updatedItems,
      totalAmount,
    });
  },
});
