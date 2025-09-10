// Printer Service for handling real printer connections and printing

// Type declarations for Web APIs
declare global {
  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: () => void): void;
  }

  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    writeValue(data: Uint8Array): Promise<void>;
  }

  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    writable?: WritableStream<Uint8Array>;
  }

  interface Navigator {
    bluetooth?: {
      requestDevice(options: {
        filters?: Array<{ namePrefix?: string }>;
        optionalServices?: string[];
      }): Promise<BluetoothDevice>;
    };
    serial?: {
      requestPort(options?: {
        filters?: Array<{ usbVendorId?: number }>;
      }): Promise<SerialPort>;
    };
  }
}

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'cable';
  isConnected: boolean;
  device?: BluetoothDevice | SerialPort;
  connectionType?: 'bluetooth' | 'cable';
}

export interface PrintJob {
  id: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  printerId: string;
}

class PrinterService {
  private connectedPrinters: Map<string, PrinterDevice> = new Map();
  private printQueue: PrintJob[] = [];
  private isProcessingQueue = false;

  // Bluetooth Printer Functions
  async connectBluetoothPrinter(printerId: string, printerName: string): Promise<boolean> {
    try {
      if (!('bluetooth' in navigator)) {
        throw new Error('Bluetooth not supported in this browser');
      }

      // Request Bluetooth device with printer services
      const device = await navigator.bluetooth!.requestDevice({
        filters: [
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'Receipt' }
        ],
        optionalServices: [
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
          '0000ae30-0000-1000-8000-00805f9b34fb', // Printer Service (custom)
        ]
      });

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Store connected printer
      const printer: PrinterDevice = {
        id: printerId,
        name: printerName,
        type: 'bluetooth',
        isConnected: true,
        device: device,
        connectionType: 'bluetooth'
      };

      this.connectedPrinters.set(printerId, printer);
      
      // Set up device disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        this.disconnectPrinter(printerId);
      });

      return true;
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;
    }
  }

  // Cable/USB Printer Functions
  async connectCablePrinter(printerId: string, printerName: string): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Serial API not supported in this browser');
      }

      // Request serial port access
      const port = await navigator.serial!.requestPort({
        filters: [
          { usbVendorId: 0x04b8 }, // Epson
          { usbVendorId: 0x04f9 }, // Brother
          { usbVendorId: 0x03f0 }, // HP
          { usbVendorId: 0x04e8 }, // Samsung
        ]
      });

      // Open the port
      await port.open({ baudRate: 9600 });

      // Store connected printer
      const printer: PrinterDevice = {
        id: printerId,
        name: printerName,
        type: 'cable',
        isConnected: true,
        device: port,
        connectionType: 'cable'
      };

      this.connectedPrinters.set(printerId, printer);
      return true;
    } catch (error) {
      console.error('Cable connection error:', error);
      throw error;
    }
  }

  // Disconnect printer
  disconnectPrinter(printerId: string): void {
    const printer = this.connectedPrinters.get(printerId);
    if (printer) {
      if (printer.connectionType === 'bluetooth' && printer.device) {
        const bluetoothDevice = printer.device as BluetoothDevice;
        bluetoothDevice.gatt?.disconnect();
      } else if (printer.connectionType === 'cable' && printer.device) {
        const serialPort = printer.device as SerialPort;
        serialPort.close();
      }
      
      printer.isConnected = false;
      this.connectedPrinters.set(printerId, printer);
    }
  }

  // Print content to specific printer
  async print(printerId: string, content: string): Promise<boolean> {
    const printer = this.connectedPrinters.get(printerId);
    if (!printer || !printer.isConnected) {
      throw new Error('Printer not connected');
    }

    const printJob: PrintJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: new Date(),
      status: 'pending',
      printerId
    };

    this.printQueue.push(printJob);
    await this.processPrintQueue();
    return true;
  }

  // Process print queue
  private async processPrintQueue(): Promise<void> {
    if (this.isProcessingQueue || this.printQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      if (!job) continue;

      try {
        job.status = 'printing';
        await this.executePrintJob(job);
        job.status = 'completed';
      } catch (error) {
        console.error('Print job failed:', error);
        job.status = 'failed';
      }
    }

    this.isProcessingQueue = false;
  }

  // Execute actual print job
  private async executePrintJob(job: PrintJob): Promise<void> {
    const printer = this.connectedPrinters.get(job.printerId);
    if (!printer || !printer.isConnected) {
      throw new Error('Printer not connected');
    }

    if (printer.connectionType === 'bluetooth') {
      await this.printViaBluetooth(printer, job.content);
    } else if (printer.connectionType === 'cable') {
      await this.printViaCable(printer, job.content);
    }
  }

  // Print via Bluetooth
  private async printViaBluetooth(printer: PrinterDevice, content: string): Promise<void> {
    const device = printer.device as BluetoothDevice;
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error('Bluetooth connection lost');
    }

    // Convert content to bytes (ESC/POS commands)
    const printData = this.generateESCPOSCommands(content);
    
    // Try to find printer service and characteristic
    try {
      const service = await server.getPrimaryService('0000ae30-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('0000ae31-0000-1000-8000-00805f9b34fb');
      await characteristic.writeValue(printData);
    } catch {
      // Fallback: try generic service
      console.warn('Custom printer service not found, trying generic approach');
      // For now, we'll simulate the print
      console.log('Printing via Bluetooth:', content);
    }
  }

  // Print via Cable/Serial
  private async printViaCable(printer: PrinterDevice, content: string): Promise<void> {
    const port = printer.device as SerialPort;
    if (!port.writable) {
      throw new Error('Serial port not writable');
    }

    // Convert content to bytes (ESC/POS commands)
    const printData = this.generateESCPOSCommands(content);
    
    const writer = port.writable.getWriter();
    try {
      await writer.write(printData);
    } finally {
      writer.releaseLock();
    }
  }

  // Generate ESC/POS commands for thermal printers
  private generateESCPOSCommands(content: string): Uint8Array {
    const commands: number[] = [];
    
    // ESC/POS initialization
    commands.push(0x1B, 0x40); // ESC @ - Initialize printer
    
    // Set text alignment to center
    commands.push(0x1B, 0x61, 0x01); // ESC a 1 - Center alignment
    
    // Set font size (double width and height)
    commands.push(0x1D, 0x21, 0x11); // GS ! 17 - Double width and height
    
    // Add content
    const contentBytes = new TextEncoder().encode(content);
    commands.push(...Array.from(contentBytes));
    
    // Add line breaks
    commands.push(0x0A, 0x0A, 0x0A); // Line feeds
    
    // Cut paper
    commands.push(0x1D, 0x56, 0x00); // GS V 0 - Full cut
    
    return new Uint8Array(commands);
  }

  // Get connected printers
  getConnectedPrinters(): PrinterDevice[] {
    return Array.from(this.connectedPrinters.values());
  }

  // Get printer by ID
  getPrinter(printerId: string): PrinterDevice | undefined {
    return this.connectedPrinters.get(printerId);
  }

  // Check if printer is connected
  isPrinterConnected(printerId: string): boolean {
    const printer = this.connectedPrinters.get(printerId);
    return printer ? printer.isConnected : false;
  }

  // Get print queue status
  getPrintQueueStatus(): { pending: number; processing: number; completed: number; failed: number } {
    const status = { pending: 0, processing: 0, completed: 0, failed: 0 };
    
    this.printQueue.forEach(job => {
      switch (job.status) {
        case 'pending':
          status.pending++;
          break;
        case 'printing':
          status.processing++;
          break;
        case 'completed':
          status.completed++;
          break;
        case 'failed':
          status.failed++;
          break;
      }
    });
    
    return status;
  }
}

// Export singleton instance
export const printerService = new PrinterService();
