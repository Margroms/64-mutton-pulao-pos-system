"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Bluetooth,
  Printer,
  Plus,
  Trash2,
  Wifi,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Cable,
  WifiIcon
  
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePrinter } from "@/lib/usePrinter";

interface PrinterConnection {
  id: string;
  name: string;
  type: "kitchen" | "billing";
  isConnected: boolean;
  connectionType?: "bluetooth" | "cable";
  lastUsed?: Date;
}

export function SettingsDashboard() {
  const [printers, setPrinters] = useState<PrinterConnection[]>([
    { id: "kitchen-1", name: "Kitchen Printer", type: "kitchen", isConnected: false },
    { id: "billing-1", name: "Billing Printer", type: "billing", isConnected: false }
  ]);
  
  const [newPrinterName, setNewPrinterName] = useState("");
  const [newPrinterType, setNewPrinterType] = useState<"kitchen" | "billing">("kitchen");
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);

  // Convex queries and mutations
  const seedDatabaseMutation = useMutation(api.seedData.seedDatabase);
  
  // Printer service
  const { 
    connectedPrinters, 
    isConnecting, 
    connectBluetoothPrinter, 
    connectCablePrinter, 
    disconnectPrinter: disconnectRealPrinter,
    print,
    isPrinterConnected 
  } = usePrinter();

  const showConnectionOptions = (printerId: string) => {
    setSelectedPrinterId(printerId);
    setShowConnectionDialog(true);
  };

  const connectPrinter = async (printerId: string, connectionType: "bluetooth" | "cable") => {
    try {
      const printer = printers.find(p => p.id === printerId);
      if (!printer) {
        throw new Error("Printer not found");
      }

      let success = false;
      if (connectionType === "bluetooth") {
        success = await connectBluetoothPrinter(printerId, printer.name);
      } else {
        success = await connectCablePrinter(printerId, printer.name);
      }

      if (success) {
        // Update local printer status
        setPrinters(prev => prev.map(p => 
          p.id === printerId 
            ? { ...p, isConnected: true, connectionType, lastUsed: new Date() }
            : p
        ));

        alert(`Printer connected via ${connectionType} successfully!`);
      }
      
      setShowConnectionDialog(false);
      setSelectedPrinterId(null);
    } catch (error) {
      console.error("Failed to connect to printer:", error);
      alert(`Failed to connect to printer via ${connectionType}. ${error instanceof Error ? error.message : 'Please check your connection and try again.'}`);
    }
  };

  const disconnectPrinter = (printerId: string) => {
    disconnectRealPrinter(printerId);
    setPrinters(prev => prev.map(printer => 
      printer.id === printerId 
        ? { ...printer, isConnected: false, connectionType: undefined }
        : printer
    ));
    alert("Printer disconnected");
  };

  const addPrinter = () => {
    if (!newPrinterName.trim()) return;

    const newPrinter: PrinterConnection = {
      id: `${newPrinterType}-${Date.now()}`,
      name: newPrinterName,
      type: newPrinterType,
      isConnected: false
    };

    setPrinters(prev => [...prev, newPrinter]);
    setNewPrinterName("");
    setShowAddPrinter(false);
  };

  const removePrinter = (printerId: string) => {
    setPrinters(prev => prev.filter(printer => printer.id !== printerId));
  };

  const seedDatabase = async () => {
    try {
      await seedDatabaseMutation();
      alert("Database seeded successfully with sample data!");
    } catch (error) {
      console.error("Error seeding database:", error);
      alert("Failed to seed database");
    }
  };

  const testPrinter = async (printer: PrinterConnection) => {
    if (!printer.isConnected) {
      alert("Please connect the printer first");
      return;
    }

    try {
      const testContent = `
================================
        TEST PRINT
================================

Printer: ${printer.name}
Type: ${printer.type}
Connection: ${printer.connectionType}
Time: ${new Date().toLocaleString()}

This is a test print to verify
that the printer is working
correctly.

================================
      `;

      await print(printer.id, testContent);
      alert(`Test print sent to ${printer.name}!`);
    } catch (error) {
      console.error("Test print failed:", error);
      alert(`Failed to send test print: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">System configuration and printer management</p>
        </div>
      </div>

      {/* Printer Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Printer Management
            </CardTitle>
            <Dialog open={showAddPrinter} onOpenChange={setShowAddPrinter}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Printer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Printer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="printer-name">Printer Name</Label>
                    <Input
                      id="printer-name"
                      value={newPrinterName}
                      onChange={(e) => setNewPrinterName(e.target.value)}
                      placeholder="Enter printer name"
                    />
                  </div>
                  <div>
                    <Label>Printer Type</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={newPrinterType === "kitchen" ? "default" : "outline"}
                        onClick={() => setNewPrinterType("kitchen")}
                        size="sm"
                      >
                        Kitchen
                      </Button>
                      <Button
                        variant={newPrinterType === "billing" ? "default" : "outline"}
                        onClick={() => setNewPrinterType("billing")}
                        size="sm"
                      >
                        Billing
                      </Button>
                    </div>
                  </div>
                  <Button onClick={addPrinter} className="w-full">
                    Add Printer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {printers.map((printer) => (
              <Card key={printer.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Printer className="h-5 w-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium">{printer.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={printer.type === "kitchen" ? "default" : "secondary"}>
                              {printer.type}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {printer.isConnected ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600">Connected</span>
                                  {printer.connectionType && (
                                    <div className="flex items-center gap-1 ml-2">
                                      {printer.connectionType === "bluetooth" ? (
                                        <Bluetooth className="h-3 w-3 text-blue-500" />
                                      ) : (
                                        <Cable className="h-3 w-3 text-gray-500" />
                                      )}
                                      <span className="text-xs text-gray-500 capitalize">{printer.connectionType}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600">Disconnected</span>
                                </>
                              )}
                            </div>
                          </div>
                          {printer.lastUsed && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last used: {printer.lastUsed.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testPrinter(printer)}
                        disabled={!printer.isConnected}
                      >
                        Test Print
                      </Button>
                      {printer.isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectPrinter(printer.id)}
                        >
                          <Bluetooth className="h-4 w-4 mr-1" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => showConnectionOptions(printer.id)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePrinter(printer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Database</p>
                  <p className="text-sm text-green-700">Connected</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Real-time Sync</p>
                  <p className="text-sm text-blue-700">Active</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Seed Sample Data</h3>
              <p className="text-sm text-gray-600">
                Add sample menu items and tables for testing
              </p>
            </div>
            <Button onClick={seedDatabase} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Seed Database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Printer Connection Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Printer Connection Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Bluetooth Connection:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Turn on your thermal printer and enable pairing mode</li>
                <li>Click &quot;Connect&quot; and select &quot;Bluetooth&quot;</li>
                <li>Select your printer from the Bluetooth device list</li>
                <li>Test the connection by printing a sample order</li>
              </ol>
            </div>
            
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Cable Connection:</h4>
              <ol className="list-decimal list-inside space-y-1 text-green-800">
                <li>Connect your printer via USB or Serial cable</li>
                <li>Click &quot;Connect&quot; and select &quot;Cable&quot;</li>
                <li>Ensure proper drivers are installed</li>
                <li>Test the connection by printing a sample order</li>
              </ol>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">Troubleshooting:</h4>
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                <li><strong>Bluetooth:</strong> Ensure your browser supports Web Bluetooth API (Chrome, Edge)</li>
                <li><strong>Bluetooth:</strong> Check that the printer is in pairing mode before connecting</li>
                <li><strong>Cable:</strong> Verify USB/Serial cable connection and drivers</li>
                <li><strong>Both:</strong> Try refreshing the page if connection fails</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Type Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Connection Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select how you want to connect to the printer:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => selectedPrinterId && connectPrinter(selectedPrinterId, "bluetooth")}
                disabled={isConnecting}
              >
                <Bluetooth className="h-6 w-6 text-blue-500" />
                <span>{isConnecting ? "Connecting..." : "Bluetooth"}</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => selectedPrinterId && connectPrinter(selectedPrinterId, "cable")}
                disabled={isConnecting}
              >
                <Cable className="h-6 w-6 text-gray-500" />
                <span>{isConnecting ? "Connecting..." : "Cable"}</span>
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
