import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("waiter"), v.literal("kitchen"), v.literal("admin")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  tables: defineTable({
    tableNumber: v.number(),
    capacity: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("occupied"),
      v.literal("reserved"),
      v.literal("cleaning")
    ),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_table_number", ["tableNumber"]),

  menuCategories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sort_order", ["sortOrder"]),

  menuItems: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    categoryId: v.id("menuCategories"),
    isAvailable: v.boolean(),
    preparationTime: v.number(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["categoryId"]),

  orders: defineTable({
    tableId: v.id("tables"),
    waiterId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("served"),
      v.literal("cancelled")
    ),
    items: v.array(v.object({
      itemId: v.id("menuItems"),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
      notes: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("preparing"), v.literal("ready")),
    })),
    totalAmount: v.number(),
    taxAmount: v.number(),
    finalAmount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    confirmedAt: v.optional(v.number()),
    preparedAt: v.optional(v.number()),
    servedAt: v.optional(v.number()),
  })
    .index("by_table", ["tableId"])
    .index("by_waiter", ["waiterId"])
    .index("by_status", ["status"]),

  bills: defineTable({
    orderId: v.id("orders"),
    tableId: v.id("tables"),
    waiterId: v.id("users"),
    billNumber: v.string(),
    items: v.array(v.object({
      itemId: v.id("menuItems"),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),
    subtotal: v.number(),
    taxAmount: v.number(),
    discountAmount: v.number(),
    finalAmount: v.number(),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("upi"),
      v.literal("other")
    ),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_bill_number", ["billNumber"])
    .index("by_payment_status", ["paymentStatus"]),
});
