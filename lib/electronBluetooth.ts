export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  isPaired: boolean;
}

export interface BluetoothStatus {
  isEnabled: boolean;
  isConnected: boolean;
  connectedDevice?: BluetoothDevice;
}

class ElectronBluetoothManager {
  private isElectron: boolean;
  private connectedDevice: BluetoothDevice | null = null;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.require;
  }

  // Check if we're running in Electron
  isElectronAvailable(): boolean {
    return this.isElectron;
  }

  // Get list of available Bluetooth devices (like your phone)
  async getAvailableDevices(): Promise<BluetoothDevice[]> {
    if (!this.isElectron) {
      throw new Error('This feature requires Electron app');
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const devices = await ipcRenderer.invoke('get-bluetooth-devices');
      
      return devices.map((device: any) => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        address: device.address,
        isPaired: device.paired || false
      }));
    } catch (error) {
      console.error('Failed to get Bluetooth devices:', error);
      throw new Error('Failed to scan for Bluetooth devices');
    }
  }

  // Connect to a Bluetooth device
  async connectToDevice(deviceAddress: string): Promise<boolean> {
    if (!this.isElectron) {
      throw new Error('This feature requires Electron app');
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('connect-bluetooth', deviceAddress);
      
      if (result.success) {
        // Find device info
        const devices = await this.getAvailableDevices();
        this.connectedDevice = devices.find(d => d.address === deviceAddress) || null;
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to connect to Bluetooth device:', error);
      throw error;
    }
  }

  // Disconnect from current device
  async disconnect(): Promise<boolean> {
    if (!this.isElectron) {
      throw new Error('This feature requires Electron app');
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('disconnect-bluetooth');
      
      if (result.success) {
        this.connectedDevice = null;
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to disconnect from Bluetooth device:', error);
      throw error;
    }
  }

  // Send data to connected Bluetooth printer
  async sendToPrinter(data: string): Promise<boolean> {
    if (!this.isElectron) {
      throw new Error('This feature requires Electron app');
    }

    if (!this.connectedDevice) {
      throw new Error('No Bluetooth device connected');
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('send-to-printer', data);
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to send data to printer:', error);
      throw error;
    }
  }

  // Check Bluetooth status
  async getStatus(): Promise<BluetoothStatus> {
    if (!this.isElectron) {
      return { isEnabled: false, isConnected: false };
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const status = await ipcRenderer.invoke('check-bluetooth-status');
      
      return {
        isEnabled: status.isEnabled,
        isConnected: status.isOpen,
        connectedDevice: this.connectedDevice || undefined
      };
    } catch (error) {
      console.error('Failed to get Bluetooth status:', error);
      return { isEnabled: false, isConnected: false };
    }
  }

  // Get currently connected device
  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }
}

export const electronBluetoothManager = new ElectronBluetoothManager();

// Fallback to Web Bluetooth API if Electron is not available
export class HybridBluetoothManager {
  private electronManager = electronBluetoothManager;
  private webBluetoothSupported = typeof window !== 'undefined' && 'bluetooth' in navigator;

  async getAvailableDevices(): Promise<BluetoothDevice[]> {
    // Try Electron first
    if (this.electronManager.isElectronAvailable()) {
      try {
        return await this.electronManager.getAvailableDevices();
      } catch (error) {
        console.log('Electron Bluetooth failed, falling back to Web Bluetooth');
      }
    }

    // Fallback to Web Bluetooth
    if (this.webBluetoothSupported && navigator.bluetooth) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [
            // Generic device filters that will show most Bluetooth devices
            { namePrefix: 'Printer' },
            { namePrefix: 'POS' },
            { namePrefix: 'Thermal' },
            { namePrefix: 'Bluetooth' },
            { namePrefix: 'BT' },
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
            { namePrefix: 'Toshiba' },
            { namePrefix: 'Samsung' },
            { namePrefix: 'LG' },
            { namePrefix: 'Panasonic' },
            { namePrefix: 'Sharp' },
            // Generic service-based filter
            { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }
          ],
          optionalServices: ['generic_access', 'generic_attribute', '000018f0-0000-1000-8000-00805f9b34fb']
        });

        return [{
          id: device.id,
          name: device.name || 'Unknown Device',
          address: device.id,
          isPaired: false
        }];
      } catch (error) {
        throw new Error('No Bluetooth devices found or permission denied');
      }
    }

    throw new Error('Bluetooth not supported in this environment');
  }

  async connectToDevice(deviceAddress: string): Promise<boolean> {
    if (this.electronManager.isElectronAvailable()) {
      return await this.electronManager.connectToDevice(deviceAddress);
    }

    // Web Bluetooth connection logic here
    throw new Error('Web Bluetooth connection not implemented');
  }

  async sendToPrinter(data: string): Promise<boolean> {
    if (this.electronManager.isElectronAvailable()) {
      return await this.electronManager.sendToPrinter(data);
    }

    // Web Bluetooth printing logic here
    throw new Error('Web Bluetooth printing not implemented');
  }
}

export const hybridBluetoothManager = new HybridBluetoothManager();
