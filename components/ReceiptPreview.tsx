"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OrderReceiptData {
  tableNumber: number;
  orderType?: "table" | "parcel";
  items: Array<{
    menuItemName: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
  date: string;
}

interface BillReceiptData {
  tableNumber: number;
  orderType?: "table" | "parcel";
  items: Array<{
    menuItemName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  date: string;
}

interface ReceiptPreviewProps {
  type: "order" | "bill";
  data: OrderReceiptData | BillReceiptData;
}

export function ReceiptPreview({ type, data }: ReceiptPreviewProps) {
  if (type === "order") {
    const orderData = data as OrderReceiptData;
    return (
      <Card className="w-full max-w-sm mx-auto bg-white font-mono text-sm">
        <CardContent className="p-4 space-y-2">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="font-bold text-lg">Restaurant Name</h1>
            <p className="text-xs">Kitchen Order</p>
            <p className="text-xs">+917483988687</p>
          </div>
          
          <Separator />
          
          {/* Order Info */}
          <div className="flex justify-between text-xs">
            <span>
              {orderData.orderType === "parcel" 
                ? "PARCEL ORDER" 
                : `Table: ${orderData.tableNumber}`
              }
            </span>
            <span>{orderData.date}</span>
          </div>
          
          
          
          <Separator />
          
          {/* Items */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-xs">
              <span>Item</span>
              <span>Qty</span>
            </div>
            <Separator />
            {orderData.items.map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="flex-1">{item.menuItemName}</span>
                <span className="w-8 text-center">{item.quantity}</span>
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="text-center text-xs font-semibold">
            Total Items: {orderData.items.reduce((sum, item) => sum + item.quantity, 0)}
          </div>
          
          <div className="text-center text-xs mt-4">
            Thank You
          </div>
        </CardContent>
      </Card>
    );
  }

  // Bill receipt
  const billData = data as BillReceiptData;
  return (
    <Card className="w-full max-w-sm mx-auto bg-white font-mono text-sm">
      <CardContent className="p-4 space-y-2">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="font-bold text-lg">Restaurant Name</h1>
          <p className="text-xs">Shop Place</p>
          <p className="text-xs">+917483988687</p>
          <p className="text-xs">restaurant@gmail.com</p>
          <h2 className="font-bold text-base mt-2">INVOICE</h2>
        </div>
        
        <Separator />
        
        {/* Invoice Info */}
        <div className="flex justify-between text-xs">
          <span>{billData.date}</span>
          <span>
            {billData.orderType === "parcel" 
              ? "PARCEL ORDER" 
              : `Table: ${billData.tableNumber}`
            }
          </span>
        </div>
        

        
        <Separator />
        
        {/* Items Table */}
        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-xs">
            <span className="flex-1">Item</span>
            <span className="w-8">Qty</span>
            <span className="w-12">Rate</span>
            <span className="w-12">Total</span>
          </div>
          <Separator />
          {billData.items.map((item, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className="flex-1">{item.menuItemName}</span>
              <span className="w-8 text-center">{item.quantity}</span>
              <span className="w-12 text-center">{item.price}</span>
              <span className="w-12 text-center">{item.total}</span>
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Items: {billData.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            <span>Sub Total: Rs {billData.subtotal.toFixed(2)}</span>
          </div>
          {billData.tax && (
            <div className="flex justify-end text-xs">
              <span>Tax: Rs {billData.tax.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="text-center text-base font-bold">
          Total: {billData.total.toFixed(2)}
        </div>
        
        <Separator />
        
        {/* Payment Info */}
        {billData.paymentMethod && (
          <div className="text-center text-xs">
            <p>Payment Mode</p>
            <p>{billData.paymentMethod}: {billData.total.toFixed(2)}</p>
          </div>
        )}
        
        <Separator />
        
        <div className="text-center text-xs">
          Thank You
        </div>
      </CardContent>
    </Card>
  );
}
