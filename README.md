# Digital Pharma Management System - Migration Project

## 🎯 Project Overview

**Project Name:** Digital Pharma Solution v2.0  
**Migration Type:** Full Stack Modernization  
**Current Stack:** PHP/Laravel + MySQL + Basic HTML/CSS/JS + XAMPP  
**Target Stack:** React + Tailwind CSS + Inertia.js + Laravel Breeze + MongoDB

---

## 📊 Current System Analysis

### Database Structure (MySQL)

#### Core Tables & Purpose

**1. Users & Authentication**
- `users` - Admin/staff accounts with role-based access
- `customers` - Customer accounts with status management (active/restricted/deactivated)
- `customers_chat` - Customer online status tracking

**2. Products & Inventory** ⭐ **KEY ARCHITECTURE**
- `products` - **Product master data** (product information, metadata)
  - Contains: product_code, name, generic_name, manufacturer, type, classification
  - `stock_quantity` - **Aggregate total** from all batches (denormalized for performance)
  - `reorder_level` - Threshold for low stock alerts
  
- `product_batches` - **Inventory management** (actual stock tracking)
  - Each batch represents a shipment received with its own:
    - `batch_number` - Unique identifier
    - `expiration_date` - Batch-specific expiry
    - `quantity_received` - Initial quantity
    - `quantity_remaining` - Current available stock
    - `unit_cost` & `sale_price` - Batch-specific pricing
  - **FIFO Logic:** Oldest batches (by expiration_date) sold first
  - Multiple batches per product for different expiry dates/suppliers

- `stock_movements` - Transaction audit trail
  - Types: purchase, sale, pos_transaction, stock_addition, manual
  - Links to batches for granular tracking

**3. Orders & Sales**
- `prescriptions` - Customer prescription uploads with duplicate detection
  - Encrypted file storage
  - OCR text extraction (`extracted_text`)
  - Duplicate detection via file_hash and perceptual_hash
  - QR code generation for tracking
  - Types: prescription, online_order
  
- `orders` - Order management linking prescriptions
- `order_items` - Products in each order
- `prescription_items` - Approved items with batch assignment
- `sales` - Completed transactions
- `sale_items` - Products sold in each transaction
- `cancelled_orders` - Cancelled order records with reasons

**4. POS System**
- `pos_transactions` - Walk-in/regular customer sales
- `pos_transaction_items` - Items in each POS transaction
- Payment methods: cash, card, gcash

**5. Communication**
- `conversations` - Chat threads between customers and admin
- `chat_messages` - Messages with file attachments support
- `conversation_participants` - Participant tracking with read status
- `message_attachments` - File metadata for chat attachments

**6. Notifications**
- `notifications` - Admin notifications
- `customer_notifications` - Customer-specific alerts
- Types: order_received, order_ready, low_stock, expiring_products

**7. Supporting Tables**
- `suppliers` - Supplier information
- `categories` - Product categorization
- `reorder_flags` - Low stock tracking

---

## 🏗️ Migration Architecture

### MongoDB Collections Design

#### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // hashed
  role: "admin|staff|customer",
  
  // Profile info
  name: String,
  phone: String,
  address: {
    street: String,
    city: String,
    province: String,
    postal_code: String
  },
  birthdate: Date,
  sex: "male|female|other",
  
  // Status management
  status: "active|restricted|deactivated|deleted",
  status_changed_at: Date,
  auto_restore_at: Date, // For temporary restrictions
  
  // Metadata
  email_verified_at: Date,
  last_login: Date,
  created_at: Date,
  updated_at: Date
}
```

#### 2. Products Collection ⭐ **CRITICAL**
```javascript
{
  _id: ObjectId,
  product_code: String, // unique
  product_name: String,
  generic_name: String,
  brand_name: String,
  manufacturer: String,
  
  // Classification
  product_type: "OTC|Prescription",
  form_type: "Tablet|Capsule|Syrup|Injection",
  dosage_unit: "500mg|250mg|etc",
  classification: String, // Drug classification (1-11)
  category_id: ObjectId, // Reference to categories
  
  // Supplier info
  supplier_id: ObjectId,
  
  // Stock tracking (DENORMALIZED - for quick lookups)
  stock_quantity: Number, // Sum of all batch quantities
  reorder_level: Number,
  unit: "piece|box|bottle",
  unit_quantity: Decimal, // Items per unit
  
  // Batches (EMBEDDED - core inventory data)
  batches: [{
    _id: ObjectId,
    batch_number: String,
    expiration_date: Date,
    quantity_received: Number,
    quantity_remaining: Number, // Current stock
    unit_cost: Decimal,
    sale_price: Decimal,
    received_date: Date,
    supplier_id: ObjectId,
    notes: String,
    expiration_notification_sent_at: Date,
    created_at: Date,
    updated_at: Date
  }],
  
  // Alerts
  notification_sent_at: Date, // Last low stock alert
  storage_requirements: String,
  
  // Metadata
  created_at: Date,
  updated_at: Date
}

