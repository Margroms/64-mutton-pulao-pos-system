"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Utensils,
  ArrowLeft,
  LogOut,
  ChevronDown,
  ChevronUp
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

export default function WaiterOrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableNumber = searchParams.get("table");
  const orderType = searchParams.get("type") || "table";
  
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [previousOrders, setPreviousOrders] = useState<OrderItem[]>([]);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPreviousOrdersOpen, setIsPreviousOrdersOpen] = useState(false);

  // Check if mobile on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("sessionToken");
      const userInfo = localStorage.getItem("userInfo");
      
      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          setCurrentUser(user);
        } catch (error) {
          console.error("Error parsing user info:", error);
          // Clear invalid data
          localStorage.removeItem("sessionToken");
          localStorage.removeItem("userInfo");
          router.push("/");
        }
      } else {
        router.push("/");
      }
    };

    checkAuth();
  }, [router]);

  // Convex queries and mutations
  const menuItems = useQuery(api.menu.getMenuItems);
  const existingOrders = useQuery(api.orders.getOrdersByTable, 
    tableNumber ? { tableNumber: parseInt(tableNumber) } : "skip"
  );
  const createOrderMutation = useMutation(api.orders.createOrder);
  const sendToKitchenMutation = useMutation(api.orders.sendToKitchen);
  const sendToBillingMutation = useMutation(api.orders.sendToBilling);
  const updateTableOccupationMutation = useMutation(api.tables.setTableOccupation);

  // Load existing orders for the table
  useEffect(() => {
    if (tableNumber && existingOrders) {
      const tableOrders = existingOrders.filter(order => 
        order.status === "pending" || order.status === "sent_to_kitchen"
      );
      
      // Combine all items from existing orders
      const allItems: OrderItem[] = [];
      tableOrders.forEach(order => {
        order.items.forEach((item: { menuItemId: string; menuItemName: string; quantity: number; price: number }) => {
          const existingItem = allItems.find(i => i.menuItemId === item.menuItemId);
          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            allItems.push({
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              quantity: item.quantity,
              price: item.price
            });
          }
        });
      });
      
      setPreviousOrders(allItems);
    }
  }, [tableNumber, existingOrders]);

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
      
      return newItems;
    });
  };

  const removeItemFromOrder = (menuItemId: string) => {
    setCurrentOrder(prev => {
      const newItems = prev.filter(item => item.menuItemId !== menuItemId);
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
      
      return newItems;
    });
  };

  const sendToKitchen = async () => {
    if (currentOrder.length === 0) return;

    try {
      const orderId = await createOrderMutation({
        tableNumber: tableNumber ? parseInt(tableNumber) : undefined,
        orderType: orderType as "table" | "parcel",
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
      if (tableNumber && orderType === "table") {
        await updateTableOccupationMutation({
          tableNumber: parseInt(tableNumber),
          isOccupied: true,
          orderId: orderId
        });
      }

      // Add current order to previous orders
      setPreviousOrders(prev => {
        const newItems = [...prev];
        currentOrder.forEach(item => {
          const existingItem = newItems.find(i => i.menuItemId === item.menuItemId);
          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            newItems.push({ ...item });
          }
        });
        return newItems;
      });

      // Clear current order
      setCurrentOrder([]);
      
      alert(`${orderType === "parcel" ? "Parcel order" : "Table order"} sent to kitchen!`);
    } catch (error) {
      console.error("Error sending to kitchen:", error);
      alert("Failed to send to kitchen");
    }
  };

  const sendToBilling = async () => {
    if (tableNumber && orderType === "table") {
      // Combine previous orders and current order for billing
      const allItems = [...previousOrders, ...currentOrder];
      
      if (allItems.length === 0) {
        // No items to send, just clear the table occupation
        try {
          await updateTableOccupationMutation({
            tableNumber: parseInt(tableNumber),
            isOccupied: false,
            orderId: undefined
          });

          // Clear all orders and redirect
          setCurrentOrder([]);
          setPreviousOrders([]);
          router.push("/waiter");
          
          alert("Table cleared (no items to bill)!");
        } catch (error) {
          console.error("Error clearing table:", error);
          alert("Failed to clear table");
        }
        return;
      }

      // Send all accumulated items to billing
      try {
        const orderId = await createOrderMutation({
          tableNumber: parseInt(tableNumber),
          orderType: "table",
          items: allItems.map(item => ({
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
          tableNumber: parseInt(tableNumber),
          isOccupied: false,
          orderId: orderId
        });

        // Clear all orders and redirect
        setCurrentOrder([]);
        setPreviousOrders([]);
        router.push("/waiter");
        
        alert("Table order sent to billing and table cleared!");
      } catch (error) {
        console.error("Error sending to billing:", error);
        alert("Failed to send to billing");
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

        // Clear current order and redirect
        setCurrentOrder([]);
        router.push("/waiter");
        
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

  const handleLogout = () => {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("userInfo");
    router.push("/");
  };

  const filteredMenuItems = menuItems?.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const currentTotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const previousTotal = previousOrders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalTotal = currentTotal + previousTotal;

  const getPageTitle = () => {
    if (orderType === "parcel") return "Parcel Order";
    if (tableNumber) return `Table ${tableNumber} - Order Management`;
    return "Order Management";
  };

  const getPageIcon = () => {
    if (orderType === "parcel") return <Package className="w-6 h-6" />;
    return <Utensils className="w-6 h-6" />;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/waiter")}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-2">
                {getPageIcon()}
                <h1 className="text-lg font-bold text-gray-900">{getPageTitle()}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={connectToPrinter}
                variant={printerConnected ? "default" : "outline"}
                size="sm"
                className="p-2"
              >
                <Bluetooth className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4 space-y-4">
          {/* Previous Orders - Collapsible */}
          {previousOrders.length > 0 && (
            <Card className="bg-gray-100 border-gray-300">
              <CardContent className="p-4">
                <button
                  onClick={() => setIsPreviousOrdersOpen(!isPreviousOrdersOpen)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-600">Previous Orders</h3>
                    <p className="text-sm text-gray-500">₹{previousTotal}</p>
                  </div>
                  {isPreviousOrdersOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {isPreviousOrdersOpen && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {previousOrders.map((item, index) => (
                      <div key={`${item.menuItemId}-${index}`} className="bg-gray-200 p-3 rounded-lg border border-gray-300">
                        <div className="font-medium text-gray-600 text-sm">{item.menuItemName}</div>
                        <div className="text-sm text-gray-500">₹{item.price} × {item.quantity}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Order */}
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-2">Current Order</h3>
                <div className="text-2xl font-bold text-green-600">₹{currentTotal}</div>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-4 max-h-32 overflow-y-auto">
                {currentOrder.map((item) => (
                  <div key={item.menuItemId} className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-green-800 text-sm">{item.menuItemName}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItemFromOrder(item.menuItemId)}
                        className="text-red-500 hover:text-red-700 p-1 h-6 w-6"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-green-700">₹{item.price} × {item.quantity}</div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                          className="h-7 w-7 p-0 border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-medium text-sm w-8 text-center text-green-800">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                          className="h-7 w-7 p-0 border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Previous:</span>
                  <span className="text-sm text-gray-500">₹{previousTotal}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Current:</span>
                  <span className="text-sm text-green-600">₹{currentTotal}</span>
                </div>
                <div className="flex justify-between items-center text-base font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span className="text-green-600">₹{totalTotal}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={sendToKitchen}
                  disabled={currentOrder.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Kitchen
                </Button>
                <Button
                  onClick={sendToBilling}
                  disabled={tableNumber ? false : currentOrder.length === 0}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  size="sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Send to Billing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Bar */}
          <div className="sticky top-20 z-10 bg-white p-4 border-b border-gray-200">
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

          {/* Receipt Preview */}
          {(currentOrder.length > 0 || previousOrders.length > 0) && (
            <div className="mt-4">
              <ReceiptPreview
                type="order"
                data={{
                  orderType: orderType as "table" | "parcel",
                  tableNumber: tableNumber ? parseInt(tableNumber) : 0,
                  items: [...previousOrders, ...currentOrder],
                  total: totalTotal,
                  date: new Date().toLocaleString()
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout (unchanged)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/waiter")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center gap-3">
              {getPageIcon()}
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={connectToPrinter}
              variant={printerConnected ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Bluetooth className="w-4 h-4" />
              {printerConnected ? "Printer Connected" : "Connect Printer"}
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
            
            {currentUser?.role === "admin" && (
              <Badge variant="outline" className="text-sm">
                Admin View
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Menu Items */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-lg h-12"
                />
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

          {/* Right Side - Order Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Previous Orders (Muted) */}
            {previousOrders.length > 0 && (
              <Card className="bg-gray-100 border-gray-300">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Previous Orders</h3>
                    <div className="text-2xl font-bold text-gray-500">₹{previousTotal}</div>
                  </div>
                  
                  <div className="space-y-3 max-h-32 overflow-y-auto">
                    {previousOrders.map((item, index) => (
                      <div key={`${item.menuItemId}-${index}`} className="bg-gray-200 p-3 rounded-lg border border-gray-300">
                        <div className="font-medium text-gray-600 text-sm">{item.menuItemName}</div>
                        <div className="text-sm text-gray-500">₹{item.price} × {item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Order */}
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold mb-3">Current Order</h3>
                  <div className="text-3xl font-bold text-green-600">₹{currentTotal}</div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-6 max-h-32 overflow-y-auto">
                  {currentOrder.map((item) => (
                    <div key={item.menuItemId} className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-lg text-green-800">{item.menuItemName}</div>
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
                        <div className="text-base text-green-700">₹{item.price} × {item.quantity}</div>
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                            className="h-9 w-9 p-0 border-green-300 text-green-700 hover:bg-green-100"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-medium text-lg w-10 text-center text-green-800">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                            className="h-9 w-9 p-0 border-green-300 text-green-700 hover:bg-green-100"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Previous Orders:</span>
                    <span className="text-gray-500">₹{previousTotal}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Current Order:</span>
                    <span className="text-green-600">₹{currentTotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">₹{totalTotal}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <Button
                    onClick={sendToKitchen}
                    disabled={currentOrder.length === 0}
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Send className="w-6 h-6 mr-3" />
                    Send to Kitchen
                  </Button>
                  <Button
                    onClick={sendToBilling}
                    disabled={tableNumber ? false : currentOrder.length === 0}
                    variant="outline"
                    className="w-full h-12 text-lg border-red-300 text-red-700 hover:bg-red-50"
                    size="lg"
                  >
                    <ShoppingCart className="w-6 h-6 mr-3" />
                    Send to Billing
                </Button>
                </div>

                {/* Receipt Preview */}
                {(currentOrder.length > 0 || previousOrders.length > 0) && (
                  <div className="mt-6">
                    <ReceiptPreview
                      type="order"
                      data={{
                        orderType: orderType as "table" | "parcel",
                        tableNumber: tableNumber ? parseInt(tableNumber) : 0,
                        items: [...previousOrders, ...currentOrder],
                        total: totalTotal,
                        date: new Date().toLocaleString()
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
