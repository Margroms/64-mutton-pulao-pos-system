// Web Bluetooth API implementation following Chrome official documentation
// https://developer.chrome.com/docs/capabilities/bluetooth

export interface WebBluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

export interface WebBluetoothService {
  uuid: string;
  isPrimary: boolean;
}

export interface WebBluetoothCharacteristic {
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
}

export class WebBluetoothManager {
  private isSupported: boolean;
  private connectedDevice: WebBluetoothDevice | null = null;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  // Check if Web Bluetooth is supported
  isWebBluetoothSupported(): boolean {
    return this.isSupported;
  }

  // Request Bluetooth device following Chrome documentation
  async requestDevice(options: {
    filters: BluetoothRequestDeviceFilter[];
    optionalServices?: string[];
  }): Promise<WebBluetoothDevice> {
    if (!this.isSupported || !navigator.bluetooth) {
      throw new Error('Web Bluetooth not supported in this browser');
    }

    try {
      const device = await navigator.bluetooth.requestDevice(options);
      return device;
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Request device with printer-specific filters
  async requestPrinterDevice(): Promise<WebBluetoothDevice> {
    return this.requestDevice({
      filters: [
        // Service-based filters (most reliable)
        { services: ['battery_service'] },
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        
        // Name-based filters for common printers
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
        { namePrefix: 'TSC' },
        { namePrefix: 'Godex' },
        { namePrefix: 'Datamax' },
        
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
  }

  // Connect to GATT server
  async connectToDevice(device: WebBluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new Error('Device GATT server not available');
    }

    try {
      const server = await device.gatt.connect();
      this.connectedDevice = device;
      return server;
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Get primary service
  async getPrimaryService(server: BluetoothRemoteGATTServer, serviceUUID: string): Promise<BluetoothRemoteGATTService> {
    try {
      return await server.getPrimaryService(serviceUUID);
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Get characteristic
  async getCharacteristic(service: BluetoothRemoteGATTService, characteristicUUID: string): Promise<BluetoothRemoteGATTCharacteristic> {
    try {
      return await service.getCharacteristic(characteristicUUID);
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Read characteristic value
  async readCharacteristicValue(characteristic: BluetoothRemoteGATTCharacteristic): Promise<DataView> {
    try {
      return await characteristic.readValue();
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Write characteristic value
  async writeCharacteristicValue(characteristic: BluetoothRemoteGATTCharacteristic, value: BufferSource): Promise<void> {
    try {
      await characteristic.writeValue(value);
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Start notifications
  async startNotifications(characteristic: BluetoothRemoteGATTCharacteristic, callback: (event: Event) => void): Promise<void> {
    try {
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', callback);
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Stop notifications
  async stopNotifications(characteristic: BluetoothRemoteGATTCharacteristic, callback: (event: Event) => void): Promise<void> {
    try {
      await characteristic.stopNotifications();
      characteristic.removeEventListener('characteristicvaluechanged', callback);
    } catch (error: unknown) {
      this.handleBluetoothError(error);
      throw error;
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    if (this.connectedDevice && this.connectedDevice.gatt) {
      try {
        this.connectedDevice.gatt.disconnect();
        this.connectedDevice = null;
      } catch (error: unknown) {
        this.handleBluetoothError(error);
        throw error;
      }
    }
  }

  // Get connected device
  getConnectedDevice(): WebBluetoothDevice | null {
    return this.connectedDevice;
  }

  // Handle Bluetooth errors according to Chrome documentation
  private handleBluetoothError(error: unknown): void {
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotFoundError':
          console.error('No Bluetooth devices found or permission denied');
          break;
        case 'NotAllowedError':
          console.error('Bluetooth permission denied');
          break;
        case 'NotSupportedError':
          console.error('Bluetooth not supported on this device');
          break;
        case 'SecurityError':
          console.error('Bluetooth requires HTTPS (except localhost for development)');
          break;
        case 'InvalidStateError':
          console.error('Bluetooth device is not in a valid state');
          break;
        case 'NetworkError':
          console.error('Bluetooth connection failed');
          break;
        default:
          console.error(`Bluetooth error: ${error.message}`);
      }
    }
  }

  // Check if running in secure context (HTTPS or localhost)
  isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
  }

  // Get browser compatibility info
  getBrowserInfo(): { 
    isSupported: boolean; 
    isSecure: boolean; 
    userAgent: string;
    webBluetoothSupported: boolean;
    bluetoothSupported: boolean;
    browserName: string;
    browserVersion: string;
  } {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    
    // Detect browser
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Opera')) {
      browserName = 'Opera';
      browserVersion = userAgent.match(/Opera\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      isSupported: this.isSupported,
      isSecure: this.isSecureContext(),
      userAgent,
      webBluetoothSupported: this.isSupported,
      bluetoothSupported: this.isSupported,
      browserName,
      browserVersion
    };
  }
}

// Export singleton instance
export const webBluetoothManager = new WebBluetoothManager();

// Example usage following Chrome documentation:
/*
// 1. Request device with user gesture
button.addEventListener('click', async () => {
  try {
    const device = await webBluetoothManager.requestPrinterDevice();
    console.log('Device selected:', device.name);
    
    // 2. Connect to GATT server
    const server = await webBluetoothManager.connectToDevice(device);
    console.log('Connected to GATT server');
    
    // 3. Get service and characteristic
    const service = await webBluetoothManager.getPrimaryService(server, 'battery_service');
    const characteristic = await webBluetoothManager.getCharacteristic(service, 'battery_level');
    
    // 4. Read value
    const value = await webBluetoothManager.readCharacteristicValue(characteristic);
    console.log('Battery level:', value.getUint8(0));
    
  } catch (error) {
    console.error('Bluetooth error:', error);
  }
});
*/