// Indexes for performance
db.products.createIndex({ product_code: 1 }, { unique: true })
db.products.createIndex({ stock_quantity: 1 }) // Low stock queries
db.products.createIndex({ "batches.expiration_date": 1 }) // Expiry tracking
db.products.createIndex({ "batches.quantity_remaining": 1 })
```

**Why Embed Batches?**
- Batches are always queried WITH products (never standalone)
- FIFO operations need quick access to all batches
- Average 3-10 batches per product (manageable size)
- Reduces joins/lookups in inventory operations

#### 3. Stock Movements Collection
```javascript
{
  _id: ObjectId,
  product_id: ObjectId,
  batch_id: ObjectId, // Reference to batch within product
  
  // Movement details
  type: "purchase|sale|pos_transaction|stock_addition|adjustment",
  quantity: Number, // Negative for outgoing
  
  // Reference to source transaction
  reference_type: "sale|pos_transaction|purchase|manual",
  reference_id: ObjectId,
  
  // Audit trail
  notes: String,
  performed_by: ObjectId, // User who made the change
  timestamp: Date,
  created_at: Date
}

// Indexes
db.stock_movements.createIndex({ product_id: 1, timestamp: -1 })
db.stock_movements.createIndex({ batch_id: 1 })
```

#### 4. Prescriptions Collection
```javascript
{
  _id: ObjectId,
  prescription_number: String, // e.g., "RX00001"
  customer_id: ObjectId,
  
  // File information
  file_path: String, // Encrypted file path
  original_filename: String,
  file_mime_type: String,
  file_size: Number,
  is_encrypted: Boolean,
  
  // Duplicate detection
  file_hash: String, // SHA-256 of file
  perceptual_hash: String, // For image similarity
  duplicate_check_status: "pending|verified|duplicate|suspicious",
  duplicate_of_id: ObjectId, // If duplicate
  similarity_score: Decimal,
  duplicate_checked_at: Date,
  
  // OCR extracted data
  extracted_text: String,
  doctor_name: String,
  prescription_issue_date: Date,
  prescription_expiry_date: Date,
  
  // Order info
  order_type: "prescription|online_order",
  status: "pending|approved|partially_approved|declined|completed|cancelled",
  mobile_number: String,
  notes: String,
  admin_message: String,
  
  // Items (can be embedded since they're small)
  items: [{
    product_id: ObjectId,
    product_name: String, // Denormalized
    batch_id: ObjectId,
    quantity: Number,
    unit_price: Decimal,
    status: "available|out_of_stock"
  }],
  
  // QR code for tracking
  qr_code_path: String,
  token: String, // Unique tracking token
  
  // Timestamps
  created_at: Date,
  updated_at: Date,
  completed_at: Date
}

// Indexes
db.prescriptions.createIndex({ token: 1 }, { unique: true })
db.prescriptions.createIndex({ customer_id: 1, status: 1 })
db.prescriptions.createIndex({ file_hash: 1 })
db.prescriptions.createIndex({ perceptual_hash: 1 })
db.prescriptions.createIndex({ extracted_text: "text" }) // Full-text search
```

#### 5. Orders Collection
```javascript
{
  _id: ObjectId,
  order_id: String, // e.g., "RX00001", "OD00143"
  prescription_id: ObjectId, // Reference to prescription
  customer_id: ObjectId,
  
  // Order details
  items: [{
    product_id: ObjectId,
    product_name: String,
    brand_name: String,
    batch_id: ObjectId,
    quantity: Number,
    unit_price: Decimal,
    subtotal: Decimal,
    available: Boolean
  }],
  
  // Totals
  subtotal: Decimal,
  tax_amount: Decimal,
  discount_amount: Decimal,
  total_amount: Decimal,
  
  // Status tracking
  status: "pending|approved|partially_approved|cancelled|completed",
  payment_method: "cash|card|gcash|online",
  payment_status: "pending|paid|refunded",
  
  // Timestamps
  created_at: Date,
  updated_at: Date,
  completed_at: Date,
  cancelled_at: Date,
  cancellation_reason: String
}

