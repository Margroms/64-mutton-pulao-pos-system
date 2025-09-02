"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Minus,
  Send,
  Users,
  ShoppingCart,
  Bluetooth,
  Clock,
  Eye,
  Search,
  X
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReceiptPreview } from "@/components/ReceiptPreview";

interface OrderItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menuItemId: any; // Convex ID type - using any for compatibility
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
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
    setShowOrderModal(true);
  };

  const selectParcel = () => {
    setSelectedTable(null);
    setCurrentOrder(prev => ({ 
      ...prev, 
      tableNumber: null, 
      orderType: "parcel" 
    }));
    setShowOrderModal(true);
  };

  const addItemToOrder = (menuItem: { _id: string; name: string; price: number }) => {
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
          menuItemId: item.menuItemId,
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
      setShowOrderModal(false);

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
          menuItemId: item.menuItemId,
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
      setShowOrderModal(false);

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
        const device = await (navigator as unknown as { bluetooth: { requestDevice: (options: unknown) => Promise<unknown> } }).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['00001800-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb']
        });
        
        // Connect to the device
        const server = await (device as { gatt?: { connect: () => Promise<unknown> } }).gatt?.connect();
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

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setCurrentOrder({
      tableNumber: null,
      orderType: "table",
      items: [],
      total: 0
    });
    setSelectedTable(null);
    setSearchTerm("");
  };

  // Filter menu items based on search
  const filteredMenuItems = menuItems?.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

      {/* Order Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="w-[95vw] max-w-7xl h-[90vh] max-h-[90vh] p-0 overflow-hidden sm:p-0">
          {/* Modal Header - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b bg-white gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {currentOrder.orderType === "parcel" ? "Parcel Order" : `Table ${selectedTable}`}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">Add items and manage your order</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={closeOrderModal} className="self-end sm:self-auto">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Main Content - Responsive Layout */}
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left Side - Current Order - Mobile First */}
            <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r bg-gray-50 flex flex-col min-h-0">
              <div className="p-3 sm:p-4 border-b bg-white">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <ShoppingCart className="h-4 w-4" />
                  Current Order ({currentOrder.items.length} items)
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
                {currentOrder.items.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-gray-500 text-sm">No items added yet</p>
                    <p className="text-gray-400 text-xs mt-1">Browse menu to add items</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {currentOrder.items.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs sm:text-sm text-gray-900 truncate">{item.menuItemName}</h4>
                            <p className="text-xs text-gray-500">₹{item.price} each</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                              onClick={() => removeItemFromOrder(item.menuItemId)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                              onClick={() => {
                                const menuItem = menuItems?.find(m => m._id === item.menuItemId);
                                if (menuItem) addItemToOrder(menuItem);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-semibold text-xs sm:text-sm">₹{item.price * item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary - Mobile Responsive */}
              <div className="p-3 sm:p-4 border-t bg-white space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">₹{currentOrder.total}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Preview Receipt
                      </Button>
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
                  
                  <Button 
                    onClick={createOrder} 
                    className="w-full bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                    disabled={currentOrder.items.length === 0}
                    size="sm"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Send to Kitchen
                  </Button>
                  
                  <Button 
                    onClick={sendToBilling} 
                    variant="secondary" 
                    className="w-full text-xs sm:text-sm"
                    disabled={currentOrder.items.length === 0}
                    size="sm"
                  >
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Send to Billing
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Side - Menu Items - Mobile Responsive */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search Bar - Mobile Responsive */}
              <div className="p-3 sm:p-4 border-b bg-white">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 text-sm sm:text-base"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Menu Items Grid - Mobile Responsive */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
                {filteredMenuItems.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Search className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-gray-500 text-sm">No items found</p>
                    <p className="text-gray-400 text-xs mt-1">Try searching for something else</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                    {filteredMenuItems.map((item) => (
                      <Card 
                        key={item._id} 
                        className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                          !item.isAvailable ? 'opacity-60' : ''
                        }`}
                      >
                        <CardContent className="p-2 sm:p-3 lg:p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-xs sm:text-sm lg:text-base text-gray-900 leading-tight flex-1 min-w-0 pr-2">{item.name}</h4>
                            <Badge 
                              variant={item.isAvailable ? "default" : "secondary"} 
                              className="text-xs ml-1 sm:ml-2 flex-shrink-0"
                            >
                              {item.isAvailable ? "Available" : "Out"}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 sm:mb-3">{item.category}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-blue-600 text-xs sm:text-sm lg:text-base">₹{item.price}</span>
                            <Button
                              size="sm"
                              onClick={() => addItemToOrder(item)}
                              disabled={!item.isAvailable}
                              className="h-6 sm:h-7 lg:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Add</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
