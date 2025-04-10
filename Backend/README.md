# MealLink - Food Delivery Backend Application

MealLink is a comprehensive backend application for an online food delivery service. The application enables restaurants to register, manage menu items, process orders, and accept payments. Customers can order food, track deliveries, and review restaurants.

## Features

- 🔐 **Authentication & Authorization**
  - User registration with phone and email verification
  - Role-based access control (Users, Restaurant Owners, Admins)
  - JWT-based authentication with session management
  - Secure password handling with bcrypt

- 🏪 **Restaurant Management**
  - Restaurant creation, update, and deletion
  - Restaurant approval workflow for admins
  - Menu and category management
  - Operating hours, features, and delivery settings

- 🛒 **Order Management**
  - Shopping cart functionality
  - Order placement and tracking
  - Order status updates in real-time
  - Restaurant order management interface

- 💳 **Payment Processing**
  - Integration with Razorpay
  - Multiple payment methods
  - Payment verification
  - Coupon and discount management

- 🧩 **Additional Features**
  - Restaurant and menu item favorites
  - Rating and review system
  - Search and filtering capabilities
  - Address management for users
  - Real-time notifications

## Technology Stack

- **Backend**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, Session management
- **Payments**: Razorpay integration
- **Storage**: Cloudinary for image uploads
- **Others**: Redis (caching), Winston (logging), Twilio/Nodemailer (OTP verification)
- **Testing**: Jest & Supertest

## Project Structure

```
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware (auth, error handling, etc.)
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Express app configuration
├── tests/
│   ├── integration/     # Integration tests
│   ├── unit/            # Unit tests
│   └── fixtures/        # Test fixtures
├── docs/                # Documentation
├── logs/                # Application logs
├── uploads/             # Storage for uploads
└── .env                 # Environment variables
```

## Setup and Installation

### Prerequisites

- Node.js (v16+)
- MongoDB
- Redis (optional, for caching)

### Installation Steps

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/meallink.git
   cd meallink
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following environment variables:
   ```
   # Server
   NODE_ENV=development
   PORT=5001
   
   # Database
   MONGO_URI=mongodb://localhost:27017/meallink
   
   # JWT
   JWT_ACCESS_SECRET=your_access_token_secret
   JWT_REFRESH_SECRET=your_refresh_token_secret
   JWT_ACCESS_EXPIRY=1h
   JWT_REFRESH_EXPIRY=7d
   
   # SMS Service (Twilio)
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   
   # Email Service
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASS=your_password
   
   # Razorpay
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Redis
   REDIS_URL=redis://localhost:6379
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. The API will be available at `http://localhost:5001`

## API Documentation

Detailed API documentation is available in the [docs/api-docs.md](docs/api-docs.md) file.

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Recent Improvements

- 🏗️ **Architectural Improvements**
  - Implemented service layer for better separation of concerns
  - Added comprehensive error handling with custom error types
  - Enhanced middleware structure for better code organization

- 🔒 **Security Enhancements**
  - Added helmet.js for security headers
  - Implemented rate limiting for API endpoints
  - Added XSS protection and HTTP parameter pollution prevention
  - Enhanced CORS configuration

- 🚀 **Performance Optimization**
  - Added Redis caching for frequently accessed data
  - Optimized database queries with better indexing
  - Implemented pagination for list endpoints
  - Added request ID for better tracing and debugging

- 📝 **Documentation & Testing**
  - Added comprehensive API documentation
  - Implemented unit tests for service layer
  - Created integration tests for API endpoints
  - Enhanced code comments and JSDoc annotations

- 📊 **Logging & Monitoring**
  - Implemented structured logging with Winston
  - Added request/response logging for debugging
  - Enhanced error logging with contextual information

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Author

MealLink Team 