// Indexes
db.orders.createIndex({ order_id: 1 }, { unique: true })
db.orders.createIndex({ customer_id: 1, status: 1 })
db.orders.createIndex({ prescription_id: 1 })
```

#### 6. POS Transactions Collection
```javascript
{
  _id: ObjectId,
  transaction_id: String, // e.g., "TXN-20250903-0001"
  
  // Customer info
  customer_type: "walk_in|regular",
  customer_id: ObjectId, // If regular customer
  customer_name: String,
  
  // Items
  items: [{
    product_id: ObjectId,
    product_name: String,
    brand_name: String,
    batch_id: ObjectId, // For inventory tracking
    quantity: Number,
    unit_price: Decimal,
    total_price: Decimal
  }],
  
  // Pricing
  subtotal: Decimal,
  tax_amount: Decimal,
  discount_amount: Decimal,
  total_amount: Decimal,
  amount_paid: Decimal,
  change_amount: Decimal,
  
  // Payment
  payment_method: "cash|card|gcash",
  status: "completed|cancelled|refunded",
  
  // Metadata
  notes: String,
  processed_by: ObjectId, // Admin/staff who processed
  created_at: Date,
  updated_at: Date
}

// Indexes
db.pos_transactions.createIndex({ transaction_id: 1 }, { unique: true })
db.pos_transactions.createIndex({ created_at: -1 }) // Recent transactions
db.pos_transactions.createIndex({ customer_id: 1 })
```

#### 7. Conversations Collection (Chat System)
```javascript
{
  _id: ObjectId,
  customer_id: ObjectId,
  admin_id: ObjectId, // Assigned admin
  
  title: String,
  type: "prescription_inquiry|order_concern|general_support|complaint|product_inquiry",
  status: "active|resolved|closed|pending",
  priority: "normal|high|urgent",
  
  // Messages (embedded - chat history is accessed together)
  messages: [{
    _id: ObjectId,
    sender_type: "admin|customer",
    sender_id: ObjectId,
    message: String,
    message_type: "text|file|image|system",
    
    // Attachments
    attachments: [{
      file_name: String,
      file_path: String,
      file_size: Number,
      file_type: String,
      mime_type: String
    }],
    
    is_read: Boolean,
    is_internal_note: Boolean, // Admin-only notes
    timestamp: Date
  }],
  
  // Participants tracking
  participants: [{
    user_id: ObjectId,
    user_type: "admin|customer",
    last_read_message_id: ObjectId,
    joined_at: Date,
    left_at: Date
  }],
  
  last_message_at: Date,
  created_at: Date,
  updated_at: Date
}

// Indexes
db.conversations.createIndex({ customer_id: 1, status: 1 })
db.conversations.createIndex({ admin_id: 1 })
db.conversations.createIndex({ last_message_at: -1 })
```

#### 8. Notifications Collection
```javascript
{
  _id: ObjectId,
  recipient_id: ObjectId,
  recipient_type: "admin|customer",
  
  // Notification content
  title: String,
  message: String,
  type: "order_received|order_ready|low_stock|expiring_products|new_message",
  
  // Reference data
  reference_type: "order|prescription|product|conversation",
  reference_id: ObjectId,
  data: Object, // Additional context (flexible)
  
  // Status
  is_read: Boolean,
  read_at: Date,
  
  created_at: Date,
  updated_at: Date
}

// Indexes
db.notifications.createIndex({ recipient_id: 1, is_read: 1, created_at: -1 })
db.notifications.createIndex({ recipient_id: 1, type: 1 })
```

#### 9. Suppliers Collection
```javascript
{
  _id: ObjectId,
  name: String,
  contact_person: String,
  phone: String,
  email: String,
  address: String,
  
  // Performance metrics
  total_orders: Number,
  on_time_delivery_rate: Decimal,
  
  created_at: Date,
  updated_at: Date
}
```

#### 10. Categories Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  created_at: Date,
  updated_at: Date
}
```

---

## 🔄 Migration Strategy

### Phase 1: Data Migration Script

**Migration Order (Important for foreign keys):**
1. Categories
2. Suppliers
3. Users (admin + customers)
4. Products (without batches)
5. Product Batches (embedded in products)
6. Prescriptions
7. Orders
8. POS Transactions
9. Conversations + Messages
10. Notifications
11. Stock Movements

