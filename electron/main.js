const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { BluetoothSerial } = require('bluetooth-serial-port');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Load your Next.js app
  mainWindow.loadURL('http://localhost:3000');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Bluetooth functionality
let bluetoothSerial = new BluetoothSerial();

// Get list of available Bluetooth devices
ipcMain.handle('get-bluetooth-devices', async () => {
  return new Promise((resolve, reject) => {
    bluetoothSerial.list((devices) => {
      resolve(devices);
    }, (error) => {
      reject(error);
    });
  });
});

// Connect to a Bluetooth device
ipcMain.handle('connect-bluetooth', async (event, address) => {
  return new Promise((resolve, reject) => {
    bluetoothSerial.connect(address, () => {
      resolve({ success: true, message: 'Connected successfully' });
    }, (error) => {
      reject({ success: false, message: error.message });
    });
  });
});

// Disconnect from Bluetooth device
ipcMain.handle('disconnect-bluetooth', async () => {
  return new Promise((resolve) => {
    bluetoothSerial.close();
    resolve({ success: true, message: 'Disconnected successfully' });
  });
});

// Send data to Bluetooth printer
ipcMain.handle('send-to-printer', async (event, data) => {
  return new Promise((resolve, reject) => {
    bluetoothSerial.write(Buffer.from(data, 'utf8'), (success) => {
      resolve({ success: true, message: 'Data sent successfully' });
    }, (error) => {
      reject({ success: false, message: error.message });
    });
  });
});

// Check Bluetooth status
ipcMain.handle('check-bluetooth-status', async () => {
  return new Promise((resolve) => {
    bluetoothSerial.isOpen((isOpen) => {
      resolve({ isOpen, isEnabled: true });
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
