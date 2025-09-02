# Restaurant POS System

A modern, monochrome Point of Sale system built with Next.js, shadcn/ui, and Convex database for real-time restaurant management.

## Features

- **3 User Roles**: Waiter, Admin, and Settings management
- **Real-time Database**: Powered by Convex for instant synchronization
- **Bluetooth Printer Support**: Kitchen and billing receipt printing
- **Monochrome Design**: Clean, professional interface using shadcn/ui components
- **Receipt Previews**: Visual receipt previews for all sections

## System Overview

### 👨‍💼 Waiter Dashboard
- Table management with visual status indicators
- Menu item selection and order creation
- Real-time order management
- Bluetooth printer connectivity for kitchen orders
- Send orders to kitchen (auto-print) or billing

### 🏢 Admin Dashboard
- Billing and payment processing
- Revenue tracking and analytics
- Bill management (pending/processed/cancelled)
- Customer information collection
- Bluetooth printer connectivity for receipts
- Receipt generation and printing

### ⚙️ Settings Dashboard
- Printer management and configuration
- Bluetooth device pairing
- Database management tools
- System status monitoring
- Sample data seeding

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Icons**: Lucide React (no emojis, as requested)
- **Database**: Convex (real-time ORM)
- **Printer Connectivity**: Web Bluetooth API

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Modern browser with Bluetooth support (Chrome, Edge)
- Bluetooth thermal printer (for physical printing)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up Convex database**:
```bash
npx convex dev
```
This will create your Convex project and update your `.env.local` file with the deployment URL.

3. **Seed the database with sample data**:
- Go to Settings dashboard → Database Management
- Click "Seed Database" to add sample menu items and tables

4. **Start the development server**:
```bash
npm run dev
```

5. **Access the system**:
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Initial Setup
1. Start the application and navigate to the **Settings** dashboard
2. Click "Seed Database" to populate with sample menu items and tables
3. Set up printer connections in the printer management section

### Waiter Workflow
1. Switch to **Waiter** dashboard
2. Connect to kitchen printer via Bluetooth
3. Select a table from the grid
4. Add menu items to create an order
5. Choose to either:
   - **Send to Kitchen**: Prints order receipt to kitchen printer
   - **Send to Billing**: Creates a bill for admin processing

### Admin Workflow
1. Switch to **Admin** dashboard
2. Connect to billing printer via Bluetooth
3. View pending bills from waiters
4. Process payments by:
   - Selecting payment method (Cash, Card, UPI)
   - Adding customer information (optional)
   - Generating and printing receipt

### Kitchen Workflow
- **No digital interface required**
- Orders automatically print to kitchen printer when sent by waiters
- Receipts show: Table number, date/time, item names, and quantities

## Printer Setup

### Supported Printers
- Mini Portable Inkless Thermal Printers
- Any Bluetooth-enabled thermal printer with standard ESC/POS commands

### Connection Steps
1. Turn on your thermal printer
2. Enable Bluetooth pairing mode
3. In the app, click "Connect" for the relevant printer type
4. Select your printer from the browser's Bluetooth device list
5. Test the connection with a sample print

### Troubleshooting
- Ensure your browser supports Web Bluetooth API
- Make sure the printer is in pairing mode
- Check that the printer supports Bluetooth connectivity
- Try refreshing the page if connection fails

## Database Schema

### Tables
- `tables`: Restaurant table management
- `menuItems`: Menu items with categories and pricing
- `orders`: Customer orders with items and status
- `bills`: Generated bills for payment processing
- `printers`: Printer connection management

### Real-time Features
- Order status updates
- Bill creation notifications
- Table occupation status
- Live revenue tracking

## Development

### Project Structure
```
├── app/                    # Next.js app router
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── AdminDashboard.tsx
│   ├── WaiterDashboard.tsx
│   ├── SettingsDashboard.tsx
│   ├── Navigation.tsx
│   └── ReceiptPreview.tsx
├── convex/               # Database functions
│   ├── schema.ts         # Database schema
│   ├── orders.ts         # Order management
│   ├── bills.ts          # Billing functions
│   ├── menu.ts           # Menu management
│   └── tables.ts         # Table management
└── lib/                  # Utility functions
```

### Adding New Features
1. Update the Convex schema if needed
2. Create database functions in the `convex/` directory
3. Add UI components using shadcn/ui
4. Use Lucide React icons (no emojis)
5. Maintain the monochrome design aesthetic

## Support

For issues or questions:
- Check the troubleshooting section
- Review the Convex documentation
- Ensure printer compatibility

## License

This project is created for restaurant management purposes.