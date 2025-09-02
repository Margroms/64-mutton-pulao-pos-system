# Restaurant POS System Specifications

## System Overview
A comprehensive Point of Sale (POS) system for restaurants with role-based access control for waiters, kitchen staff, and administrators. The system integrates with KOT (Kitchen Order Ticket) billing generation and provides real-time order management.

## Technology Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Convex DB with Convex ORM
- **Real-time**: Convex real-time subscriptions
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: Convex state management
- **Authentication**: Convex Auth or NextAuth.js

## System Architecture

### Core Components
1. **Authentication & Authorization System**
2. **Real-time Order Management**
3. **Table Management System**
4. **Menu Management System**
5. **Billing & KOT Integration**
6. **Reporting & Analytics**
7. **Real-time Notifications**

## User Roles & Permissions

### 1. Waiter Role
**Permissions:**
- View assigned tables
- Add/remove items from orders
- Submit orders to kitchen
- Generate bills
- View order status
- Basic table information

**Interface Features:**
- Table grid view
- Order management panel
- Item selection from menu
- Order submission
- Bill generation
- Real-time order status updates

### 2. Kitchen Role
**Permissions:**
- View incoming orders (KOT)
- Update order status
- Mark orders as completed
- View order queue

**Interface Features:**
- Order queue display
- Order status management
- KOT printing integration
- Real-time order notifications

### 3. Admin Role
**Permissions:**
- Full system access
- Menu management
- Table management
- User management
- Reports and analytics
- System configuration

**Interface Features:**
- Dashboard with real-time metrics
- Menu CRUD operations
- Table arrangement management
- Comprehensive reporting
- User role management

## Database Schema (Convex ORM)

### Tables

