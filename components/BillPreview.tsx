"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

interface BillPreviewProps {
  order: any;
  billNumber: string;
  paymentMethod: string;
  discountAmount: number;
  onClose: () => void;
}

export default function BillPreview({ order, billNumber, paymentMethod, discountAmount, onClose }: BillPreviewProps) {
  const subtotal = order.totalAmount;
  const tax = order.taxAmount;
  const total = subtotal + tax - discountAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold text-gray-900">Restaurant Name</CardTitle>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Restaurant Address</p>
            <p>Phone: +1234567890</p>
            <p>Email: info@restaurant.com</p>
          </div>
          <div className="text-lg font-bold mt-2 text-gray-900">INVOICE</div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invoice Details */}
          <div className="flex justify-between text-sm text-gray-700">
            <span>{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour12: true })}</span>
            <span>Invoice: {billNumber}</span>
          </div>

          {/* Items Table */}
          <div className="border-t border-dashed border-gray-400 pt-2">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium mb-2 text-gray-900">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-center">Rate</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {order.items.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-12 gap-2 text-sm py-1 text-gray-700">
                <div className="col-span-6">{item.itemId || `Item ${index + 1}`}</div>
                <div className="col-span-2 text-center">{item.quantity}</div>
                <div className="col-span-2 text-center">${item.unitPrice.toFixed(2)}</div>
                <div className="col-span-2 text-right">${item.totalPrice.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t border-dashed border-gray-400 pt-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Items: {order.items.length}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Discount:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-700">
              <span>Tax (18%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 text-gray-900">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-t border-dashed border-gray-400 pt-2">
            <div className="text-sm text-gray-700">
              <span>Payment Mode: </span>
              <span className="font-medium">{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</span>
            </div>
            <div className="text-sm text-gray-700">
              <span>Amount: </span>
              <span className="font-medium">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Thank You */}
          <div className="border-t border-dashed border-gray-400 pt-2 text-center">
            <p className="text-sm font-medium text-gray-900">Thank You</p>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={onClose}
            >
              Close
            </Button>
            <Button 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              onClick={() => {
                // Here you would implement actual printing
                window.print();
              }}
            >
              Print
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
