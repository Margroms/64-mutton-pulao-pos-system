"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  CreditCard,
  Printer,
  Eye,
  XCircle,
  Bluetooth,
  DollarSign,
  TrendingUp,
  Clock
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReceiptPreview } from "@/components/ReceiptPreview";

interface User {
  _id: string;
  email: string;
  name: string;
  role: "waiter" | "admin";
  isActive: boolean;
}

interface AdminDashboardProps {
  currentUser: User | null;
}

export function AdminDashboard({ }: AdminDashboardProps) {
  const [printerConnected, setPrinterConnected] = useState(false);

  // Convex queries and mutations
  const pendingBills = useQuery(api.bills.getPendingBills);
  const allBills = useQuery(api.bills.getAllBills);
  const printAndClearBillMutation = useMutation(api.bills.printAndClearBill);
  const cancelBillMutation = useMutation(api.bills.cancelBill);



  const cancelBill = async (billId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await cancelBillMutation({ billId: billId as any });
      alert("Bill cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling bill:", error);
      alert("Failed to cancel bill");
    }
  };

  const connectToPrinter = async () => {
    try {
      if ('bluetooth' in navigator) {
        await (navigator as unknown as { bluetooth: { requestDevice: (options: unknown) => Promise<unknown> } }).bluetooth.requestDevice({
          filters: [{ services: ['00001800-0000-1000-8000-00805f9b34fb'] }]
        });
        setPrinterConnected(true);
        alert("Billing printer connected successfully!");
      } else {
        alert("Bluetooth not supported in this browser");
      }
    } catch (error) {
      console.error("Failed to connect to printer:", error);
      alert("Failed to connect to printer");
    }
  };

  const printAndClearBill = async (bill: { _id: string }, paymentMethod: string = "cash") => {
    if (!printerConnected) {
      alert("Please connect to printer first");
      return;
    }

    try {
      await printAndClearBillMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        billId: bill._id as any,
        paymentMethod
      });
      
      alert("Bill printed and cleared successfully!");
    } catch (error) {
      console.error("Error printing bill:", error);
      alert("Failed to print bill");
    }
  };

  const todaysBills = allBills?.filter(bill => {
    const billDate = new Date(bill.createdAt);
    const today = new Date();
    return billDate.toDateString() === today.toDateString();
  });

  const todaysRevenue = todaysBills?.reduce((sum, bill) => 
    bill.status === "paid" ? sum + bill.total : sum, 0) || 0;

  const paidBillsCount = todaysBills?.filter(bill => bill.status === "paid").length || 0;

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Billing and revenue management</p>
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
              {printerConnected ? "Billing Printer Connected" : "Connect Billing Printer"}
            </span>
            <span className="sm:hidden">
              {printerConnected ? "Connected" : "Connect Printer"}
            </span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 lg:h-5 w-4 lg:w-5 text-green-600" />
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Today&apos;s Revenue</p>
                <p className="text-lg lg:text-xl font-bold">₹{todaysRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 lg:h-5 w-4 lg:w-5 text-blue-600" />
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Bills Processed</p>
                <p className="text-lg lg:text-xl font-bold">{paidBillsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 lg:h-5 w-4 lg:w-5 text-orange-600" />
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Pending Bills</p>
                <p className="text-lg lg:text-xl font-bold">{pendingBills?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 lg:h-5 w-4 lg:w-5 text-purple-600" />
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Average Bill</p>
                <p className="text-lg lg:text-xl font-bold">
                  ₹{paidBillsCount > 0 ? (todaysRevenue / paidBillsCount).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Management */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Bills ({pendingBills?.length || 0})</TabsTrigger>
          <TabsTrigger value="processed">All Bills ({allBills?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingBills?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending bills</p>
              ) : (
                <div className="space-y-4">
                  {pendingBills?.map((bill) => (
                    <Card key={bill._id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Table {bill.tableNumber}</Badge>
                              <Badge variant="secondary">
                                {new Date(bill.createdAt).toLocaleString()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {bill.items.length} items • ₹{bill.total.toFixed(2)}
                            </p>
                            <div className="text-xs text-gray-500">
                              {bill.items.map((item, index) => (
                                <span key={index}>
                                  {item.menuItemName} x{item.quantity}
                                  {index < bill.items.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="sm:hidden">Preview</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Bill Preview</DialogTitle>
                                </DialogHeader>
                                <ReceiptPreview
                                  type="bill"
                                  data={{
                                    tableNumber: bill.tableNumber,
                                    orderType: bill.orderType,
                                    items: bill.items,
                                    subtotal: bill.subtotal,
                                    tax: bill.tax,
                                    total: bill.total,
                                    date: new Date(bill.createdAt).toLocaleString()
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                            
                            {/* Simplified Print Bill Button */}
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                onClick={() => printAndClearBill(bill, "cash")}
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                              >
                                <Printer className="h-4 w-4" />
                                <span className="text-xs">Print Bill (Cash)</span>
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => printAndClearBill(bill, "card")}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                              >
                                <CreditCard className="h-4 w-4" />
                                <span className="text-xs sm:hidden">Card</span>
                                <span className="hidden sm:inline text-xs">Card</span>
                              </Button>
                            </div>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelBill(bill._id)}
                              className="w-full sm:w-auto"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sm:hidden ml-1">Cancel</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allBills?.map((bill) => (
                  <div key={bill._id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">Table {bill.tableNumber}</Badge>
                      <span className="text-sm">₹{bill.total.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(bill.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          bill.status === "paid" ? "default" : 
                          bill.status === "cancelled" ? "destructive" : "secondary"
                        }
                      >
                        {bill.status}
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Bill Details</DialogTitle>
                          </DialogHeader>
                          <ReceiptPreview
                            type="bill"
                            data={{
                              tableNumber: bill.tableNumber,
                              orderType: bill.orderType,
                              items: bill.items,
                              subtotal: bill.subtotal,
                              tax: bill.tax,
                              total: bill.total,
                              paymentMethod: bill.paymentMethod,
                              date: new Date(bill.createdAt).toLocaleString()
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
