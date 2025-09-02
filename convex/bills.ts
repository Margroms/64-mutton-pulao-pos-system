import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const billItemSchema = v.object({
  itemId: v.id("menuItems"),
  quantity: v.number(),
  unitPrice: v.number(),
  totalPrice: v.number(),
});

export const generate = mutation({
  args: {
    orderId: v.id("orders"),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("upi"),
      v.literal("other")
    ),
    discountAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    const billNumber = `BILL-${now}-${order.tableId}`;
    
    // Convert order items to bill items
    const billItems = order.items.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    const subtotal = order.totalAmount;
    const taxAmount = order.taxAmount;
    const discountAmount = args.discountAmount || 0;
    const finalAmount = subtotal + taxAmount - discountAmount;

    const billId = await ctx.db.insert("bills", {
      orderId: args.orderId,
      tableId: order.tableId,
      waiterId: order.waiterId,
      billNumber,
      items: billItems,
      subtotal,
      taxAmount,
      discountAmount,
      finalAmount,
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      createdAt: now,
    });

    return { billId, billNumber, finalAmount };
  },
});

export const getByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .first();
  },
});

export const updatePaymentStatus = mutation({
  args: {
    billId: v.id("bills"),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      paymentStatus: args.paymentStatus,
    };

    if (args.paymentStatus === "paid") {
      updates.paidAt = Date.now();
    }

    return await ctx.db.patch(args.billId, updates);
  },
});

export const getByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate)
        )
      )
      .order("desc")
      .collect();
  },
});