**Key Transformations:**

**Products + Batches:**
```javascript
// MySQL to MongoDB transformation
const mysqlProduct = await mysql.query('SELECT * FROM products WHERE id = ?', [productId]);
const mysqlBatches = await mysql.query('SELECT * FROM product_batches WHERE product_id = ?', [productId]);

const mongoProduct = {
  _id: new ObjectId(),
  product_code: mysqlProduct.product_code,
  product_name: mysqlProduct.product_name,
  // ... other fields
  stock_quantity: mysqlProduct.stock_quantity, // Denormalized total
  batches: mysqlBatches.map(batch => ({
    _id: new ObjectId(),
    batch_number: batch.batch_number,
    expiration_date: new Date(batch.expiration_date),
    quantity_received: batch.quantity_received,
    quantity_remaining: batch.quantity_remaining,
    // ... other batch fields
  }))
};

await mongodb.collection('products').insertOne(mongoProduct);
```

**Stock Movements:**
```javascript
// Keep batch_id as reference to embedded batch
const movement = {
  product_id: productObjectId,
  batch_id: batchObjectId, // Points to batch within product.batches array
  type: 'sale',
  quantity: -5,
  reference_type: 'sale',
  reference_id: saleObjectId
};
```

### Phase 2: Application Layer

**Inventory Operations (FIFO):**
```javascript
// Example: Process sale with FIFO batch selection
async function processSale(productId, quantityNeeded) {
  const product = await Product.findById(productId);
  
  // Sort batches by expiration date (FIFO)
  const availableBatches = product.batches
    .filter(b => b.quantity_remaining > 0 && b.expiration_date > new Date())
    .sort((a, b) => a.expiration_date - b.expiration_date);
  
  let remaining = quantityNeeded;
  const usedBatches = [];
  
  for (const batch of availableBatches) {
    if (remaining <= 0) break;
    
    const takeFromBatch = Math.min(batch.quantity_remaining, remaining);
    batch.quantity_remaining -= takeFromBatch;
    remaining -= takeFromBatch;
    
    usedBatches.push({
      batch_id: batch._id,
      quantity: takeFromBatch,
      unit_price: batch.sale_price
    });
    
    // Record stock movement
    await StockMovement.create({
      product_id: productId,
      batch_id: batch._id,
      type: 'sale',
      quantity: -takeFromBatch
    });
  }
  
  // Update denormalized stock_quantity
  product.stock_quantity -= quantityNeeded;
  await product.save();
  
  return usedBatches;
}
```

---

## 🎯 Implementation Roadmap

### Week 1-2: Foundation
- [ ] Setup Laravel 11 + Breeze + React + Inertia
- [ ] Configure MongoDB connection
- [ ] Create MongoDB models with proper schemas
- [ ] Build authentication system
- [ ] Setup development environment

### Week 3-4: Data Migration
- [ ] Write MySQL to MongoDB migration scripts
- [ ] Test data integrity
- [ ] Migrate users and authentication
- [ ] Migrate products with embedded batches
- [ ] Migrate orders and prescriptions
- [ ] Verify relationships

### Week 5-6: Core Modules (Backend)
- [ ] Product management API with batch operations
- [ ] Inventory management with FIFO logic
- [ ] Order processing system
- [ ] POS transaction handling
- [ ] Prescription upload with OCR
- [ ] Duplicate detection system

### Week 7-8: Frontend Development
- [ ] Admin dashboard with real-time stats
- [ ] Product management UI
- [ ] Inventory monitoring with alerts
- [ ] POS interface
- [ ] Order management
- [ ] Customer portal
- [ ] Chat system interface

### Week 9: Integration & Polish
- [ ] Real-time notifications (Laravel Echo + Pusher)
- [ ] File upload and encryption
- [ ] QR code generation
- [ ] Reports and analytics
- [ ] Search and filtering

### Week 10: Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production deployment

---

## 🔑 Key Features to Implement

### 1. Intelligent Inventory Management
- **FIFO Batch Selection:** Automatic oldest-batch-first deduction
- **Multi-batch Products:** Handle products from different suppliers/dates
- **Low Stock Alerts:** Automated notifications when below reorder level
- **Expiry Tracking:** Alert for products nearing expiration
- **Stock Movement Audit:** Complete transaction history

### 2. Prescription Processing
- **File Upload:** Secure encrypted storage
- **OCR Extraction:** Automatic text extraction from images
- **Duplicate Detection:** 
  - File hash comparison
  - Perceptual hash for image similarity
  - Warn customers of potential duplicates
