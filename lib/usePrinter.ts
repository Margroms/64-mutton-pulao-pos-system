import { useState, useEffect, useCallback } from 'react';
import { printerService, PrinterDevice } from './printerService';

export interface UsePrinterReturn {
  connectedPrinters: PrinterDevice[];
  isConnecting: boolean;
  printQueueStatus: { pending: number; processing: number; completed: number; failed: number };
  connectBluetoothPrinter: (printerId: string, printerName: string) => Promise<boolean>;
  connectCablePrinter: (printerId: string, printerName: string) => Promise<boolean>;
  connectUSBPrinter: (printerId: string, printerName: string) => Promise<boolean>;
  connectPreviewPrinter: (printerId: string, printerName: string) => Promise<boolean>;
  disconnectPrinter: (printerId: string) => void;
  print: (printerId: string, content: string) => Promise<boolean>;
  isPrinterConnected: (printerId: string) => boolean;
  getPrinter: (printerId: string) => PrinterDevice | undefined;
  testSerialAPISupport: () => Promise<{ supported: boolean; message: string }>;
}

export function usePrinter(): UsePrinterReturn {
  const [connectedPrinters, setConnectedPrinters] = useState<PrinterDevice[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printQueueStatus, setPrintQueueStatus] = useState({ 
    pending: 0, 
    processing: 0, 
    completed: 0, 
    failed: 0 
  });

  // Update connected printers list
  const updateConnectedPrinters = useCallback(() => {
    setConnectedPrinters(printerService.getConnectedPrinters());
  }, []);

  // Update print queue status
  const updatePrintQueueStatus = useCallback(() => {
    setPrintQueueStatus(printerService.getPrintQueueStatus());
  }, []);

  // Connect to Bluetooth printer
  const connectBluetoothPrinter = useCallback(async (printerId: string, printerName: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const success = await printerService.connectBluetoothPrinter(printerId, printerName);
      if (success) {
        updateConnectedPrinters();
      }
      return success;
    } catch (error) {
      console.error('Failed to connect Bluetooth printer:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [updateConnectedPrinters]);

  // Connect to Cable printer
  const connectCablePrinter = useCallback(async (printerId: string, printerName: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const success = await printerService.connectCablePrinter(printerId, printerName);
      if (success) {
        updateConnectedPrinters();
      }
      return success;
    } catch (error) {
      console.error('Failed to connect Cable printer:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [updateConnectedPrinters]);

  // Connect to USB printer
  const connectUSBPrinter = useCallback(async (printerId: string, printerName: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const success = await printerService.connectUSBPrinter(printerId, printerName);
      if (success) {
        updateConnectedPrinters();
      }
      return success;
    } catch (error) {
      console.error('Failed to connect USB printer:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [updateConnectedPrinters]);

  // Connect to Preview printer
  const connectPreviewPrinter = useCallback(async (printerId: string, printerName: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const success = await printerService.connectPreviewPrinter(printerId, printerName);
      if (success) {
        updateConnectedPrinters();
      }
      return success;
    } catch (error) {
      console.error('Failed to connect Preview printer:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [updateConnectedPrinters]);

  // Disconnect printer
  const disconnectPrinter = useCallback((printerId: string) => {
    printerService.disconnectPrinter(printerId);
    updateConnectedPrinters();
  }, [updateConnectedPrinters]);

  // Print content
  const print = useCallback(async (printerId: string, content: string): Promise<boolean> => {
    try {
      const success = await printerService.print(printerId, content);
      if (success) {
        updatePrintQueueStatus();
      }
      return success;
    } catch (error) {
      console.error('Failed to print:', error);
      throw error;
    }
  }, [updatePrintQueueStatus]);

  // Check if printer is connected
  const isPrinterConnected = useCallback((printerId: string): boolean => {
    return printerService.isPrinterConnected(printerId);
  }, []);

  // Get printer by ID
  const getPrinter = useCallback((printerId: string): PrinterDevice | undefined => {
    return printerService.getPrinter(printerId);
  }, []);

  // Test serial API support
  const testSerialAPISupport = useCallback(async (): Promise<{ supported: boolean; message: string }> => {
    return await printerService.testSerialAPISupport();
  }, []);

  // Update status periodically
  useEffect(() => {
    updateConnectedPrinters();
    updatePrintQueueStatus();
    
    const interval = setInterval(() => {
      updatePrintQueueStatus();
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [updateConnectedPrinters, updatePrintQueueStatus]);

  return {
    connectedPrinters,
    isConnecting,
    printQueueStatus,
    connectBluetoothPrinter,
    connectCablePrinter,
    connectUSBPrinter,
    connectPreviewPrinter,
    disconnectPrinter,
    print,
    isPrinterConnected,
    getPrinter,
    testSerialAPISupport
  };
}
