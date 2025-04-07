# MearnIt - Food Delivery Platform

A food delivery platform similar to Zomato with multiple user roles and real-time tracking built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Multiple user roles (customers, restaurant owners, delivery partners)
- Restaurant management
- Menu and category management
- Order placement and tracking
- Reviews and ratings
- Favorites/bookmarks
- Cart functionality
- Coupon system
- Address management
- Profile management
- Real-time notifications

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcryptjs
- **File Upload**: Multer, Cloudinary
- **Notifications**: Nodemailer, Twilio
- **Maps & Location**: Google Maps Services

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd mearnit
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5001
   NODE_ENV=development
   MONGODB_URI=<your-mongodb-uri>
   JWT_ACCESS_SECRET=<your-jwt-secret>
   JWT_REFRESH_SECRET=<your-jwt-refresh-secret>
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   
   # Cloudinary configuration
   CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
   CLOUDINARY_API_KEY=<your-cloudinary-api-key>
   CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
   
   # Email configuration
   EMAIL_SERVICE=<email-service>
   EMAIL_USER=<your-email>
   EMAIL_PASSWORD=<your-email-password>
   
   # Twilio configuration (for SMS)
   TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
   TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
   TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
   
   # Google Maps API
   GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
   ```

4. Start the development server
   ```
   npm run dev
   ```

5. The server will be running at `http://localhost:5001`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh-token` - Refresh access token

### Restaurants
- `GET /api/v1/restaurants` - Get all restaurants
- `GET /api/v1/restaurants/:id` - Get a specific restaurant
- `POST /api/v1/restaurants` - Create a restaurant (requires authentication)
- `PUT /api/v1/restaurants/:id` - Update a restaurant
- `DELETE /api/v1/restaurants/:id` - Delete a restaurant

### Menu Items
- `GET /api/v1/restaurants/:restaurantId/menu-items` - Get all menu items for a restaurant
- `POST /api/v1/restaurants/:restaurantId/menu-items` - Add a menu item
- `PUT /api/v1/restaurants/:restaurantId/menu-items/:id` - Update a menu item
- `DELETE /api/v1/restaurants/:restaurantId/menu-items/:id` - Delete a menu item

### Orders
- `POST /api/v1/orders` - Create a new order
- `GET /api/v1/orders` - Get all orders for the current user
- `GET /api/v1/orders/:id` - Get a specific order
- `PUT /api/v1/orders/:id` - Update an order status

### Additional endpoints are available for:
- Categories
- Reviews
- User profiles
- Addresses
- Favorites
- Cart
- Coupons

## License

This project is licensed under the ISC License. 