// Add Web Bluetooth API types
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

interface Bluetooth {
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
}

interface BluetoothRequestDeviceOptions {
  filters: BluetoothRequestDeviceFilter[];
  optionalServices?: string[];
}

interface BluetoothRequestDeviceFilter {
  namePrefix?: string;
  services?: string[];
}

interface BluetoothDevice {
  id: string;
  name?: string;
}

export interface Printer {
  id: string;
  name: string;
  type: 'billing' | 'kitchen';
  isConnected: boolean;
  address?: string;
}

export interface PrintJob {
  content: string;
  printerType: 'billing' | 'kitchen';
  copies?: number;
}

class BluetoothPrinterManager {
  private printers: Map<string, Printer> = new Map();
  private isSupported: boolean;

  constructor() {
    // Check if we're in a browser environment
    this.isSupported = typeof window !== 'undefined' && 'bluetooth' in navigator;
    this.loadSavedPrinters();
  }

  private loadSavedPrinters() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('bluetooth-printers');
      if (saved) {
        const printers = JSON.parse(saved);
        printers.forEach((printer: Printer) => {
          this.printers.set(printer.id, { ...printer, isConnected: false });
        });
      }
    } catch (error) {
      console.error('Failed to load saved printers:', error);
    }
  }

  private savePrinters() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const printersArray = Array.from(this.printers.values());
      localStorage.setItem('bluetooth-printers', JSON.stringify(printersArray));
    } catch (error) {
      console.error('Failed to save printers:', error);
    }
  }

  async requestDevice(): Promise<Printer | null> {
    if (!this.isSupported || !navigator.bluetooth) {
      throw new Error('Bluetooth not supported in this browser');
    }

    try {
      // Following Chrome Web Bluetooth API official documentation
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          // Service-based filters (most reliable)
          { services: ['battery_service'] }, // Standard Bluetooth service
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic service
          
          // Name-based filters
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'HP' },
          { namePrefix: 'Canon' },
          { namePrefix: 'Epson' },
          { namePrefix: 'Brother' },
          { namePrefix: 'Zebra' },
          { namePrefix: 'Star' },
          { namePrefix: 'Citizen' },
          
          // Generic Bluetooth devices
          { namePrefix: 'Bluetooth' },
          { namePrefix: 'BT' }
        ],
        optionalServices: [
          'battery_service',
          'generic_access',
          'generic_attribute',
          '000018f0-0000-1000-8000-00805f9b34fb'
        ]
      });

      const printer: Printer = {
        id: device.id,
        name: device.name || 'Unknown Printer',
        type: 'billing', // Default to billing, can be changed
        isConnected: false,
        address: device.id
      };

      this.printers.set(printer.id, printer);
      this.savePrinters();
      return printer;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new Error('No Bluetooth devices found. Make sure your printer is turned on and in pairing mode.');
      } else if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Bluetooth permission denied. Please allow Bluetooth access.');
      } else if (error instanceof Error && error.name === 'NotSupportedError') {
        throw new Error('Bluetooth not supported on this device.');
      } else if (error instanceof Error && error.name === 'SecurityError') {
        throw new Error('Bluetooth requires HTTPS. Use localhost for development or deploy to HTTPS.');
      } else if (error instanceof Error) {
        throw new Error(`Bluetooth error: ${error.message}`);
      } else {
        throw new Error('Unknown Bluetooth error occurred');
      }
    }
  }

  async connectToPrinter(printerId: string): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) return false;

    try {
      // In a real implementation, you would establish a Bluetooth connection here
      // For now, we'll simulate the connection
      printer.isConnected = true;
      this.printers.set(printerId, printer);
      this.savePrinters();
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  async disconnectFromPrinter(printerId: string): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) return false;

    try {
      printer.isConnected = false;
      this.printers.set(printerId, printer);
      this.savePrinters();
      return true;
    } catch (error) {
      console.error('Failed to disconnect from printer:', error);
      return false;
    }
  }

  async printReceipt(printJob: PrintJob): Promise<boolean> {
    const printers = Array.from(this.printers.values())
      .filter(p => p.type === printJob.printerType && p.isConnected);

    if (printers.length === 0) {
      throw new Error(`No connected ${printJob.printerType} printer found`);
    }

    try {
      // In a real implementation, you would send the print data to the printer
      // For now, we'll simulate printing
      console.log(`Printing to ${printJob.printerType} printer:`, printJob.content);
      
      // Simulate print delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  getPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  updatePrinterType(printerId: string, type: 'billing' | 'kitchen'): boolean {
    const printer = this.printers.get(printerId);
    if (!printer) return false;

    printer.type = type;
    this.printers.set(printerId, printer);
    this.savePrinters();
    return true;
  }

  removePrinter(printerId: string): boolean {
    const removed = this.printers.delete(printerId);
    if (removed) {
      this.savePrinters();
    }
    return removed;
  }

  addManualPrinter(printer: Printer): boolean {
    try {
      this.printers.set(printer.id, printer);
      this.savePrinters();
      return true;
    } catch (error) {
      console.error('Failed to add manual printer:', error);
      return false;
    }
  }

  isBluetoothSupported(): boolean {
    return this.isSupported;
  }
}

