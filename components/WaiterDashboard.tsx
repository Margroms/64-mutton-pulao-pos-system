"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Minus,
  Send,
  Users,
  ShoppingCart,
  Bluetooth,
  Printer,
  Check,
  Clock
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReceiptPreview } from "@/components/ReceiptPreview";

interface OrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  price: number;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

interface CurrentOrder {
  tableNumber: number | null;
  orderType: "table" | "parcel";
  items: OrderItem[];
  total: number;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
}

interface WaiterDashboardProps {
  currentUser: User | null;
}

export function WaiterDashboard({ currentUser }: WaiterDashboardProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<CurrentOrder>({
    tableNumber: null,
    orderType: "table",
    items: [],
    total: 0
  });
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);

  // Convex queries and mutations
  const tables = useQuery(api.tables.getTables);
  const menuItems = useQuery(api.menu.getMenuItems);
  const createOrderMutation = useMutation(api.orders.createOrder);
  const sendToKitchenMutation = useMutation(api.orders.sendToKitchen);
  const sendToBillingMutation = useMutation(api.orders.sendToBilling);

  const selectTable = (tableNumber: number) => {
    setSelectedTable(tableNumber);
    setCurrentOrder(prev => ({ 
      ...prev, 
      tableNumber, 
      orderType: "table" 
    }));
  };

  const selectParcel = () => {
    setSelectedTable(null);
    setCurrentOrder(prev => ({ 
      ...prev, 
      tableNumber: null, 
      orderType: "parcel" 
    }));
  };

  const addItemToOrder = (menuItem: any) => {
    setCurrentOrder(prev => {
      const existingItem = prev.items.find(item => item.menuItemId === menuItem._id);
      let newItems;
      
      if (existingItem) {
        newItems = prev.items.map(item =>
          item.menuItemId === menuItem._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...prev.items, {
          menuItemId: menuItem._id,
          menuItemName: menuItem.name,
          quantity: 1,
          price: menuItem.price
        }];
      }
      
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { ...prev, items: newItems, total };
    });
  };

  const removeItemFromOrder = (menuItemId: string) => {
    setCurrentOrder(prev => {
      const newItems = prev.items
        .map(item =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0);
      
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return { ...prev, items: newItems, total };
    });
  };

  const createOrder = async () => {
    if ((currentOrder.orderType === "table" && !currentOrder.tableNumber) || currentOrder.items.length === 0) return;

    try {
      const orderId = await createOrderMutation({
        tableNumber: currentOrder.tableNumber || undefined,
        orderType: currentOrder.orderType,
        items: currentOrder.items.map(item => ({
          menuItemId: item.menuItemId as any,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          price: item.price
        })),
        waiterId: currentUser?._id,
        waiterName: currentUser?.name || "Current Waiter",
        customerInfo: currentOrder.customerInfo
      });

      // Automatically send to kitchen for printing
      await sendToKitchenMutation({ orderId });

      // Reset order
      setCurrentOrder({
        tableNumber: null,
        orderType: "table",
        items: [],
        total: 0
      });
      setSelectedTable(null);
      setShowOrderDialog(false);

      alert(`${currentOrder.orderType === "parcel" ? "Parcel order" : "Table order"} sent to kitchen!`);
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order");
    }
  };

  const sendToBilling = async () => {
    if ((currentOrder.orderType === "table" && !currentOrder.tableNumber) || currentOrder.items.length === 0) return;

    try {
      const orderId = await createOrderMutation({
        tableNumber: currentOrder.tableNumber || undefined,
        orderType: currentOrder.orderType,
        items: currentOrder.items.map(item => ({
          menuItemId: item.menuItemId as any,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          price: item.price
        })),
        waiterId: currentUser?._id,
        waiterName: currentUser?.name || "Current Waiter",
        customerInfo: currentOrder.customerInfo
      });

      await sendToBillingMutation({ orderId });

      // Reset order
      setCurrentOrder({
        tableNumber: null,
        orderType: "table",
        items: [],
        total: 0
      });
      setSelectedTable(null);
      setShowOrderDialog(false);

      alert(`${currentOrder.orderType === "parcel" ? "Parcel order" : "Table order"} sent to billing!`);
    } catch (error) {
      console.error("Error sending to billing:", error);
      alert("Failed to send to billing");
    }
  };

  const connectToPrinter = async () => {
    try {
      if ('bluetooth' in navigator) {
        // Web Bluetooth API - more permissive filter for thermal printers
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['00001800-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb']
        });
        
        // Connect to the device
        const server = await device.gatt?.connect();
        if (server) {
          setPrinterConnected(true);
          alert("Kitchen printer connected successfully!");
        } else {
          alert("Failed to establish connection with printer");
        }
      } else {
        alert("Bluetooth not supported in this browser");
      }
    } catch (error) {
      console.error("Failed to connect to printer:", error);
      if (error === 'User cancelled the requestDevice() chooser.') {
        alert("Printer connection cancelled");
      } else {
        alert("Failed to connect to printer. Make sure it's in pairing mode.");
      }
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
          <p className="text-gray-600">Manage tables and orders</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant={printerConnected ? "default" : "outline"}
            onClick={connectToPrinter}
            className="flex items-center gap-2 text-sm"
            size="sm"
          >
            <Bluetooth className="h-4 w-4" />
            <span className="hidden sm:inline">
              {printerConnected ? "Connected" : "Connect Kitchen Printer"}
            </span>
            <span className="sm:hidden">
              {printerConnected ? "Connected" : "Connect Printer"}
            </span>
          </Button>
        </div>
      </div>

      {/* Order Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Order Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Tables Section */}
            <div className="flex-1">
              <h3 className="font-medium mb-3">Table Service</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-4">
                {tables?.map((table) => (
                  <Button
                    key={table._id}
                    variant={selectedTable === table.number && currentOrder.orderType === "table" ? "default" : "outline"}
                    className={`h-16 lg:h-20 flex flex-col items-center justify-center text-xs lg:text-sm ${
                      table.isOccupied ? "bg-red-50 border-red-200" : ""
                    }`}
                    onClick={() => selectTable(table.number)}
                  >
                    <span className="font-bold">T{table.number}</span>
                    <Badge variant={table.isOccupied ? "destructive" : "secondary"} className="text-xs mt-1">
                      {table.isOccupied ? "Busy" : "Free"}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Parcel Section - Only show for admin users */}
            {currentUser?.role === "admin" && (
              <div className="flex-1 sm:max-w-xs">
                <h3 className="font-medium mb-3">Parcel Orders</h3>
                <Button
                  variant={currentOrder.orderType === "parcel" ? "default" : "outline"}
                  className="w-full h-16 lg:h-20 flex flex-col items-center justify-center"
                  onClick={selectParcel}
                >
                  <ShoppingCart className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">Parcel Order</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Order */}
      {(selectedTable || currentOrder.orderType === "parcel") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Current Order - {currentOrder.orderType === "parcel" ? "Parcel" : `Table ${selectedTable}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentOrder.items.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {currentOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{item.menuItemName}</span>
                      <span className="text-gray-600 ml-2">₹{item.price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItemFromOrder(item.menuItemId)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const menuItem = menuItems?.find(m => m._id === item.menuItemId);
                          if (menuItem) addItemToOrder(menuItem);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="ml-4 font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                  <span className="text-lg font-bold">Total: ₹{currentOrder.total}</span>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">Preview</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Order Preview</DialogTitle>
                        </DialogHeader>
                        <ReceiptPreview
                          type="order"
                          data={{
                            tableNumber: currentOrder.tableNumber || 0,
                            orderType: currentOrder.orderType,
                            items: currentOrder.items,
                            total: currentOrder.total,
                            date: new Date().toLocaleString()
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button onClick={createOrder} className="flex items-center gap-2 text-sm w-full sm:w-auto" size="sm">
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Send to Kitchen</span>
                      <span className="sm:hidden">Kitchen</span>
                    </Button>
                    <Button onClick={sendToBilling} variant="secondary" className="flex items-center gap-2 text-sm w-full sm:w-auto" size="sm">
                      <Clock className="h-4 w-4" />
                      <span className="hidden sm:inline">Send to Billing</span>
                      <span className="sm:hidden">Billing</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {menuItems?.map((item) => (
              <Card key={item._id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm lg:text-base">{item.name}</h3>
                    <Badge variant={item.isAvailable ? "default" : "secondary"} className="text-xs">
                      {item.isAvailable ? "Available" : "Out of Stock"}
                    </Badge>
                  </div>
                  <p className="text-xs lg:text-sm text-gray-600 mb-2">{item.category}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-base lg:text-lg font-bold">₹{item.price}</span>
                    <Button
                      size="sm"
                      onClick={() => addItemToOrder(item)}
                      disabled={(!selectedTable && currentOrder.orderType !== "parcel") || !item.isAvailable}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
