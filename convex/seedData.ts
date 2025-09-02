import { mutation } from "./_generated/server";

export const seedInitialData = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Create sample users
    const waiterId = await ctx.db.insert("users", {
      email: "waiter@restaurant.com",
      name: "John Waiter",
      role: "waiter",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const adminId = await ctx.db.insert("users", {
      email: "admin@restaurant.com",
      name: "Admin User",
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create sample tables
    const tables = [
      { tableNumber: 1, capacity: 4, position: { x: 100, y: 100 } },
      { tableNumber: 2, capacity: 2, position: { x: 300, y: 100 } },
      { tableNumber: 3, capacity: 6, position: { x: 500, y: 100 } },
      { tableNumber: 4, capacity: 4, position: { x: 100, y: 300 } },
      { tableNumber: 5, capacity: 8, position: { x: 300, y: 300 } },
      { tableNumber: 6, capacity: 2, position: { x: 500, y: 300 } },
    ];

    for (const table of tables) {
      await ctx.db.insert("tables", {
        ...table,
        status: "available",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create menu categories
    const appetizersId = await ctx.db.insert("menuCategories", {
      name: "Appetizers",
      description: "Start your meal with these delicious appetizers",
      isActive: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    });

    const mainCoursesId = await ctx.db.insert("menuCategories", {
      name: "Main Courses",
      description: "Hearty main dishes to satisfy your hunger",
      isActive: true,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    });

    const beveragesId = await ctx.db.insert("menuCategories", {
      name: "Beverages",
      description: "Refreshing drinks and beverages",
      isActive: true,
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    });

    const dessertsId = await ctx.db.insert("menuCategories", {
      name: "Desserts",
      description: "Sweet treats to end your meal",
      isActive: true,
      sortOrder: 4,
      createdAt: now,
      updatedAt: now,
    });

    // Create menu items
    const menuItems = [
      // Appetizers
      { name: "Spring Rolls", description: "Crispy vegetable spring rolls", price: 8.99, categoryId: appetizersId, preparationTime: 10 },
      { name: "Chicken Wings", description: "Spicy buffalo chicken wings", price: 12.99, categoryId: appetizersId, preparationTime: 15 },
      { name: "Bruschetta", description: "Toasted bread with tomato and basil", price: 9.99, categoryId: appetizersId, preparationTime: 8 },

      // Main Courses
      { name: "Grilled Chicken", description: "Juicy grilled chicken breast with herbs", price: 18.99, categoryId: mainCoursesId, preparationTime: 25 },
      { name: "Beef Burger", description: "Classic beef burger with fries", price: 15.99, categoryId: mainCoursesId, preparationTime: 20 },
      { name: "Vegetable Pasta", description: "Fresh pasta with seasonal vegetables", price: 14.99, categoryId: mainCoursesId, preparationTime: 18 },
      { name: "Fish & Chips", description: "Crispy fish with golden fries", price: 16.99, categoryId: mainCoursesId, preparationTime: 22 },

      // Beverages
      { name: "Fresh Orange Juice", description: "Freshly squeezed orange juice", price: 4.99, categoryId: beveragesId, preparationTime: 3 },
      { name: "Iced Coffee", description: "Cold brew coffee with ice", price: 3.99, categoryId: beveragesId, preparationTime: 5 },
      { name: "Soda", description: "Choice of cola, sprite, or orange", price: 2.99, categoryId: beveragesId, preparationTime: 2 },

      // Desserts
      { name: "Chocolate Cake", description: "Rich chocolate layer cake", price: 7.99, categoryId: dessertsId, preparationTime: 5 },
      { name: "Ice Cream", description: "Vanilla, chocolate, or strawberry", price: 4.99, categoryId: dessertsId, preparationTime: 3 },
    ];

    for (const item of menuItems) {
      await ctx.db.insert("menuItems", {
        ...item,
        isAvailable: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { waiterId, adminId, message: "Initial data seeded successfully!" };
  },
});
