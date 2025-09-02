import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User authentication (simplified)
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"])
    .index("by_user", ["userId"]),
  // Tables in the restaurant
  tables: defineTable({
    number: v.number(),
    isOccupied: v.boolean(),
    currentOrder: v.optional(v.id("orders")),
  }).index("by_number", ["number"]),

  // Menu items
  menuItems: defineTable({
    name: v.string(),
    price: v.number(),
    category: v.string(),
    isAvailable: v.boolean(),
  }).index("by_category", ["category"]),

  // User roles and permissions
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("waiter"), v.literal("admin")),
    isActive: v.boolean(),
  }).index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Orders from waiters (updated with user reference and parcel support)
  orders: defineTable({
    tableNumber: v.optional(v.number()), // Optional for parcel orders
    orderType: v.optional(v.union(v.literal("table"), v.literal("parcel"))), // New field for order type
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      menuItemName: v.string(),
      quantity: v.number(),
      price: v.number(),
    })),
    status: v.union(v.literal("pending"), v.literal("sent_to_kitchen"), v.literal("sent_to_billing")),
    createdAt: v.number(),
    waiterId: v.optional(v.string()), // Changed to string to match the mutation
    waiterName: v.optional(v.string()),
    totalAmount: v.number(),
    customerInfo: v.optional(v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),
  }).index("by_table", ["tableNumber"])
    .index("by_status", ["status"])
    .index("by_type", ["orderType"])
    .index("by_waiter", ["waiterId"]),

  // Bills for admin processing
  bills: defineTable({
    orderId: v.id("orders"),
    tableNumber: v.number(), // 0 for parcel orders
    orderType: v.optional(v.union(v.literal("table"), v.literal("parcel"))),
    items: v.array(v.object({
      menuItemName: v.string(),
      quantity: v.number(),
      price: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),
    paymentMethod: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("cancelled")),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    customerInfo: v.optional(v.object({
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
    })),
  }).index("by_status", ["status"])
    .index("by_table", ["tableNumber"])
    .index("by_type", ["orderType"]),

  // Printer connections
  printers: defineTable({
    name: v.string(),
    type: v.union(v.literal("kitchen"), v.literal("billing")),
    bluetoothId: v.optional(v.string()),
    isConnected: v.boolean(),
    lastUsed: v.optional(v.number()),
  }).index("by_type", ["type"]),
});
