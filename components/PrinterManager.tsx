"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { printerManager, Printer } from "@/lib/printer";
import { webBluetoothManager } from "@/lib/webBluetooth";

export default function PrinterManager() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPrinterName, setManualPrinterName] = useState("");
  const [manualPrinterType, setManualPrinterType] = useState<'billing' | 'kitchen'>('billing');
  const [browserInfo, setBrowserInfo] = useState<{
    isSupported: boolean;
    isSecure: boolean;
    userAgent: string;
    webBluetoothSupported: boolean;
    bluetoothSupported: boolean;
    browserName: string;
    browserVersion: string;
  } | null>(null);

  useEffect(() => {
    loadPrinters();
    // Get browser compatibility info
    if (typeof window !== 'undefined') {
      setBrowserInfo(webBluetoothManager.getBrowserInfo());
    }
  }, []);

  const loadPrinters = () => {
    setPrinters(printerManager.getPrinters());
  };

  const handleAddPrinter = async () => {
    if (!webBluetoothManager.isWebBluetoothSupported()) {
      toast.error("Web Bluetooth not supported in this browser");
      return;
    }

    if (!webBluetoothManager.isSecureContext()) {
      toast.error("Web Bluetooth requires HTTPS (except localhost for development)");
      return;
    }

    setIsAddingPrinter(true);
    try {
      // Use the new Web Bluetooth implementation
      const device = await webBluetoothManager.requestPrinterDevice();
      
      if (device) {
        const printer: Printer = {
          id: device.id,
          name: device.name || 'Unknown Printer',
          type: 'billing', // Default to billing, can be changed
          isConnected: false,
          address: device.id
        };

        // Add to printer manager
        printerManager.addManualPrinter(printer);
        loadPrinters();
        
        toast.success(`Bluetooth device "${printer.name}" added successfully`);
      } else {
        toast.error("Failed to add Bluetooth device");
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add Bluetooth device");
      }
      console.error(error);
    } finally {
      setIsAddingPrinter(false);
    }
  };

  const handleAddManualPrinter = () => {
    if (!manualPrinterName.trim()) {
      toast.error("Please enter a printer name");
      return;
    }

    const printer: Printer = {
      id: `manual_${Date.now()}`,
      name: manualPrinterName.trim(),
      type: manualPrinterType,
      isConnected: false,
    };

    // Add to printer manager
    printerManager.addManualPrinter(printer);
    loadPrinters();
    
    // Reset form
    setManualPrinterName("");
    setManualPrinterType('billing');
    setShowManualEntry(false);
    
    toast.success(`Manual printer "${printer.name}" added successfully`);
  };

  const handleConnect = async (printerId: string) => {
    try {
      const success = await printerManager.connectToPrinter(printerId);
      if (success) {
        toast.success("Printer connected successfully");
        loadPrinters();
      } else {
        toast.error("Failed to connect to printer");
      }
    } catch (error) {
      toast.error("Failed to connect to printer");
      console.error(error);
    }
  };

  const handleDisconnect = async (printerId: string) => {
    try {
      const success = await printerManager.disconnectFromPrinter(printerId);
      if (success) {
        toast.success("Printer disconnected successfully");
        loadPrinters();
      } else {
        toast.error("Failed to disconnect from printer");
      }
    } catch (error) {
      toast.error("Failed to disconnect from printer");
      console.error(error);
    }
  };

  const handleTypeChange = (printerId: string, type: 'billing' | 'kitchen') => {
    const success = printerManager.updatePrinterType(printerId, type);
    if (success) {
      toast.success("Printer type updated successfully");
      loadPrinters();
    } else {
      toast.error("Failed to update printer type");
    }
  };

  const handleRemovePrinter = (printerId: string) => {
    const success = printerManager.removePrinter(printerId);
    if (success) {
      toast.success("Printer removed successfully");
      loadPrinters();
    } else {
      toast.error("Failed to remove printer");
    }
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? "bg-green-500" : "bg-gray-400";
  };

  const getTypeColor = (type: string) => {
    return type === 'billing' ? "bg-blue-500" : "bg-orange-500";
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <CardTitle className="text-gray-800 flex items-center justify-between">
          <span>Bluetooth Printer Management</span>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowManualEntry(!showManualEntry)}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {showManualEntry ? "Cancel" : "Add Manual"}
            </Button>
            <Button
              onClick={handleAddPrinter}
              disabled={isAddingPrinter || !webBluetoothManager.isWebBluetoothSupported() || !webBluetoothManager.isSecureContext()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isAddingPrinter ? "Scanning..." : "Scan Bluetooth"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Manual Printer Entry */}
        {showManualEntry && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Add Manual Printer</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="printerName" className="text-sm font-medium text-gray-700">Printer Name</Label>
                <Input
                  id="printerName"
                  value={manualPrinterName}
                  onChange={(e) => setManualPrinterName(e.target.value)}
                  placeholder="e.g., Kitchen Printer"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="printerType" className="text-sm font-medium text-gray-700">Printer Type</Label>
                <Select value={manualPrinterType} onValueChange={(value: 'billing' | 'kitchen') => setManualPrinterType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddManualPrinter}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Add Printer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Troubleshooting Info */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
          <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Bluetooth Issues</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Make sure your Bluetooth printer is turned ON and in pairing mode</p>
            <p>• Ensure the printer is within 10-30 feet of your device</p>
            <p>• Try restarting your Bluetooth printer</p>
            <p>• If no devices appear, use &quot;Add Manual&quot; to create a test printer</p>
            <p>• Check that your browser supports Web Bluetooth (Chrome, Edge, Opera)</p>
          </div>
        </div>

        {browserInfo && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-yellow-50">
            <h3 className="font-semibold text-yellow-900 mb-2">Browser Compatibility</h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>• Web Bluetooth API: {browserInfo.webBluetoothSupported ? "Supported" : "Not Supported"}</p>
              <p>• Secure Context: {browserInfo.isSecure ? "Yes" : "No (requires HTTPS)"}</p>
              <p>• Bluetooth Supported: {browserInfo.bluetoothSupported ? "Yes" : "No"}</p>
              <p>• Browser: {browserInfo.browserName} {browserInfo.browserVersion}</p>
            </div>
          </div>
        )}

        {!webBluetoothManager.isWebBluetoothSupported() && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 text-lg font-medium">Web Bluetooth Not Supported</p>
            <p className="text-gray-500 text-sm">Your browser does not support Web Bluetooth printing</p>
            <p className="text-gray-400 text-xs mt-2">Try Chrome, Edge, or Opera browser</p>
          </div>
        )}

        {printers.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9l1.015-3z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No Printers Added</p>
            <p className="text-gray-400 text-sm">Scan for Bluetooth devices or add a manual printer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {printers.map((printer) => (
              <div
                key={printer.id}
                className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(printer.isConnected)}`}></div>
                    <h3 className="font-semibold text-gray-900">{printer.name}</h3>
                    <Badge className={getTypeColor(printer.type)}>
                      {printer.type}
                    </Badge>
                    {printer.id.startsWith('manual_') && (
                      <Badge className="bg-gray-500 text-white text-xs">
                        Manual
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={printer.type}
                      onValueChange={(value: 'billing' | 'kitchen') => handleTypeChange(printer.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                      </SelectContent>
                    </Select>
                    {!printer.id.startsWith('manual_') && (
                      <Button
                        size="sm"
                        variant={printer.isConnected ? "outline" : "default"}
                        onClick={() => printer.isConnected ? handleDisconnect(printer.id) : handleConnect(printer.id)}
                        className={printer.isConnected ? "border-red-500 text-red-600 hover:bg-red-50" : "bg-green-600 hover:bg-green-700"}
                      >
                        {printer.isConnected ? "Disconnect" : "Connect"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemovePrinter(printer.id)}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p>ID: {printer.id}</p>
                  {printer.address && <p>Address: {printer.address}</p>}
                  {printer.id.startsWith('manual_') && (
                    <p className="text-blue-600">Manual printer - will simulate printing</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
