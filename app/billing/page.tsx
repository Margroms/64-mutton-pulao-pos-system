"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Navigation from "@/components/Navigation";
import BillPreview from "@/components/BillPreview";
import PrinterManager from "@/components/PrinterManager";
import { printerManager, generateKitchenReceipt, generateBillingReceipt } from "@/lib/printer";

export default function BillingPage() {
  const [selectedOrder, setSelectedOrder] = useState<Id<"orders"> | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "other">("cash");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [generatedBillNumber, setGeneratedBillNumber] = useState("");
  const [showPrinterManager, setShowPrinterManager] = useState(false);

  // Get all orders that are completed and ready for billing
  const pendingOrders = useQuery(api.orders.getByStatus, { status: "completed" });
  const selectedOrderData = useQuery(api.orders.getById, selectedOrder ? { id: selectedOrder } : "skip");
  const existingBill = useQuery(api.bills.getByOrder, selectedOrder ? { orderId: selectedOrder } : "skip");
  const menuItems = useQuery(api.menu.getItemsWithCategories);

  // Sample orders for demo purposes
  const samplePendingOrders = [
    {
      _id: "order1" as Id<"orders">,
      tableId: "table2" as Id<"tables">,
      waiterId: "waiter1" as Id<"users">,
      status: "completed" as const,
      items: [
        { itemId: "item4" as Id<"menuItems">, quantity: 2, unitPrice: 18.99, totalPrice: 37.98, notes: "Medium well", status: "ready" as const },
        { itemId: "item8" as Id<"menuItems">, quantity: 1, unitPrice: 4.99, totalPrice: 4.99, notes: "", status: "ready" as const },
      ],
      totalAmount: 42.97,
      taxAmount: 7.73,
      finalAmount: 50.70,
      notes: "Table by window",
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 1800000,
      confirmedAt: Date.now() - 1700000,
    },
    {
      _id: "order2" as Id<"orders">,
      tableId: "table5" as Id<"tables">,
      waiterId: "waiter1" as Id<"users">,
      status: "completed" as const,
      items: [
        { itemId: "item5" as Id<"menuItems">, quantity: 1, unitPrice: 15.99, totalPrice: 15.99, notes: "Extra cheese", status: "ready" as const },
        { itemId: "item9" as Id<"menuItems">, quantity: 2, unitPrice: 3.99, totalPrice: 7.98, notes: "", status: "ready" as const },
      ],
      totalAmount: 23.97,
      taxAmount: 4.31,
      finalAmount: 28.28,
      notes: "Family table",
      createdAt: Date.now() - 900000,
      updatedAt: Date.now() - 900000,
      confirmedAt: Date.now() - 800000,
    }
  ];

  // Use sample data if real data is not available
  const displayPendingOrders = pendingOrders || samplePendingOrders;

  const generateBill = useMutation(api.bills.generate);
  const updatePaymentStatus = useMutation(api.bills.updatePaymentStatus);
  const updateOrderStatus = useMutation(api.orders.updateStatus);

  const handleGenerateBill = async () => {
    if (!selectedOrder) {
      toast.error("No order selected");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await generateBill({
        orderId: selectedOrder,
        paymentMethod,
        discountAmount,
      });

      setGeneratedBillNumber(result.billNumber);
      setShowBillPreview(true);

      // Auto-print kitchen receipt when bill is generated
      if (selectedOrderData && menuItems) {
        try {
          const kitchenReceipt = generateKitchenReceipt(selectedOrderData, menuItems.flatMap(cat => cat.items));
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

      toast.success(`Bill generated! Bill Number: ${result.billNumber}`);
    } catch (error) {
      toast.error("Failed to generate bill");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentComplete = async () => {
    if (!existingBill) {
      toast.error("No bill found");
      return;
    }

    setIsProcessing(true);
    try {
      await updatePaymentStatus({
        billId: existingBill._id,
        paymentStatus: "paid",
      });

      await updateOrderStatus({
        orderId: selectedOrder!,
        status: "served",
      });

      // Auto-print billing receipt when payment is completed
      if (selectedOrderData && menuItems) {
        try {
          const billingReceipt = generateBillingReceipt(existingBill, selectedOrderData, menuItems.flatMap(cat => cat.items));
          await printerManager.printReceipt({
            content: billingReceipt,
            printerType: 'billing'
          });
          toast.success("Billing receipt printed successfully");
        } catch (error) {
          console.error("Failed to print billing receipt:", error);
          toast.error("Failed to print billing receipt");
        }
      }

      toast.success("Payment completed successfully!");
      setSelectedOrder(null);
    } catch (error) {
      toast.error("Failed to process payment");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!displayPendingOrders || !menuItems) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading billing dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Billing Dashboard</h1>
            <p className="text-gray-600 mt-2">Process orders and generate bills</p>
            <div className="mt-4">
              <Button
                onClick={() => setShowPrinterManager(!showPrinterManager)}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {showPrinterManager ? "Hide" : "Show"} Printer Management
              </Button>
            </div>
          </div>

          {showPrinterManager && (
            <div className="mb-8">
              <PrinterManager />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completed Orders */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="text-gray-800 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Completed Orders Ready for Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {displayPendingOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-lg">No completed orders for billing</p>
                      <p className="text-gray-400 text-sm">Orders will appear here after waiters complete them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayPendingOrders.map((order) => (
                        <div
                          key={order._id}
                          className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedOrder === order._id
                              ? "border-gray-500 bg-gray-50 shadow-lg"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedOrder(order._id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <h3 className="font-bold text-gray-900 text-lg">
                                  Order #{order._id.slice(-6)}
                                </h3>
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                  Completed
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Table:</span> {order.tableId}
                                </div>
                                <div>
                                  <span className="font-medium">Items:</span> {order.items.length}
                                </div>
                                <div>
                                  <span className="font-medium">Order Time:</span> {new Date(order.createdAt).toLocaleTimeString()}
                                </div>
                                <div>
                                  <span className="font-medium">Total:</span> <span className="font-bold text-gray-600">${order.finalAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Processing */}
            <div>
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="text-gray-800">
                    {selectedOrder
                      ? "Process Order"
                      : "Select an Order"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedOrder && selectedOrderData ? (
                    <div className="space-y-6">
                      <div className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-gray-900 text-lg">
                            Order Details
                          </h3>
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            #{selectedOrderData._id.slice(-6)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-gray-800">
                          <div>
                            <span className="text-sm font-medium">Total Amount:</span>
                            <p className="font-bold text-xl text-gray-900">${selectedOrderData.finalAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Items Count:</span>
                            <p className="font-bold text-xl text-gray-900">{selectedOrderData.items.length}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Order Time:</span>
                            <p className="font-medium">{new Date(selectedOrderData.createdAt).toLocaleTimeString()}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Table:</span>
                            <p className="font-medium">{selectedOrderData.tableId}</p>
                          </div>
                        </div>
                      </div>

                      {existingBill ? (
                        <div className="space-y-4">
                          <div className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-bold text-gray-800 text-lg">Bill Generated</h3>
                              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                {existingBill.paymentStatus}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-gray-700">
                              <div>
                                <span className="text-sm font-medium">Bill Number:</span>
                                <p className="font-bold text-gray-900">{existingBill.billNumber}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Amount:</span>
                                <p className="font-bold text-gray-900">${existingBill.finalAmount.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Payment Method:</span>
                                <p className="font-medium">{existingBill.paymentMethod}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Status:</span>
                                <p className="font-medium">{existingBill.paymentStatus}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Button
                              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg shadow-sm"
                              onClick={() => {
                                setGeneratedBillNumber(existingBill.billNumber);
                                setShowBillPreview(true);
                              }}
                            >
                              Preview Bill
                            </Button>
                            {existingBill.paymentStatus === "pending" && (
                              <Button
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg shadow-sm"
                                onClick={handlePaymentComplete}
                                disabled={isProcessing}
                              >
                                {isProcessing ? "Processing..." : "Mark Payment Complete"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={(value: "cash" | "card" | "upi" | "other") => setPaymentMethod(value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="discount" className="text-sm font-medium text-gray-700">Discount Amount ($)</Label>
                            <Input
                              id="discount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="mt-1"
                            />
                          </div>

                          <Button
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg shadow-sm"
                            onClick={handleGenerateBill}
                            disabled={isProcessing}
                          >
                            {isProcessing ? "Generating..." : "Generate Bill"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">
                      Please select an order to process
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Preview Modal */}
      {showBillPreview && selectedOrderData && (
        <BillPreview
          order={selectedOrderData}
          billNumber={generatedBillNumber}
          paymentMethod={paymentMethod}
          discountAmount={discountAmount}
          onClose={() => setShowBillPreview(false)}
        />
      )}
    </div>
  );
}
