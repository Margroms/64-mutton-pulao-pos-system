import { mutation } from "./_generated/server";

// Migration function to add orderType to existing orders
export const migrateOrderTypes = mutation({
  handler: async (ctx) => {
    // Get all orders without orderType
    const orders = await ctx.db.query("orders").collect();
    
    let updatedCount = 0;
    
    for (const order of orders) {
      if (!order.orderType) {
        // Determine orderType based on tableNumber
        const orderType = order.tableNumber ? "table" : "parcel";
        
        await ctx.db.patch(order._id, {
          orderType: orderType
        });
        
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} orders with orderType`);
    return updatedCount;
  },
});
