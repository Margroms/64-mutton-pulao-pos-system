"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Restaurant POS System
          </h1>
          <p className="text-xl text-gray-500">
            Professional point of sale system for modern restaurants
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Waiter Dashboard */}
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg" onClick={() => window.location.href = "/waiter"}>
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-800">Waiter Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage tables, place orders, and send orders to kitchen. 
                Orders are automatically sent to billing when ready.
              </p>
              <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" size="lg">
                Access Waiter Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Billing System */}
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg" onClick={() => window.location.href = "/billing"}>
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-800">Billing System</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                Process orders from waiters, generate bills, and manage payments. 
                View all pending orders in the billing queue.
              </p>
              <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white" size="lg">
                Access Billing System
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-xl font-semibold text-gray-800">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="p-6 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-gray-800">6</div>
                  <div className="text-sm text-gray-600 font-medium">Active Tables</div>
                </div>
                <div className="p-6 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-gray-800">12</div>
                  <div className="text-sm text-gray-600 font-medium">Menu Items</div>
                </div>
                <div className="p-6 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-gray-800">3</div>
                  <div className="text-sm text-gray-600 font-medium">Pending Orders</div>
                </div>
                <div className="p-6 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-gray-800">$156</div>
                  <div className="text-sm text-gray-600 font-medium">Today's Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
