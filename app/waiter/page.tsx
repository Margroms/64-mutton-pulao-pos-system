"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bluetooth,
  Utensils,
  LogOut
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

export default function WaiterDashboardPage() {
  const router = useRouter();
  const [printerConnected, setPrinterConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("sessionToken");
      const userInfo = localStorage.getItem("userInfo");
      
      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          setCurrentUser(user);
          setIsLoading(false);
        } catch (error) {
          console.error("Error parsing user info:", error);
          // Clear invalid data
          localStorage.removeItem("sessionToken");
          localStorage.removeItem("userInfo");
          setIsLoading(false);
          router.push("/");
        }
      } else {
        setIsLoading(false);
        router.push("/");
      }
    };

    checkAuth();
  }, [router]);

  // Convex queries and mutations
  const tables = useQuery(api.tables.getTables);

  const selectTable = (tableNumber: number) => {
    router.push(`/waiter/order?table=${tableNumber}&type=table`);
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

  const goToAdmin = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please log in to access waiter functions</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Utensils className="w-8 h-8 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={connectToPrinter}
              variant={printerConnected ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Bluetooth className="w-4 h-4" />
              <span className="hidden sm:inline">
                {printerConnected ? "Printer Connected" : "Connect Printer"}
              </span>
            </Button>
            
            {currentUser?.role === "admin" && (
              <Button
                onClick={goToAdmin}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Utensils className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Button>
            )}
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
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
        {/* Tables Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Restaurant Tables</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {tables?.map((table) => (
              <Card
                key={table._id}
                className={`cursor-pointer transition-all hover:shadow-lg bg-white ${
                  table.isOccupied 
                    ? 'border-2 border-red-500 hover:border-red-600' 
                    : 'border-2 border-green-500 hover:border-green-600'
                }`}
                onClick={() => selectTable(table.number)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {table.number}
                  </div>
                  <Badge 
                    variant={table.isOccupied ? "destructive" : "default"}
                    className={table.isOccupied ? "bg-red-100 text-red-800 border-red-300" : "bg-green-100 text-green-800 border-green-300"}
                  >
                    {table.isOccupied ? "Occupied" : "Free"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Bluetooth className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Printer Status</h3>
              <p className="text-gray-600">
                {printerConnected ? "Connected to Kitchen Printer" : "Not Connected"}
              </p>
              <Button
                onClick={connectToPrinter}
                variant={printerConnected ? "default" : "outline"}
                className="mt-3"
              >
                {printerConnected ? "Connected" : "Connect Printer"}
              </Button>
            </CardContent>
          </Card>

          {currentUser?.role === "admin" && (
            <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer" onClick={goToAdmin}>
              <CardContent className="p-6 text-center">
                <Utensils className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Admin Dashboard</h3>
                <p className="text-gray-600">Access admin functions and billing</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
