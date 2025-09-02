# 🍽️ Restaurant POS System

A modern, real-time Point of Sale (POS) system for restaurants built with Next.js, Convex DB, and TypeScript. This system provides an intuitive interface for waiters to manage tables, take orders, and process billing efficiently.

## ✨ Features

### Core Functionality
- **Real-time Table Management** - Visual table grid with color-coded status indicators
- **Order Management** - Add items, modify quantities, and submit orders seamlessly
- **Integrated Billing System** - Generate bills with tax calculation and multiple payment methods
- **Kitchen Order Tickets (KOT)** - Real-time order notifications to kitchen staff
- **Responsive Design** - Works perfectly on tablets and mobile devices

### User Roles
- **Waiter Interface** - Table management, order taking, and billing
- **Kitchen Display** - Order queue and status management (Coming Soon)
- **Admin Panel** - Menu management, reports, and system settings (Coming Soon)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 64-pulao-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Convex Backend**
   ```bash
   npx convex dev
   ```
   Follow the prompts to create your Convex project.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Setup Initial Data**
   - Open [http://localhost:3000](http://localhost:3000)
   - Click "Setup Initial Data" to populate the database with sample tables, menu items, and users

## 📱 How to Use

### For Waiters

1. **Access Waiter Dashboard**
   - Navigate to `/waiter` or click "Access Waiter Dashboard" from the home page

2. **Managing Tables**
   - View all restaurant tables in a visual grid layout
   - Tables are color-coded:
     - 🟢 Green: Available
     - 🔴 Red: Occupied
     - 🟡 Yellow: Reserved
     - ⚫ Gray: Cleaning
   - Click on any table to select it

3. **Taking Orders**
   - Select a table and click "New Order" or "Add Items"
   - Browse menu items organized by categories
   - Add items to the order with quantity adjustments
   - Add special notes for kitchen staff
   - Submit the order - kitchen will be notified instantly

4. **Processing Bills**
   - Click "Generate Bill" for tables with active orders
   - Review order details and calculate totals
   - Select payment method (Cash, Card, UPI, Other)
   - Apply discounts if needed
   - Generate and process payment

### System Workflow

```
Table Selection → Order Creation → Kitchen Notification → Bill Generation → Payment Processing → Table Available
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Convex Database with real-time subscriptions
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: Convex real-time state
- **Notifications**: Sonner toast notifications

## 📊 Database Schema

The system uses the following main entities:

- **Users** - Waiter, Kitchen, Admin roles
- **Tables** - Restaurant table information and status
- **Menu Categories** - Organization of menu items
- **Menu Items** - Food and beverage items with pricing
- **Orders** - Customer orders with items and status
- **Bills** - Generated bills with payment information

## 🔧 Configuration

### Environment Variables
The system automatically creates the necessary environment variables in `.env.local`:
- `CONVEX_DEPLOYMENT` - Your Convex deployment identifier
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex API URL

### Customization
- Modify menu items and categories in the seed data (`convex/seedData.ts`)
- Adjust table layout and capacity as needed
- Customize tax rates in the order calculation logic

## 📈 Performance Features

- **Real-time Updates** - Instant synchronization across all devices
- **Optimistic Updates** - Responsive UI with immediate feedback
- **Efficient Queries** - Indexed database queries for fast performance
- **Caching** - Smart caching of menu items and static data

## 🚧 Upcoming Features

- **Kitchen Display System** - Real-time order queue for kitchen staff
- **Admin Dashboard** - Complete restaurant management interface
- **Advanced Reporting** - Daily, monthly, and yearly analytics
- **User Authentication** - Secure login system
- **Inventory Management** - Track ingredient availability
- **Customer Management** - Loyalty programs and customer data

## 📝 Development

### Adding New Features
1. Create new Convex functions in the `convex/` directory
2. Add corresponding React components in `app/` or `components/`
3. Update the database schema if needed in `convex/schema.ts`

### Database Migrations
Run the following to apply schema changes:
```bash
npx convex dev
```

### Building for Production
```bash
npm run build
```

## 🐛 Troubleshooting

### Common Issues

1. **"No waiter found" error**
   - Make sure you've run the initial data setup
   - Check that users exist in your Convex dashboard

2. **Real-time updates not working**
   - Verify your Convex connection in the browser console
   - Check that environment variables are properly set

3. **Orders not submitting**
   - Ensure tables and menu items exist in the database
   - Check browser console for any JavaScript errors

## 📄 License

This project is built for educational and commercial use. Feel free to modify and adapt it for your restaurant's needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

---

**Built with ❤️ for modern restaurants**
