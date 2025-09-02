"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Minus,
  Send,
  ShoppingCart,
  Bluetooth,
  Search,
  X,
  Package,
  Utensils
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReceiptPreview } from "@/components/ReceiptPreview";

interface OrderItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menuItemId: any;
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

interface TableOrder {
  tableNumber: number;
  items: OrderItem[];
  total: number;
  orderId?: string;
}

interface WaiterDashboardProps {
  currentUser: User | null;
}

export function WaiterDashboard({ currentUser }: WaiterDashboardProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showPCModal, setShowPCModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [tableOrders, setTableOrders] = useState<Map<number, TableOrder>>(new Map());
  const [printerConnected, setPrinterConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount
  useState(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  // Convex queries and mutations
  const tables = useQuery(api.tables.getTables);
  const menuItems = useQuery(api.menu.getMenuItems);
  const createOrderMutation = useMutation(api.orders.createOrder);
  const sendToKitchenMutation = useMutation(api.orders.sendToKitchen);
  const sendToBillingMutation = useMutation(api.orders.sendToBilling);
  const updateTableOccupationMutation = useMutation(api.tables.setTableOccupation);

  const selectTable = (tableNumber: number) => {
    setSelectedTable(tableNumber);
    
    // Initialize table order if it doesn't exist
    if (!tableOrders.has(tableNumber)) {
      setTableOrders(prev => new Map(prev.set(tableNumber, {
        tableNumber,
        items: [],
        total: 0
      })));
    }
    
    // Set current order to this table's order
    const tableOrder = tableOrders.get(tableNumber);
    setCurrentOrder(tableOrder?.items || []);
    
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setShowPCModal(true);
    }
  };

  const selectParcel = () => {
    setSelectedTable(null);
    setCurrentOrder([]);
    
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setShowPCModal(true);
    }
  };

  const addItemToOrder = (menuItem: { _id: string; name: string; price: number }) => {
    setCurrentOrder(prev => {
      const existingItem = prev.find(item => item.menuItemId === menuItem._id);
      let newItems;
      
      if (existingItem) {
        newItems = prev.map(item =>
          item.menuItemId === menuItem._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...prev, {
          menuItemId: menuItem._id,
          menuItemName: menuItem.name,
          quantity: 1,
          price: menuItem.price
        }];
      }
      
      // Update table orders if this is a table order
      if (selectedTable) {
        const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setTableOrders(prev => new Map(prev.set(selectedTable, {
          tableNumber: selectedTable,
          items: newItems,
          total
        })));
      }
      
      return newItems;
    });
  };

  const removeItemFromOrder = (menuItemId: string) => {
    setCurrentOrder(prev => {
      const newItems = prev.filter(item => item.menuItemId !== menuItemId);
      
      // Update table orders if this is a table order
      if (selectedTable) {
        const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setTableOrders(prev => new Map(prev.set(selectedTable, {
          tableNumber: selectedTable,
          items: newItems,
          total
        })));
      }
      
      return newItems;
    });
  };

  const updateItemQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(menuItemId);
      return;
    }

    setCurrentOrder(prev => {
      const newItems = prev.map(item =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: newQuantity }
          : item
      );
      
      // Update table orders if this is a table order
      if (selectedTable) {
        const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setTableOrders(prev => new Map(prev.set(selectedTable, {
          tableNumber: selectedTable,
          items: newItems,
          total
        })));
      }
      
      return newItems;
    });
  };

  const sendToKitchen = async () => {
    if (currentOrder.length === 0) return;

    try {
      const orderId = await createOrderMutation({
        tableNumber: selectedTable || undefined,
        orderType: selectedTable ? "table" : "parcel",
        items: currentOrder.map(item => ({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          price: item.price
        })),
        waiterId: currentUser?._id,
        waiterName: currentUser?.name || "Current Waiter"
      });

      // Send to kitchen
      await sendToKitchenMutation({ orderId });

      // Mark table as occupied if it's a table order
      if (selectedTable) {
        await updateTableOccupationMutation({
          tableNumber: selectedTable,
          isOccupied: true,
          orderId: orderId
        });
      }

      // Clear current order
      setCurrentOrder([]);
      
      // Close modal
      if (isMobile) {
        setShowMobileModal(false);
      } else {
        setShowPCModal(false);
      }

      alert(`${selectedTable ? "Table order" : "Parcel order"} sent to kitchen!`);
    } catch (error) {
      console.error("Error sending to kitchen:", error);
      alert("Failed to send to kitchen");
    }
  };

  const sendToBilling = async () => {
    if (selectedTable) {
      // For table orders, check if there are current items or if table is occupied
      const tableOrder = tableOrders.get(selectedTable);
      const hasCurrentItems = currentOrder.length > 0;
      const hasTableOrder = tableOrder && tableOrder.items.length > 0;
      
      if (hasCurrentItems || hasTableOrder) {
        // Send current order or accumulated table order to billing
        const itemsToSend = hasCurrentItems ? currentOrder : (tableOrder?.items || []);
        
        try {
          const orderId = await createOrderMutation({
            tableNumber: selectedTable,
            orderType: "table",
            items: itemsToSend.map(item => ({
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              quantity: item.quantity,
              price: item.price
            })),
            waiterId: currentUser?._id,
            waiterName: currentUser?.name || "Current Waiter"
          });

          await sendToBillingMutation({ orderId });

          // Mark table as free
          await updateTableOccupationMutation({
            tableNumber: selectedTable,
            isOccupied: false,
            orderId: orderId
          });

          // Remove table order from local state
          setTableOrders(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedTable);
            return newMap;
          });

          // Clear current order and close modal
          setCurrentOrder([]);
          setSelectedTable(null);
          
          if (isMobile) {
            setShowMobileModal(false);
          } else {
            setShowPCModal(false);
          }

          alert("Table order sent to billing and table cleared!");
        } catch (error) {
          console.error("Error sending to billing:", error);
          alert("Failed to send to billing");
        }
      } else {
        // No items to send, just clear the table occupation
        try {
          await updateTableOccupationMutation({
            tableNumber: selectedTable,
            isOccupied: false,
            orderId: undefined
          });

          // Clear current order and close modal
          setCurrentOrder([]);
          setSelectedTable(null);
          
          if (isMobile) {
            setShowMobileModal(false);
          } else {
            setShowPCModal(false);
          }

          alert("Table cleared (no items to bill)!");
        } catch (error) {
          console.error("Error clearing table:", error);
          alert("Failed to clear table");
        }
      }
    } else if (currentOrder.length > 0) {
      // Send current parcel order to billing
      try {
        const orderId = await createOrderMutation({
          tableNumber: undefined,
          orderType: "parcel",
          items: currentOrder.map(item => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            price: item.price
          })),
          waiterId: currentUser?._id,
          waiterName: currentUser?.name || "Current Waiter"
        });

        await sendToBillingMutation({ orderId });

        // Clear current order and close modal
        setCurrentOrder([]);
        
        if (isMobile) {
          setShowMobileModal(false);
        } else {
          setShowPCModal(false);
        }

        alert("Parcel order sent to billing!");
      } catch (error) {
        console.error("Error sending to billing:", error);
        alert("Failed to send to billing");
      }
    }
  };

  const connectToPrinter = async () => {
    try {
      if ('bluetooth' in navigator) {
        const device = await (navigator as unknown as { bluetooth: { requestDevice: (options: unknown) => Promise<unknown> } }).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['00001800-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb']
        });
        
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
      console.error("Bluetooth connection error:", error);
      alert("Failed to connect to printer");
    }
  };

  const filteredMenuItems = menuItems?.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const currentTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
          <p className="text-gray-600">Manage tables and orders</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={connectToPrinter}
            variant={printerConnected ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Bluetooth className="w-4 h-4" />
            {printerConnected ? "Printer Connected" : "Connect Printer"}
          </Button>
          
          <Button
            onClick={selectParcel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Parcel Order
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {tables?.map((table) => {
          const tableOrder = tableOrders.get(table.number);
          const isOccupied = table.isOccupied || (tableOrder && tableOrder.items.length > 0);
          
          return (
            <Card
              key={table._id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isOccupied 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-green-500 bg-green-50'
              } ${selectedTable === table.number ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => selectTable(table.number)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {table.number}
                </div>
                <Badge variant={isOccupied ? "secondary" : "default"}>
                  {isOccupied ? "Occupied" : "Free"}
                </Badge>
                {tableOrder && tableOrder.items.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    {tableOrder.items.length} items
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mobile Modal */}
      <Dialog open={showMobileModal} onOpenChange={setShowMobileModal}>
        <DialogContent className="w-[98vw] h-[95vh] max-w-none p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-white sticky top-0 z-10">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedTable ? (
                <>
                  <Utensils className="w-5 h-5" />
                  Table {selectedTable}
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Parcel Order
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-4 border-b bg-white sticky top-16 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                {filteredMenuItems.map((item) => (
                  <Card key={item._id} className="cursor-pointer hover:shadow-md bg-white">
                    <CardContent className="p-3">
                      <div className="text-sm font-medium mb-2 line-clamp-2">{item.name}</div>
                      <div className="text-lg font-bold text-green-600 mb-2">
                        ₹{item.price}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addItemToOrder(item)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Current Order - Fixed at bottom */}
            <div className="border-t bg-white p-4 sticky bottom-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Current Order</h3>
                <Badge variant="outline">₹{currentTotal}</Badge>
              </div>
              
              <div className="space-y-2 max-h-24 overflow-y-auto mb-4">
                {currentOrder.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.menuItemName}</div>
                      <div className="text-sm text-gray-600">₹{item.price} × {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={sendToKitchen}
                  disabled={currentOrder.length === 0}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Kitchen
                </Button>
                <Button
                  onClick={sendToBilling}
                  disabled={selectedTable ? false : currentOrder.length === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Send to Billing
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PC Modal */}
      <Dialog open={showPCModal} onOpenChange={setShowPCModal}>
        <DialogContent className="w-[95vw] max-w-[1400px] h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-white">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {selectedTable ? (
                <>
                  <Utensils className="w-7 h-7" />
                  Table {selectedTable} - Order Management
                </>
              ) : (
                <>
                  <Package className="w-7 h-7" />
                  Parcel Order
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-full">
            {/* Left Side - Menu Items */}
            <div className="w-3/5 border-r p-6 bg-gray-50">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 text-lg h-12"
                  />
                </div>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto max-h-[70vh] pr-2">
                {filteredMenuItems.map((item) => (
                  <Card key={item._id} className="cursor-pointer hover:shadow-lg transition-shadow bg-white">
                    <CardContent className="p-4">
                      <div className="text-lg font-semibold mb-3 line-clamp-2 min-h-[3rem]">{item.name}</div>
                      <div className="text-xl font-bold text-green-600 mb-4">
                        ₹{item.price}
                      </div>
                      <Button
                        onClick={() => addItemToOrder(item)}
                        className="w-full"
                        size="lg"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Item
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Side - Current Order */}
            <div className="w-2/5 p-6 bg-white">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-3">Current Order</h3>
                <div className="text-3xl font-bold text-green-600">₹{currentTotal}</div>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-6 max-h-[45vh] overflow-y-auto pr-2">
                {currentOrder.map((item) => (
                  <div key={item.menuItemId} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-lg">{item.menuItemName}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItemFromOrder(item.menuItemId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-base text-gray-600">₹{item.price} × {item.quantity}</div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                          className="h-9 w-9 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-medium text-lg w-10 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                          className="h-9 w-9 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={sendToKitchen}
                  disabled={currentOrder.length === 0}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  <Send className="w-6 h-6 mr-3" />
                  Send to Kitchen
                </Button>
                <Button
                  onClick={sendToBilling}
                  disabled={selectedTable ? false : currentOrder.length === 0}
                  variant="outline"
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  <ShoppingCart className="w-6 h-6 mr-3" />
                  Send to Billing
                </Button>
              </div>

              {/* Receipt Preview */}
              {currentOrder.length > 0 && (
                <div className="mt-6">
                  <ReceiptPreview
                    type="order"
                    data={{
                      orderType: selectedTable ? "table" : "parcel",
                      tableNumber: selectedTable || 0,
                      items: currentOrder,
                      total: currentTotal,
                      date: new Date().toLocaleString()
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