- **QR Code Tracking:** Generate unique QR codes
- **Status Workflow:** pending → approved → completed

### 3. POS System
- **Quick Product Search:** Barcode/name search
- **Cart Management:** Add/remove items
- **Multiple Payment Methods:** Cash, Card, GCash
- **Receipt Generation:** Print/download receipts
- **Walk-in vs Regular Customers**

### 4. Real-time Chat
- **Customer Support:** Direct messaging
- **File Attachments:** Images, PDFs
- **Read Receipts:** Track message status
- **Typing Indicators**
- **Admin Assignment:** Assign conversations to staff

### 5. Analytics & Reporting
- **Sales Reports:** Daily, weekly, monthly
- **Inventory Reports:** Stock levels, movements
- **Expiring Products:** Products near expiration
- **Low Stock Items:** Below reorder level
- **Top Products:** Best sellers
- **Export:** PDF and Excel

---

## 🔧 Technical Considerations

### MongoDB Best Practices

**1. Denormalization Strategy:**
- Embed batches in products (1-to-few relationship)
- Store product names in orders/sales (read optimization)
- Keep stock_quantity in products (avoid recalculation)

**2. Indexing Strategy:**
```javascript
// Critical indexes for performance
db.products.createIndex({ stock_quantity: 1 })
db.products.createIndex({ "batches.expiration_date": 1, "batches.quantity_remaining": 1 })
db.orders.createIndex({ customer_id: 1, status: 1, created_at: -1 })
db.prescriptions.createIndex({ token: 1 }, { unique: true })
db.prescriptions.createIndex({ file_hash: 1 })
db.stock_movements.createIndex({ product_id: 1, timestamp: -1 })
```

**3. Transaction Support:**
```javascript
// Use MongoDB transactions for inventory operations
const session = await mongoose.startSession();
session.startTransaction();
try {
  await processSale(productId, quantity, { session });
  await createOrder(orderData, { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Performance Optimization

**1. Batch Operations:**
- Process multiple stock movements in single transaction
- Bulk update for notifications
- Aggregate pipeline for reports

**2. Caching Strategy:**
- Cache dashboard stats (Redis)
- Cache product search results
- Cache low stock/expiring products list

**3. File Handling:**
- Store files in S3/local storage
- Keep only paths in MongoDB
- Lazy load images
- Generate thumbnails for prescriptions

### Security Measures

**1. File Upload:**
- Validate file types
- Scan for malware
- Encrypt sensitive files
- Generate unique filenames

**2. Authentication:**
- JWT tokens
- Role-based access control
- Password hashing (bcrypt)
- Session management

**3. Data Protection:**
- Encrypt customer data
- Secure file storage
- Audit trail for sensitive operations
- Rate limiting

---

## 📝 Migration Checklist

### Pre-Migration
- [x] Document current database schema
- [x] Design MongoDB collections
- [x] Plan data transformation logic
- [ ] Setup backup strategy
- [ ] Create rollback plan

### During Migration
- [ ] Export MySQL data to JSON
- [ ] Transform and validate data
- [ ] Import to MongoDB
- [ ] Verify data integrity
- [ ] Test relationships
- [ ] Validate business logic

### Post-Migration
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Train admin users
- [ ] Monitor system metrics
- [ ] Gather feedback

---

## 🚀 Next Steps

1. **Review this document** with the development team
2. **Setup development environment** following Week 1 tasks
3. **Start with migration script** for products + batches
4. **Build inventory management** module first (most critical)
5. **Iterative development** - deploy and test each module

---

## 📞 Support & Resources

**Documentation:**
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Laravel MongoDB](https://www.mongodb.com/docs/drivers/php/laravel-mongodb/)
- [Inertia.js Guide](https://inertiajs.com/)
- [React Documentation](https://react.dev/)

**Key Dependencies:**
```json
{
  "php": "^8.2",
  "laravel/framework": "^11.0",
  "laravel/breeze": "^2.0",
  "mongodb/laravel-mongodb": "^4.0",
  "inertiajs/inertia-laravel": "^1.0",
  "react": "^18.0",
  "tailwindcss": "^3.4"
}
```

---

**Last Updated:** November 25, 2025  
**Version:** 1.0.0  
**Author:** Development Team
# dpharmasmdb
# dpharmasmdb
# dpharmasmdb
# dpharmasmdb
