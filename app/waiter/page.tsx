"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Navigation from "@/components/Navigation";
import { printerManager, generateKitchenReceipt } from "@/lib/printer";

interface OrderItem {
  itemId: Id<"menuItems">;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  status: "pending" | "preparing" | "ready";
}

export default function WaiterPage() {
  const [selectedTable, setSelectedTable] = useState<Id<"tables"> | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const tables = useQuery(api.tables.getAll);
  const menuWithCategories = useQuery(api.menu.getItemsWithCategories);
  const selectedTableOrder = useQuery(
    api.orders.getByTable,
    selectedTable ? { tableId: selectedTable } : "skip"
  );

  // Sample order for demo purposes
  const sampleOrder = {
    _id: "order1" as Id<"orders">,
    tableId: "table2" as Id<"tables">,
    waiterId: "waiter1" as Id<"users">,
    status: "confirmed" as const,
    items: [
      { itemId: "item4" as Id<"menuItems">, quantity: 2, unitPrice: 18.99, totalPrice: 37.98, notes: "Medium well", status: "ready" as const },
      { itemId: "item8" as Id<"menuItems">, quantity: 1, unitPrice: 4.99, totalPrice: 4.99, notes: "", status: "ready" as const },
    ],
    totalAmount: 42.97,
    taxAmount: 7.73,
    finalAmount: 50.70,
    notes: "Table by window",
    createdAt: Date.now() - 1800000, // 30 minutes ago
    updatedAt: Date.now() - 1800000,
    confirmedAt: Date.now() - 1700000,
  };

  // Use sample order if no real order exists and table 2 is selected
  const displayOrder = selectedTableOrder || (selectedTable === "table2" ? sampleOrder : null);

  const createOrder = useMutation(api.orders.create);
  const updateOrderStatus = useMutation(api.orders.updateStatus);

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-gray-500";
      case "occupied":
        return "bg-gray-700";
      case "reserved":
        return "bg-gray-400";
      case "cleaning":
        return "bg-gray-300";
      default:
        return "bg-gray-500";
    }
  };

  const addItemToOrder = (item: { _id: Id<"menuItems">; price: number; name?: string; description?: string; preparationTime?: number }) => {
    const existingItemIndex = currentOrder.findIndex(
      (orderItem) => orderItem.itemId === item._id
    );

    if (existingItemIndex >= 0) {
      const updatedOrder = [...currentOrder];
      updatedOrder[existingItemIndex].quantity += 1;
      updatedOrder[existingItemIndex].totalPrice =
        updatedOrder[existingItemIndex].quantity * item.price;
      setCurrentOrder(updatedOrder);
    } else {
      const newOrderItem: OrderItem = {
        itemId: item._id,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        status: "pending",
      };
      setCurrentOrder([...currentOrder, newOrderItem]);
    }
  };

  const removeItemFromOrder = (itemId: Id<"menuItems">) => {
    setCurrentOrder(currentOrder.filter((item) => item.itemId !== itemId));
  };

  const updateItemQuantity = (itemId: Id<"menuItems">, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(itemId);
      return;
    }

    const updatedOrder = currentOrder.map((item) => {
      if (item.itemId === itemId) {
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice,
        };
      }
      return item;
    });

    setCurrentOrder(updatedOrder);
  };

  const updateItemNotes = (itemId: Id<"menuItems">, notes: string) => {
    const updatedOrder = currentOrder.map((item) => {
      if (item.itemId === itemId) {
        return { ...item, notes };
      }
      return item;
    });

    setCurrentOrder(updatedOrder);
  };

  const handleCreateOrder = async () => {
    if (!selectedTable || currentOrder.length === 0) {
      toast.error("Please select a table and add items to the order");
      return;
    }

    try {
      const orderId = await createOrder({
        tableId: selectedTable,
        waiterId: "waiter1" as Id<"users">, // In real app, get from auth context
        items: currentOrder,
        notes: "",
      });

      // Auto-print kitchen receipt when order is created
      if (menuWithCategories) {
        try {
          const orderData = {
            _id: orderId,
            tableId: selectedTable,
            waiterId: "waiter1" as Id<"users">,
            items: currentOrder,
            totalAmount: currentOrder.reduce((sum, item) => sum + item.totalPrice, 0),
            taxAmount: 0,
            finalAmount: currentOrder.reduce((sum, item) => sum + item.totalPrice, 0),
            notes: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          const kitchenReceipt = generateKitchenReceipt(orderData, menuWithCategories.flatMap(cat => cat.items));
          await printerManager.printReceipt({
            content: kitchenReceipt,
            printerType: 'kitchen'
          });
          toast.success("Kitchen receipt printed successfully");
        } catch (error) {
          console.error("Failed to print kitchen receipt:", error);
          toast.error("Failed to print kitchen receipt");
        }
      }

      toast.success("Order created successfully!");
      setCurrentOrder([]);
      setIsOrderDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create order");
      console.error(error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: Id<"orders">, newStatus: string) => {
    try {
      await updateOrderStatus({
        orderId,
        status: newStatus as "pending" | "confirmed" | "preparing" | "ready" | "completed" | "served" | "cancelled",
      });

      if (newStatus === "completed") {
        toast.success("Order marked as completed");
      } else {
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (error) {
      toast.error("Failed to update order status");
      console.error(error);
    }
  };

  const handleTableClick = (tableId: Id<"tables">) => {
    setSelectedTable(tableId);
  };

  if (!tables || !menuWithCategories) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading waiter dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Waiter Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage tables and create orders</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tables Grid */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="text-gray-800">Restaurant Tables</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tables.map((table) => (
                      <div
                        key={table._id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedTable === table._id
                            ? "border-gray-500 bg-gray-100 shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleTableClick(table._id)}
                      >
                        <div className="text-center">
                          <div className={`w-4 h-4 rounded-full ${getTableStatusColor(table.status)} mx-auto mb-2`}></div>
                          <h3 className="font-bold text-gray-900 text-lg">Table {table.tableNumber}</h3>
                          <p className="text-gray-600 text-sm">Capacity: {table.capacity}</p>
                          <Badge className={`mt-2 ${
                            table.status === "available" ? "bg-gray-100 text-gray-800" :
                            table.status === "occupied" ? "bg-gray-700 text-white" :
                            table.status === "reserved" ? "bg-gray-400 text-white" :
                            "bg-gray-300 text-gray-700"
                          }`}>
                            {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Management */}
            <div>
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="text-gray-800">Order Management</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedTable ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Selected Table</h3>
                        <p className="text-gray-600">Table {tables.find(t => t._id === selectedTable)?.tableNumber}</p>
                      </div>

                      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                            Create New Order
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Create Order for Table {tables.find(t => t._id === selectedTable)?.tableNumber}</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Menu Items */}
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-3">Menu Items</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {menuWithCategories.map((category) => (
                                  <div key={category._id} className="space-y-2">
                                    <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
                                      {category.name}
                                    </h4>
                                    {category.items.map((item) => (
                                      <div
                                        key={item._id}
                                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                        onClick={() => addItemToOrder(item)}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                                            <p className="text-sm text-gray-600">{item.description}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-gray-900">${item.price.toFixed(2)}</p>
                                            <p className="text-xs text-gray-500">{item.preparationTime} min</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Current Order */}
                            {currentOrder.length > 0 && (
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Current Order</h3>
                                <div className="space-y-3">
                                  {currentOrder.map((orderItem) => {
                                    const menuItem = menuWithCategories
                                      .flatMap(cat => cat.items)
                                      .find(item => item._id === orderItem.itemId);
                                    
                                    return (
                                      <div key={orderItem.itemId} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                          <div>
                                            <h5 className="font-medium text-gray-900">{menuItem?.name}</h5>
                                            <p className="text-sm text-gray-600">${orderItem.unitPrice.toFixed(2)} each</p>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => updateItemQuantity(orderItem.itemId, orderItem.quantity - 1)}
                                              className="w-8 h-8 p-0"
                                            >
                                              -
                                            </Button>
                                            <span className="font-medium text-gray-900 w-8 text-center">
                                              {orderItem.quantity}
                                            </span>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => updateItemQuantity(orderItem.itemId, orderItem.quantity + 1)}
                                              className="w-8 h-8 p-0"
                                            >
                                              +
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => removeItemFromOrder(orderItem.itemId)}
                                              className="w-8 h-8 p-0 text-red-600 border-red-300 hover:bg-red-50"
                                            >
                                              ×
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <input
                                            type="text"
                                            placeholder="Special notes..."
                                            value={orderItem.notes || ""}
                                            onChange={(e) => updateItemNotes(orderItem.itemId, e.target.value)}
                                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 mr-2"
                                          />
                                          <span className="font-semibold text-gray-900">
                                            ${orderItem.totalPrice.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-700">Total:</span>
                                    <span className="font-bold text-gray-900 text-lg">
                                      ${currentOrder.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  onClick={handleCreateOrder}
                                  className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white"
                                >
                                  Create Order
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Existing Order */}
                      {displayOrder && (
                        <div className="mt-6">
                          <h3 className="font-semibold text-gray-900 mb-3">Current Order</h3>
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-medium text-gray-900">Order #{displayOrder._id.slice(-6)}</p>
                                <p className="text-sm text-gray-600">Status: {displayOrder.status}</p>
                              </div>
                              <Badge className={`${
                                displayOrder.status === "pending" ? "bg-gray-100 text-gray-800" :
                                displayOrder.status === "confirmed" ? "bg-gray-200 text-gray-700" :
                                displayOrder.status === "preparing" ? "bg-gray-300 text-gray-700" :
                                displayOrder.status === "ready" ? "bg-gray-400 text-white" :
                                "bg-gray-500 text-white"
                              }`}>
                                {displayOrder.status.charAt(0).toUpperCase() + displayOrder.status.slice(1)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              {displayOrder.items.map((item) => {
                                const menuItem = menuWithCategories
                                  .flatMap(cat => cat.items)
                                  .find((menuItem: { _id: Id<"menuItems">; name?: string }) => menuItem._id === item.itemId);
                                
                                return (
                                  <div key={item.itemId} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-700">
                                      {item.quantity}x {menuItem?.name}
                                      {item.notes && <span className="text-gray-500 ml-2">({item.notes})</span>}
                                    </span>
                                    <span className="font-medium text-gray-900">${item.totalPrice.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            <div className="border-t border-gray-200 pt-3">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-medium text-gray-700">Total:</span>
                                <span className="font-bold text-gray-900">${displayOrder.finalAmount.toFixed(2)}</span>
                              </div>
                              
                              <div className="flex space-x-2">
                                {displayOrder.status === "pending" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateOrderStatus(displayOrder._id, "confirmed")}
                                    className="bg-gray-600 hover:bg-gray-700 text-white"
                                  >
                                    Confirm
                                  </Button>
                                )}
                                {displayOrder.status === "confirmed" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateOrderStatus(displayOrder._id, "preparing")}
                                    className="bg-gray-600 hover:bg-gray-700 text-white"
                                  >
                                    Start Preparing
                                  </Button>
                                )}
                                {displayOrder.status === "preparing" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateOrderStatus(displayOrder._id, "ready")}
                                    className="bg-gray-600 hover:bg-gray-700 text-white"
                                  >
                                    Mark Ready
                                  </Button>
                                )}
                                {displayOrder.status === "ready" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateOrderStatus(displayOrder._id, "completed")}
                                    className="bg-gray-600 hover:bg-gray-700 text-white"
                                  >
                                    Complete Order
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-lg">No Table Selected</p>
                      <p className="text-gray-400 text-sm">Click on a table to manage orders</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
