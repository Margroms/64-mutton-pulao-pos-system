import { mutation } from "./_generated/server";

// Simple hash function that works in Convex
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

export const seedDatabase = mutation({
  handler: async (ctx) => {
    const existingMenuItems = await ctx.db.query("menuItems").first();
    const existingTables = await ctx.db.query("tables").first();
    const existingUsers = await ctx.db.query("users").first();
    
    if (existingMenuItems || existingTables || existingUsers) {
      console.log("Database already seeded");
      return;
    }

    // Seed initial users with hashed passwords
    await ctx.db.insert("users", {
      email: "admin@restaurant.com",
      password: simpleHash("admin123"),
      name: "Admin User",
      role: "admin",
      isActive: true,
    });

    await ctx.db.insert("users", {
      email: "waiter@restaurant.com",
      password: simpleHash("waiter123"),
      name: "Waiter User",
      role: "waiter",
      isActive: true,
    });

    // Seed menu items
    const menuItems = [
      { name: "Butter Chicken", price: 250, category: "Main Course", isAvailable: true },
      { name: "Chicken Biryani", price: 180, category: "Rice", isAvailable: true },
      { name: "Paneer Tikka", price: 200, category: "Appetizer", isAvailable: true },
      { name: "Dal Makhani", price: 120, category: "Dal", isAvailable: true },
      { name: "Naan", price: 30, category: "Bread", isAvailable: true },
      { name: "Raita", price: 40, category: "Side Dish", isAvailable: true },
      { name: "Gulab Jamun", price: 60, category: "Dessert", isAvailable: true },
      { name: "Masala Chai", price: 20, category: "Beverage", isAvailable: true },
      { name: "Veg Fried Rice", price: 150, category: "Rice", isAvailable: true },
      { name: "Chicken Curry", price: 220, category: "Main Course", isAvailable: true },
      { name: "Aloo Paratha", price: 80, category: "Bread", isAvailable: true },
      { name: "Mixed Veg", price: 140, category: "Main Course", isAvailable: true }
    ];

    for (const item of menuItems) {
      await ctx.db.insert("menuItems", item);
    }

    // Seed tables
    for (let i = 1; i <= 12; i++) {
      await ctx.db.insert("tables", {
        number: i,
        isOccupied: false
      });
    }

    console.log("Database seeded successfully with users, menu items, and tables");
  },
});
