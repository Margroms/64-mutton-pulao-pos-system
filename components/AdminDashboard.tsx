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
  Clock,
  Cable
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { usePrinter } from "@/lib/usePrinter";

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
  const [printerConnectionType, setPrinterConnectionType] = useState<"bluetooth" | "cable" | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);

  // Convex queries and mutations
  const pendingBills = useQuery(api.bills.getPendingBills);
  const allBills = useQuery(api.bills.getAllBills);
  const printAndClearBillMutation = useMutation(api.bills.printAndClearBill);
  const cancelBillMutation = useMutation(api.bills.cancelBill);
  
  // Printer service
  const { 
    isConnecting, 
    connectBluetoothPrinter, 
    connectCablePrinter, 
    print,
    isPrinterConnected 
  } = usePrinter();



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

  const showConnectionOptions = () => {
    setShowConnectionDialog(true);
  };

  const generateBillPrintContent = (bill: any, paymentMethod: string): string => {
    const timestamp = new Date().toLocaleString();
    const subtotal = bill.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    let content = `
================================
        RESTAURANT RECEIPT
================================

Bill ID: ${bill._id}
Date: ${timestamp}
Table: ${bill.tableNumber || "Parcel"}
Waiter: ${bill.waiterName || "Unknown"}

================================
ITEMS:
================================
`;

    bill.items.forEach((item: any) => {
      content += `${item.quantity}x ${item.menuItemName}\n`;
      content += `   ₹${item.price} each = ₹${item.price * item.quantity}\n\n`;
    });

    content += `================================
SUBTOTAL: ₹${subtotal.toFixed(2)}
TAX (18%): ₹${tax.toFixed(2)}
================================
TOTAL: ₹${total.toFixed(2)}
================================

Payment Method: ${paymentMethod.toUpperCase()}
Status: PAID

Thank you for dining with us!
Please visit again!

================================
    `;

    return content;
  };

  const connectToPrinter = async (connectionType: "bluetooth" | "cable") => {
    try {
      const printerId = "billing-1";
      const printerName = "Billing Printer";
      
      let success = false;
      if (connectionType === "bluetooth") {
        success = await connectBluetoothPrinter(printerId, printerName);
      } else {
        success = await connectCablePrinter(printerId, printerName);
      }

      if (success) {
        setPrinterConnected(true);
        setPrinterConnectionType(connectionType);
        alert(`Billing printer connected via ${connectionType} successfully!`);
      }
      
      setShowConnectionDialog(false);
    } catch (error) {
      console.error("Failed to connect to printer:", error);
      alert(`Failed to connect to printer via ${connectionType}. ${error instanceof Error ? error.message : 'Please check your connection and try again.'}`);
    }
  };

  const printAndClearBill = async (bill: { _id: string }, paymentMethod: string = "cash") => {
    if (!printerConnected || !isPrinterConnected("billing-1")) {
      alert("Please connect to billing printer first");
      return;
    }

    try {
      // First, print the receipt
      const billData = allBills?.find(b => b._id === bill._id);
      if (billData) {
        const printContent = generateBillPrintContent(billData, paymentMethod);
        await print("billing-1", printContent);
      }

      // Then clear the bill in the database
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
            onClick={showConnectionOptions}
            className="flex items-center gap-2 text-sm"
            size="sm"
          >
            {printerConnected ? (
              printerConnectionType === "bluetooth" ? (
                <Bluetooth className="h-4 w-4" />
              ) : (
                <Cable className="h-4 w-4" />
              )
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {printerConnected ? `Billing Printer Connected (${printerConnectionType})` : "Connect Billing Printer"}
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

      {/* Connection Type Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Connection Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select how you want to connect to the billing printer:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => connectToPrinter("bluetooth")}
              >
                <Bluetooth className="h-6 w-6 text-blue-500" />
                <span>Bluetooth</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => connectToPrinter("cable")}
              >
                <Cable className="h-6 w-6 text-gray-500" />
                <span>Cable</span>
              </Button>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Bluetooth:</strong> Wireless connection, requires pairing</p>
              <p><strong>Cable:</strong> Direct USB/Serial connection</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
