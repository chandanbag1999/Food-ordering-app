const dotenv = require("dotenv");

// Load environment variables first, before other imports
dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const helmet = require("helmet");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const errorHandler = require("./middleware/errorHandler");
const fs = require("fs-extra");
const logger = require("./utils/logger");

// Import routes
const authRoutes = require("./routes/authRoutes");
const addressRoutes = require("./routes/addressRoutes");
const profileRoutes = require("./routes/profileRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const menuItemRoutes = require("./routes/menuItemRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const RestaurantOrderRoutes = require("./routes/RestaurantOrderRoutes");
const reviewRoutes = require("./routes/ReviewRoutes");
const restaurantReviewRoutes = require('./routes/restaurantReviewRoutes');
const userReviewRoutes = require("./routes/userReviewRoutes");
const favoriteRoutes = require('./routes/favoriteRoutes');
const restaurantFavoriteRoutes = require('./routes/restaurantFavoriteRoutes');
const cartRoutes = require('./routes/cartRoutes');
const couponRoutes = require('./routes/couponRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const receiptRoutes = require('./routes/receiptRoutes');

// Create express app
const app = express();

// Create uploads directory if it doesn't exist
fs.ensureDirSync('uploads');

// Add request ID to each request for better tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

// Logging middleware
app.use(logger.logRequest);
app.use(morgan('combined', { stream: logger.stream }));

// Security middleware
app.use(helmet()); // Set security headers
app.use(xssClean()); // Sanitize inputs
app.use(hpp()); // Protect against HTTP Parameter Pollution

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Improved CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || 'https://yourdomain.com' 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Custom middleware to capture raw request body - fixed to avoid stream issues
app.use((req, res, next) => {
  // Only capture raw body for specific routes that need it
  if (req.url.includes('/menu-items/') && (req.method === 'PUT' || req.method === 'POST')) {
    let rawData = '';
    
    req.on('data', chunk => {
      rawData += chunk.toString();
    });
    
    req.on('end', () => {
      req.rawBody = rawData;
      if (rawData) {
        console.log('Raw request body:', rawData);
      }
      next();
    });
  } else {
    // For other routes, just pass through
    next();
  }
});

// Middleware
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use(express.urlencoded({ extended: true }));

// Add request logging for easier debugging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
    requestId: req.id
  });
  next();
});

// Session middleware
app.use(
  session({
    secret: process.env.JWT_ACCESS_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  })
);

// Define a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Define a simple route for testing
app.get('/', (req, res) => {
  res.json({ message: "Welcome to MealLink API" });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/receipts', receiptRoutes);

// Custom route handler for the specific URL pattern the user is trying to access
app.put("/api/v1/restaurants/:restaurantId/:menuItemId/bulk-update", (req, res, next) => {
  console.log('Custom route handler triggered');
  // Modify the URL to match the expected pattern
  req.url = `/api/v1/restaurants/${req.params.restaurantId}/menu-items/bulk-update`;
  // Forward to the regular route handler
  next();
});

// Nested routes for menu items, categories, orders, and reviews, and favorites
app.use("/api/v1/restaurants/:restaurantId/menu-items", menuItemRoutes);
app.use("/api/v1/restaurants/:restaurantId/categories", categoryRoutes); 
app.use("/api/v1/restaurants/:restaurantId/orders", RestaurantOrderRoutes);
app.use('/api/v1/restaurants/:restaurantId/reviews', restaurantReviewRoutes);
app.use('/api/v1/restaurants/:restaurantId/favorites', restaurantFavoriteRoutes);
app.use('/api/v1/users/:userId/reviews', userReviewRoutes);

// Error handler middleware
app.use(errorHandler);

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Connect to MongoDB and start server only if this file is run directly (not imported as a module)
if (require.main === module) {
  const startServer = async () => {
    try {
      await connectDB();
      const PORT = process.env.PORT || 5001;
      app.listen(PORT, () => {
        logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      });
    } catch (error) {
      logger.error(`Error starting server: ${error.message}`, { stack: error.stack });
      process.exit(1);
    }
  };

  startServer();

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error("Unhandled Promise Rejection:", { error: err.message, stack: err.stack });
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error("Uncaught Exception:", { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

// Export the app for testing
module.exports = app;