import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all pending bills for admin
export const getPendingBills = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("bills")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  },
});

// Get all bills
export const getAllBills = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("bills")
      .order("desc")
      .collect();
  },
});

// Process payment for a bill (simplified - auto-print and clear)
export const processBillPayment = mutation({
  args: {
    billId: v.id("bills"),
    paymentMethod: v.string(),
    customerInfo: v.optional(v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.billId, {
      status: "paid",
      paymentMethod: args.paymentMethod,
      paidAt: Date.now(),
      customerInfo: args.customerInfo,
    });

    // Return the updated bill for printing
    return await ctx.db.get(args.billId);
  },
});

// Quick print and clear bill (one-click action)
export const printAndClearBill = mutation({
  args: {
    billId: v.id("bills"),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found");

    // Mark as paid
    await ctx.db.patch(args.billId, {
      status: "paid",
      paymentMethod: args.paymentMethod,
      paidAt: Date.now(),
    });

    return bill;
  },
});

// Cancel a bill
export const cancelBill = mutation({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.billId, {
      status: "cancelled",
    });
  },
});

// Get bill by ID
export const getBillById = query({
  args: {
    billId: v.id("bills"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.billId);
  },
});
