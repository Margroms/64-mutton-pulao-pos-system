import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Check if data already exists
    const existingMenuItems = await ctx.db.query("menuItems").first();
    const existingTables = await ctx.db.query("tables").first();
    const existingUsers = await ctx.db.query("users").first();
    
    if (existingMenuItems || existingTables || existingUsers) {
      console.log("Database already seeded");
      return;
    }

    // Seed initial users with plain text passwords (will be hashed by auth system)
    await ctx.db.insert("users", {
      email: "admin@restaurant.com",
      password: "admin123", // This will be hashed when user first logs in
      name: "Admin User",
      role: "admin",
      isActive: true,
    });

    await ctx.db.insert("users", {
      email: "waiter@restaurant.com",
      password: "waiter123", // This will be hashed when user first logs in
      name: "Waiter User",
      role: "waiter",
      isActive: true,
    });

    // Seed menu items
    const menuItems = [
      { name: "Pizza Large", price: 450, category: "Main Course", isAvailable: true },
      { name: "Pasta", price: 350, category: "Main Course", isAvailable: true },
      { name: "Dal Makhani - Full", price: 280, category: "Main Course", isAvailable: true },
      { name: "Garlic Naan", price: 80, category: "Bread", isAvailable: true },
      { name: "Butter Naan", price: 70, category: "Bread", isAvailable: true },
      { name: "Cold Coffee", price: 120, category: "Beverages", isAvailable: true },
      { name: "Fresh Lime Water", price: 60, category: "Beverages", isAvailable: true },
      { name: "Masala Chai", price: 40, category: "Beverages", isAvailable: true },
      { name: "Chicken Biryani", price: 380, category: "Main Course", isAvailable: true },
      { name: "Veg Biryani", price: 320, category: "Main Course", isAvailable: true },
    ];

    for (const item of menuItems) {
      await ctx.db.insert("menuItems", item);
    }

    // Seed tables (1-10)
    for (let i = 1; i <= 10; i++) {
      await ctx.db.insert("tables", {
        number: i,
        isOccupied: false,
      });
    }

    console.log("Database seeded successfully with users, menu items, and tables");
  },
});
