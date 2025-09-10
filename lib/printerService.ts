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
    readable?: ReadableStream<Uint8Array>;
    addEventListener(type: string, listener: () => void): void;
    getInfo?(): { usbVendorId?: number; usbProductId?: number };
  }

  interface USBDevice {
    deviceClass: number;
    deviceProtocol: number;
    deviceSubclass: number;
    deviceVersionMajor: number;
    deviceVersionMinor: number;
    deviceVersionSubminor: number;
    manufacturerName?: string;
    productId: number;
    productName?: string;
    serialNumber?: string;
    usbVersionMajor: number;
    usbVersionMinor: number;
    usbVersionSubminor: number;
    vendorId: number;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    reset(): Promise<void>;
  }

  interface USBInTransferResult {
    data?: DataView;
    status: 'ok' | 'stall' | 'babble';
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
  }

  interface USB {
    requestDevice(options: {
      filters: Array<{
        classCode?: number;
        protocolCode?: number;
        subclassCode?: number;
        vendorId?: number;
        productId?: number;
      }>;
    }): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
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
    usb?: USB;
  }
}


export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'cable' | 'usb' | 'preview';
  isConnected: boolean;
  device?: BluetoothDevice | SerialPort | USBDevice;
  connectionType?: 'bluetooth' | 'cable' | 'usb' | 'preview';
  claimedInterface?: number; // For USB devices
  workingEndpoint?: number; // For USB devices - stores the endpoint that works
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

      // Request Bluetooth device with expanded printer filters
      const device = await navigator.bluetooth!.requestDevice({
        filters: [
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'Receipt' },
          { namePrefix: 'EPSON' },
          { namePrefix: 'Star' },
          { namePrefix: 'Citizen' },
          { namePrefix: 'Bixolon' },
          { namePrefix: 'Brother' },
          { namePrefix: 'HP' },
          { namePrefix: 'Canon' },
          { namePrefix: 'Zebra' },
          { namePrefix: 'TSC' },
          { namePrefix: 'Godex' },
          { namePrefix: 'BTP' },
          { namePrefix: 'BLE' }
        ],
        optionalServices: [
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
          '0000ae30-0000-1000-8000-00805f9b34fb', // Printer Service (custom)
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Common printer service
          '0000ff00-0000-1000-8000-00805f9b34fb', // Another common printer service
          '0000ff10-0000-1000-8000-00805f9b34fb', // Generic printer service
          '0000ff20-0000-1000-8000-00805f9b34fb', // Another generic service
        ]
      });

      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Test the connection by trying to discover services
      try {
        // Try to get a known service to test connection
        await server.getPrimaryService('00001800-0000-1000-8000-00805f9b34fb');
        console.log('Bluetooth connection established successfully');
      } catch (_error) {
        console.warn('Could not discover services, but connection established');
      }

      // Store connected printer
      const printer: PrinterDevice = {
        id: printerId,
        name: `${printerName} (${device.name || 'Unknown Device'})`,
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
      
      if (error instanceof Error) {
        if (error.message.includes('User cancelled')) {
          throw new Error('Bluetooth device selection was cancelled');
        } else if (error.message.includes('No device selected')) {
          throw new Error('No Bluetooth printer selected');
        } else if (error.message.includes('not supported')) {
          throw new Error('Bluetooth not supported in this browser. Please use Chrome or Edge.');
        } else if (error.message.includes('GATT server')) {
          throw new Error('Failed to connect to printer. Please ensure the printer is turned on and in pairing mode.');
        }
      }
      
      throw error;
    }
  }

  // WebUSB Printer Functions
  async connectUSBPrinter(printerId: string, printerName: string): Promise<boolean> {
    try {
      if (!('usb' in navigator)) {
        throw new Error('WebUSB API not supported in this browser. Please use Chrome or Edge.');
      }

      // Request USB device with printer filters
      const device = await navigator.usb!.requestDevice({
        filters: [
          // Common thermal printer vendors
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x04f9 }, // Brother
          { vendorId: 0x03f0 }, // HP
          { vendorId: 0x04e8 }, // Samsung
          { vendorId: 0x0fe6 }, // Citizen
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x04e2 }, // Bixolon
          { vendorId: 0x0bda }, // Realtek
          { vendorId: 0x0403 }, // FTDI
          { vendorId: 0x067b }, // Prolific
          { vendorId: 0x1a86 }, // QinHeng Electronics
        ]
      });

      // Open the device
      await device.open();
      
      // Try different configurations
      const configurations = [1, 2, 3, 4, 5];
      let configSuccess = false;
      
      for (const config of configurations) {
        try {
          await device.selectConfiguration(config);
          console.log(`USB configuration ${config} selected successfully`);
          configSuccess = true;
          break;
        } catch (error) {
          console.warn(`Failed to select USB configuration ${config}:`, error);
          continue;
        }
      }
      
      if (!configSuccess) {
        throw new Error('Failed to select any USB configuration');
      }
      
      // Try different interfaces and store the successful one
      const interfaces = [0, 1, 2, 3, 4];
      let claimedInterface = -1;
      
      for (const interfaceNum of interfaces) {
        try {
          await device.claimInterface(interfaceNum);
          console.log(`USB interface ${interfaceNum} claimed successfully`);
          claimedInterface = interfaceNum;
          break;
        } catch (error) {
          console.warn(`Failed to claim USB interface ${interfaceNum}:`, error);
          continue;
        }
      }
      
      if (claimedInterface === -1) {
        throw new Error('Failed to claim any USB interface');
      }

      // Store connected printer with interface info
      const printer: PrinterDevice = {
        id: printerId,
        name: `${printerName} (${device.productName || `Vendor: 0x${device.vendorId.toString(16)}`})`,
        type: 'usb',
        isConnected: true,
        device: device,
        connectionType: 'usb',
        claimedInterface: claimedInterface
      };

      this.connectedPrinters.set(printerId, printer);
      return true;
    } catch (error) {
      console.error('USB connection error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('No device selected')) {
          throw new Error('No printer selected. Please select a USB printer from the list.');
        } else if (error.message.includes('Access denied')) {
          throw new Error('Access denied. Please allow USB device access and try again.');
        }
      }
      
      throw error;
    }
  }

  // Print Preview (Universal fallback)
  async connectPreviewPrinter(printerId: string, printerName: string): Promise<boolean> {
    try {
      // This is always available - just creates a preview printer
      const printer: PrinterDevice = {
        id: printerId,
        name: `${printerName} (Preview Mode)`,
        type: 'preview',
        isConnected: true,
        connectionType: 'preview'
      };

      this.connectedPrinters.set(printerId, printer);
      return true;
    } catch (error) {
      console.error('Preview connection error:', error);
      throw error;
    }
  }

  // Cable/USB Printer Functions (Legacy Serial API)
  async connectCablePrinter(printerId: string, printerName: string): Promise<boolean> {
    try {
      // Check if we're in a supported browser
      if (!('serial' in navigator)) {
        throw new Error('Serial API not supported in this browser. Please use Chrome or Edge.');
      }

      // Check if we're on HTTPS (required for Serial API)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Serial API requires HTTPS. Please access the app via HTTPS.');
      }

      // Request serial port access with broader filters
      const port = await navigator.serial!.requestPort({
        filters: [
          // Common thermal printer vendors
          { usbVendorId: 0x04b8 }, // Epson
          { usbVendorId: 0x04f9 }, // Brother
          { usbVendorId: 0x03f0 }, // HP
          { usbVendorId: 0x04e8 }, // Samsung
          { usbVendorId: 0x0fe6 }, // Citizen
          { usbVendorId: 0x0519 }, // Star Micronics
          { usbVendorId: 0x04e2 }, // Bixolon
          { usbVendorId: 0x0bda }, // Realtek (generic USB-serial)
          { usbVendorId: 0x0403 }, // FTDI (USB-serial converters)
          { usbVendorId: 0x067b }, // Prolific (USB-serial converters)
          { usbVendorId: 0x1a86 }, // QinHeng Electronics (CH340/CH341)
        ]
      });

      // Try different baud rates for better compatibility
      const baudRates = [9600, 115200, 38400, 19200, 4800];
      let connected = false;

      for (const baudRate of baudRates) {
        try {
          await port.open({ baudRate });
          connected = true;
          console.log(`Connected at ${baudRate} baud`);
          break;
        } catch (error) {
          console.warn(`Failed to connect at ${baudRate} baud:`, error);
          if (port.readable) {
            await port.close();
          }
        }
      }

      if (!connected) {
        throw new Error('Failed to connect to printer at any baud rate. Please check the connection and try again.');
      }

      // Store connected printer
      const printer: PrinterDevice = {
        id: printerId,
        name: `${printerName} (${port.getInfo?.()?.usbVendorId ? `Vendor: 0x${port.getInfo().usbVendorId?.toString(16)}` : 'USB Serial'})`,
        type: 'cable',
        isConnected: true,
        device: port,
        connectionType: 'cable'
      };

      this.connectedPrinters.set(printerId, printer);
      
      // Set up port close handler
      port.addEventListener('disconnect', () => {
        this.disconnectPrinter(printerId);
      });

      return true;
    } catch (error) {
      console.error('Cable connection error:', error);
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('No port selected')) {
          throw new Error('No printer selected. Please select a USB printer from the list.');
        } else if (error.message.includes('Access denied')) {
          throw new Error('Access denied. Please allow serial port access and try again.');
        } else if (error.message.includes('Device is already open')) {
          throw new Error('Printer is already connected. Please disconnect first.');
        }
      }
      
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
      } else if (printer.connectionType === 'usb' && printer.device) {
        const usbDevice = printer.device as USBDevice;
        try {
          // Release the claimed interface before closing
          if (printer.claimedInterface !== undefined) {
            usbDevice.releaseInterface(printer.claimedInterface);
            console.log(`Released USB interface ${printer.claimedInterface}`);
          }
          usbDevice.close();
          console.log('USB device closed successfully');
        } catch (error) {
          console.warn('Error closing USB device:', error);
        }
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

    // For USB printers, check connection health before printing
    if (printer.connectionType === 'usb') {
      const isHealthy = await this.checkUSBConnectionHealth(printer);
      if (!isHealthy) {
        console.warn('USB printer connection is not healthy, attempting to restore');
        // Try to restore the connection
        try {
          const device = printer.device as USBDevice;
          // Try to reopen the device
          try {
            await device.open();
          } catch (openError) {
            // Device might already be open
            console.log('Device already open or failed to reopen');
          }
          if (printer.claimedInterface !== undefined) {
            await device.claimInterface(printer.claimedInterface);
          }
          console.log('USB connection restored successfully');
        } catch (restoreError) {
          console.error('Failed to restore USB connection:', restoreError);
          throw new Error('USB printer connection lost and could not be restored');
        }
      }
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
    } else if (printer.connectionType === 'usb') {
      await this.printViaUSB(printer, job.content);
    } else if (printer.connectionType === 'preview') {
      await this.printViaPreview(printer, job.content);
    }
  }

  // Print via Bluetooth
  private async printViaBluetooth(printer: PrinterDevice, content: string): Promise<void> {
    const device = printer.device as BluetoothDevice;
    
    try {
      // Connect to GATT server
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to Bluetooth device');
      }

      // Convert content to bytes (ESC/POS commands)
      const printData = this.generateESCPOSCommands(content);
      
      // Try to find printer service and characteristic
      try {
        // Try custom printer service first
        const service = await server.getPrimaryService('0000ae30-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('0000ae31-0000-1000-8000-00805f9b34fb');
        
        // Send data to printer
        await characteristic.writeValue(printData);
      } catch (_error) {
        // Fallback: try generic service
        try {
          const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
          const characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
          
          // Send data to printer
          await characteristic.writeValue(printData);
        } catch (_error2) {
          throw new Error('No suitable printer service or characteristic found. Please ensure your printer supports Bluetooth printing.');
        }
      }
      
      console.log('Print data sent via Bluetooth:', printData.length, 'bytes');
      
      // Wait a moment for the data to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Bluetooth printing error:', error);
      throw new Error(`Failed to print via Bluetooth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Print via Cable/Serial
  private async printViaCable(printer: PrinterDevice, content: string): Promise<void> {
    const port = printer.device as SerialPort;
    if (!port.writable) {
      throw new Error('Serial port not writable. Please check the connection.');
    }

    // Convert content to bytes (ESC/POS commands)
    const printData = this.generateESCPOSCommands(content);
    
    const writer = port.writable.getWriter();
    try {
      await writer.write(printData);
      console.log('Print data sent via cable:', printData.length, 'bytes');
    } catch (error) {
      console.error('Failed to write to serial port:', error);
      throw new Error('Failed to send print data to printer');
    } finally {
      writer.releaseLock();
    }
  }

  // Check USB connection health
  private async checkUSBConnectionHealth(printer: PrinterDevice): Promise<boolean> {
    const device = printer.device as USBDevice;
    const claimedInterface = printer.claimedInterface;
    
    try {
      // Check if device is still open by trying to access it
      try {
        // Try to access device properties to check if it's still open
        const _ = device.vendorId; // This will throw if device is closed
      } catch (error) {
        console.warn('USB device is not open, attempting to reopen');
        await device.open();
      }
      
      // Check if interface is still claimed
      if (claimedInterface !== undefined) {
        try {
          await device.claimInterface(claimedInterface);
          return true;
        } catch (error) {
          console.warn('Interface not claimed, attempting to reclaim');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('USB connection health check failed:', error);
      return false;
    }
  }

  // Print via USB
  private async printViaUSB(printer: PrinterDevice, content: string): Promise<void> {
    const device = printer.device as USBDevice;
    const claimedInterface = printer.claimedInterface;
    
    // Convert content to bytes (ESC/POS commands)
    const printData = this.generateESCPOSCommands(content);
    
    try {
      // Check connection health first
      const isHealthy = await this.checkUSBConnectionHealth(printer);
      if (!isHealthy) {
        console.warn('USB connection is not healthy, attempting to restore');
      }
      // Ensure the interface is still claimed and properly configured
      if (claimedInterface !== undefined) {
        try {
          // First try to claim the interface
          await device.claimInterface(claimedInterface);
          console.log(`Re-claimed USB interface ${claimedInterface}`);
          
          // Also ensure the configuration is still selected
          try {
            await device.selectConfiguration(1);
            console.log('USB configuration 1 re-selected');
          } catch (configError) {
            console.warn('Failed to re-select configuration, but interface claimed');
          }
        } catch (error) {
          console.warn(`Failed to re-claim interface ${claimedInterface}:`, error);
          // Try to find a working interface
          const interfaces = [0, 1, 2, 3, 4];
          for (const interfaceNum of interfaces) {
            try {
              await device.claimInterface(interfaceNum);
              console.log(`Successfully claimed alternative interface ${interfaceNum}`);
              // Update the printer with the new interface
              printer.claimedInterface = interfaceNum;
              this.connectedPrinters.set(printer.id, printer);
              break;
            } catch (interfaceError) {
              console.warn(`Failed to claim interface ${interfaceNum}:`, interfaceError);
              continue;
            }
          }
        }
      }
      
      // Try different USB endpoints, prioritizing the one that worked before
      let endpoints = [2, 1, 3, 4, 5]; // Default order
      
      // If we have a stored working endpoint, try it first
      if (printer.workingEndpoint !== undefined) {
        endpoints = [printer.workingEndpoint, ...endpoints.filter(ep => ep !== printer.workingEndpoint)];
        console.log(`Using stored working endpoint ${printer.workingEndpoint} first`);
      }
      
      let success = false;
      let lastError: Error | null = null;
      let workingEndpoint = -1;
      
      // Add a small delay to ensure interface is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      for (const endpoint of endpoints) {
        try {
          // Create a new ArrayBuffer from the Uint8Array
          const buffer = new ArrayBuffer(printData.length);
          const view = new Uint8Array(buffer);
          view.set(printData);
          
          const result = await device.transferOut(endpoint, buffer);
          console.log(`Print data sent via USB endpoint ${endpoint}:`, result.bytesWritten, 'bytes');
          success = true;
          workingEndpoint = endpoint;
          break;
        } catch (error) {
          console.warn(`Failed to send data to USB endpoint ${endpoint}:`, error);
          lastError = error instanceof Error ? error : new Error('Unknown USB transfer error');
          continue;
        }
      }
      
      if (!success) {
        // If all endpoints failed, try chunked approach with the most likely endpoint
        try {
          const chunkSize = 64; // Common USB packet size
          const preferredEndpoint = 2; // Use endpoint 2 since it worked before
          
          for (let i = 0; i < printData.length; i += chunkSize) {
            const chunk = printData.slice(i, i + chunkSize);
            const buffer = new ArrayBuffer(chunk.length);
            const view = new Uint8Array(buffer);
            view.set(chunk);
            
            await device.transferOut(preferredEndpoint, buffer);
            console.log(`Sent USB chunk ${i}-${i + chunk.length} bytes via endpoint ${preferredEndpoint}`);
          }
          console.log('Print data sent via USB in chunks');
          success = true;
          workingEndpoint = preferredEndpoint;
        } catch (chunkError) {
          console.error('Chunked USB transfer also failed:', chunkError);
        }
      }
      
      if (!success) {
        throw lastError || new Error('All USB transfer methods failed');
      }
      
      // Store the working endpoint for future use
      if (workingEndpoint !== -1) {
        console.log(`USB printing successful via endpoint ${workingEndpoint}`);
        // Update the printer with the working endpoint
        printer.workingEndpoint = workingEndpoint;
        this.connectedPrinters.set(printer.id, printer);
      }
      
    } catch (error) {
      console.error('Failed to write to USB device:', error);
      
      // Offer fallback to preview mode
      const fallback = confirm(
        `USB printing failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        'Would you like to open a print preview instead? This will allow you to print using your system printer.'
      );
      
      if (fallback) {
        console.log('Falling back to preview mode for USB printer');
        await this.printViaPreview(printer, content);
        return;
      }
      
      throw new Error(`Failed to send print data to USB printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Print via Preview (opens print dialog)
  private async printViaPreview(printer: PrinterDevice, content: string): Promise<void> {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        throw new Error('Failed to open print window. Please allow popups.');
      }

      // Create print-friendly HTML
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Preview</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              margin: 0;
              padding: 20px;
              white-space: pre-wrap;
              background: white;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          ${content.replace(/\n/g, '<br>')}
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

      console.log('Print preview opened for:', printer.name);
    } catch (error) {
      console.error('Failed to open print preview:', error);
      throw new Error('Failed to open print preview');
    }
  }

  // Debug function to test USB API availability
  async testUSBAPISupport(): Promise<{ supported: boolean; message: string }> {
    try {
      if (!('usb' in navigator)) {
        return {
          supported: false,
          message: 'WebUSB API not supported in this browser. Please use Chrome or Edge.'
        };
      }

      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        return {
          supported: false,
          message: 'WebUSB API requires HTTPS. Please access the app via HTTPS.'
        };
      }

      return {
        supported: true,
        message: 'WebUSB API is supported and ready to use.'
      };
    } catch (error) {
      return {
        supported: false,
        message: `WebUSB API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Debug function to test serial API availability
  async testSerialAPISupport(): Promise<{ supported: boolean; message: string }> {
    try {
      if (!('serial' in navigator)) {
        return {
          supported: false,
          message: 'Serial API not supported in this browser. Please use Chrome or Edge.'
        };
      }

      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        return {
          supported: false,
          message: 'Serial API requires HTTPS. Please access the app via HTTPS.'
        };
      }

      return {
        supported: true,
        message: 'Serial API is supported and ready to use.'
      };
    } catch (error) {
      return {
        supported: false,
        message: `Serial API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
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
