import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Check if data already exists
    const existingMenuItems = await ctx.db.query("menuItems").first();
    const existingTables = await ctx.db.query("tables").first();
    
    if (existingMenuItems || existingTables) {
      console.log("Database already seeded");
      return;
    }

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

    console.log("Database seeded successfully");
  },
});
