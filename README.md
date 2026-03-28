# EverTrend - Scalable MERN Stack E-commerce Platform

A production-ready thrift clothing e-commerce platform built with MongoDB, Express.js, React, and Node.js.

## Features

- **User Management**: Role-based authentication (Admin, Seller, Buyer)
- **Product Management**: CRUD operations with search, filtering, and pagination
- **Order Processing**: Complete order management with payment simulation
- **Virtual Try-On**: AI-powered fit recommendation based on user measurements
- **Social Features**: Product likes, reviews, and seller following
- **Dashboards**: Separate dashboards for Buyers, Sellers, and Admins
- **Scalability**: Node.js clustering support for horizontal scaling

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcrypt for password hashing
- Express Validator for input validation

### Frontend
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Vite as build tool

## Project Structure

```
evertrend/
├── backend/
│   ├── config/          # Database configuration
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Auth and error handling
│   ├── services/        # Business logic (payment, fit recommendation)
│   ├── utils/           # Helper functions
│   ├── server.js        # Express server
│   └── cluster.js       # Clustering support
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context (Auth)
│   │   ├── utils/       # API utilities
│   │   └── App.jsx      # Main app component
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
CLUSTER_WORKERS=4

# Email Configuration (Required for OTP verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_FROM=noreply@evertrend.com
EMAIL_FROM_NAME=EverTrend
FRONTEND_URL=http://localhost:3000
```

**Important for Email Setup:**
- For Gmail: You must use an **App Password**, not your regular password
  1. Go to Google Account > Security > 2-Step Verification
  2. Generate an App Password
  3. Use that App Password in `EMAIL_PASS`
- For other email providers, adjust `EMAIL_HOST` accordingly (e.g., `smtp.sendgrid.net` for SendGrid)

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start

# With clustering
npm run cluster
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` and proxy API requests to `http://localhost:5000`.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Seller/Admin)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/like` - Like/Unlike product

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status

### Reviews
- `GET /api/reviews/product/:productId` - Get product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Fit Recommendation
- `POST /api/fit-recommendation/:productId` - Get fit recommendation

## Database Schema

- **User**: username, email, password, role, sizeProfile, followers, following
- **Product**: name, description, price, sellerId, category, size, condition, images, dimensions, likes
- **Order**: userId, totalAmount, status, paymentMethod, transactionId
- **OrderItem**: orderId, productId, quantity, unitPrice
- **Review**: userId, productId, rating, comment
- **Conversation**: participants, productId, lastMessageTimestamp
- **Message**: conversationId, senderId, content, timestamp

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation with express-validator
- Ownership verification for resource access

## Scalability Features

- Node.js clustering for multi-core utilization
- MongoDB indexing for optimized queries
- Modular backend architecture
- RESTful API design
- Efficient pagination

## Mock Services

### Payment Service (eSewa)
- Simulates payment processing with delay
- Returns mock transaction ID

### Fit Recommendation Service
- Calculates fit percentage based on user measurements and product dimensions
- Provides breakdown by shoulder, chest, and length

## Development Notes

- The application uses ES6 modules (type: "module")
- Frontend uses Vite for fast development
- Tailwind CSS for utility-first styling
- All API routes are RESTful and follow standard conventions

## License

ISC

# evertrend