#### 1. Users
```typescript
interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  role: "waiter" | "kitchen" | "admin";
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### 2. Tables
```typescript
interface Table {
  _id: Id<"tables">;
  tableNumber: number;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  position: { x: number; y: number };
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### 3. Menu Categories
```typescript
interface MenuCategory {
  _id: Id<"menuCategories">;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}
```

#### 4. Menu Items
```typescript
interface MenuItem {
  _id: Id<"menuItems">;
  name: string;
  description?: string;
  price: number;
  categoryId: Id<"menuCategories">;
  isAvailable: boolean;
  preparationTime: number; // in minutes
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

#### 5. Orders
```typescript
interface Order {
  _id: Id<"orders">;
  tableId: Id<"tables">;
  waiterId: Id<"users">;
  status: "pending" | "confirmed" | "preparing" | "ready" | "served" | "cancelled";
  items: OrderItem[];
  totalAmount: number;
  taxAmount: number;
  finalAmount: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
  preparedAt?: number;
  servedAt?: number;
}
```

#### 6. Order Items
```typescript
interface OrderItem {
  itemId: Id<"menuItems">;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  status: "pending" | "preparing" | "ready";
}
```

#### 7. Bills
```typescript
interface Bill {
  _id: Id<"bills">;
  orderId: Id<"orders">;
  tableId: Id<"tables">;
  waiterId: Id<"users">;
  billNumber: string;
  items: BillItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: "cash" | "card" | "upi" | "other";
  paymentStatus: "pending" | "paid" | "cancelled";
  createdAt: number;
  paidAt?: number;
}
```

#### 8. Bill Items
```typescript
interface BillItem {
  itemId: Id<"menuItems">;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

## API Endpoints (Convex Functions)

### Authentication
- `auth.login`
- `auth.logout`
- `auth.register`
- `auth.getCurrentUser`

### Tables
- `tables.getAll`
- `tables.getById`
- `tables.create`
- `tables.update`
- `tables.delete`
- `tables.updateStatus`
- `tables.rearrange`

### Menu
- `menu.getCategories`
- `menu.getItems`
- `menu.createItem`
- `menu.updateItem`
- `menu.deleteItem`
- `menu.createCategory`
- `menu.updateCategory`
- `menu.deleteCategory`

### Orders
- `orders.create`
- `orders.getByTable`
- `orders.getByStatus`
- `orders.updateStatus`
- `orders.addItems`
- `orders.removeItems`
- `orders.cancel`
- `orders.getKitchenQueue`

### Bills
- `bills.generate`
- `bills.getByOrder`
- `bills.updatePaymentStatus`
- `bills.getByDateRange`

### Reports
- `reports.daily`
- `reports.monthly`
- `reports.yearly`
- `reports.topSellingItems`
- `reports.tablePerformance`

## User Interface Specifications

### 1. Waiter Interface

#### Table Grid View
- Visual table arrangement
- Color-coded table status
- Click to select table
- Real-time status updates

#### Order Management
- Item selection from categorized menu
- Quantity adjustment
- Special instructions/notes
- Order preview before submission
- Real-time order status

#### Bill Generation
- Order summary
- Tax calculation
- Payment method selection
- Receipt printing
- KOT generation

### 2. Kitchen Interface

#### Order Queue
- Real-time incoming orders
- Order priority indicators
- Preparation time estimates
- Status update buttons
- KOT integration

#### Order Details
- Item breakdown
- Special instructions
- Table information
- Waiter contact

### 3. Admin Interface

#### Dashboard
- Real-time metrics
- Today's orders count
- Revenue overview
- Popular items
- Table occupancy status

#### Menu Management
- Category CRUD
- Item CRUD with image upload
- Price management
- Availability toggle
- Bulk operations

#### Table Management
- Visual table arrangement
- Drag & drop positioning
- Capacity settings
- Status management

#### Reports
- Daily/Monthly/Yearly summaries
- Revenue analysis
- Item performance
- Table utilization
- Export functionality

## Real-time Features

### 1. Order Notifications
- Toast notifications for new orders
- Real-time order status updates
- Kitchen order alerts
- Table status changes

### 2. Live Updates
- Table occupancy changes
- Order queue updates
- Menu availability changes
- Revenue updates

## KOT Integration

### 1. Kitchen Order Ticket
- Automatic generation on order submission
- Real-time printing
- Order details and special instructions
- Table and waiter information

### 2. Billing Integration
- Seamless order to bill conversion
- Multiple payment methods
- Receipt generation
- Payment status tracking

## Security & Performance

### 1. Authentication
- Role-based access control
- Session management
- Secure API endpoints
- Password policies

### 2. Data Validation
- Input sanitization
- Type checking
- Business rule validation
- Error handling

### 3. Performance
- Real-time subscriptions optimization
- Pagination for large datasets
- Image optimization
- Caching strategies

## Reporting & Analytics

### 1. Daily Reports
- Orders count
- Revenue summary
- Popular items
- Table performance

### 2. Monthly Reports
- Trend analysis
- Comparative metrics
- Growth indicators
- Seasonal patterns

### 3. Yearly Reports
- Annual performance
- Year-over-year comparison
- Strategic insights
- Forecasting data

### 4. Top Selling Items
- Item popularity ranking
- Revenue contribution
- Seasonal trends
- Inventory insights

## Deployment & Infrastructure

### 1. Environment
- Development
- Staging
- Production

### 2. Hosting
- Vercel (Frontend)
- Convex Cloud (Backend)
- Image CDN

### 3. Monitoring
- Error tracking
- Performance monitoring
- User analytics
- System health checks

## Development Phases

### Phase 1: Core Setup
- Project initialization
- Database schema setup
- Basic authentication
- Core CRUD operations

### Phase 2: Waiter Interface
- Table management
- Order creation
- Basic billing
- Real-time updates

### Phase 3: Kitchen Integration
- Order queue
- KOT generation
- Status management
- Notifications

### Phase 4: Admin Features
- Menu management
- Table arrangement
- Basic reporting
- User management

### Phase 5: Advanced Features
- Comprehensive reporting
- Analytics dashboard
- Advanced billing
- Performance optimization

### Phase 6: Testing & Deployment
- Testing and bug fixes
- Performance optimization
- Production deployment
- User training

## Success Metrics

### 1. Performance
- Order processing time < 30 seconds
- Real-time updates < 2 seconds
- System uptime > 99.9%

### 2. User Experience
- Intuitive interface design
- Minimal training required
- Error rate < 1%

### 3. Business Impact
- Reduced order errors
- Faster service
- Better inventory management
- Improved customer satisfaction

## Future Enhancements

### 1. Mobile App
- Waiter mobile interface
- Customer ordering app
- Push notifications

### 2. Advanced Analytics
- Predictive analytics
- Customer behavior analysis
- Inventory optimization

### 3. Integration
- Payment gateways
- Inventory systems
- Accounting software
- Customer loyalty programs

### 4. AI Features
- Order prediction
- Menu recommendations
- Dynamic pricing
- Customer sentiment analysis