export const printerManager = new BluetoothPrinterManager();

// Utility functions for generating print content
export function generateKitchenReceipt(order: any, menuItems: any[]): string {
  let content = '';
  content += '================================\n';
  content += '           KITCHEN ORDER        \n';
  content += '================================\n';
  content += `Order #: ${order._id.slice(-6)}\n`;
  content += `Table: ${order.tableId}\n`;
  content += `Time: ${new Date(order.createdAt).toLocaleTimeString()}\n`;
  content += `Waiter: ${order.waiterId}\n`;
  content += '--------------------------------\n';
  
  order.items.forEach((item: any) => {
    const menuItem = menuItems.find((mi: any) => mi._id === item.itemId);
    const itemName = menuItem ? menuItem.name : 'Unknown Item';
    content += `${item.quantity}x ${itemName}\n`;
    if (item.notes) {
      content += `   Notes: ${item.notes}\n`;
    }
  });
  
  content += '--------------------------------\n';
  content += `Total Items: ${order.items.length}\n`;
  content += `Order Total: $${order.finalAmount.toFixed(2)}\n`;
  content += '================================\n';
  content += '        PLEASE PREPARE          \n';
  content += '================================\n\n\n\n\n';
  
  return content;
}

export function generateBillingReceipt(bill: any, order: any, menuItems: any[]): string {
  let content = '';
  content += '================================\n';
  content += '           RESTAURANT BILL      \n';
  content += '================================\n';
  content += `Bill #: ${bill.billNumber}\n`;
  content += `Order #: ${order._id.slice(-6)}\n`;
  content += `Table: ${order.tableId}\n`;
  content += `Date: ${new Date(bill.createdAt).toLocaleDateString()}\n`;
  content += `Time: ${new Date(bill.createdAt).toLocaleTimeString()}\n`;
  content += '--------------------------------\n';
  
  bill.items.forEach((item: any) => {
    const menuItem = menuItems.find((mi: any) => mi._id === item.itemId);
    const itemName = menuItem ? menuItem.name : 'Unknown Item';
    content += `${item.quantity}x ${itemName}\n`;
    content += `   $${item.unitPrice.toFixed(2)} x ${item.quantity} = $${item.totalPrice.toFixed(2)}\n`;
  });
  
  content += '--------------------------------\n';
  content += `Subtotal: $${bill.subtotal.toFixed(2)}\n`;
  content += `Tax: $${bill.taxAmount.toFixed(2)}\n`;
  if (bill.discountAmount > 0) {
    content += `Discount: -$${bill.discountAmount.toFixed(2)}\n`;
  }
  content += `Total: $${bill.finalAmount.toFixed(2)}\n`;
  content += `Payment: ${bill.paymentMethod.toUpperCase()}\n`;
  content += '================================\n';
  content += '        THANK YOU!              \n';
  content += '================================\n\n\n\n\n';
  
  return content;
}
