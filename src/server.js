const dotenv = require("dotenv");

// Load environment variables first, before other imports
dotenv.config();

const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const errorHandler = require("./middleware/errorHandler");
const fs = require("fs-extra");

// Import routes
const authRoutes = require("./routes/authRoutes");
const addressRoutes = require("./routes/addressRoutes");
const profileRoutes = require("./routes/profileRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const menuItemRoutes = require("./routes/menuItemRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const RestaurantOrderRoutes = require("./routes/RestaurantOrderRoutes");

// Create express app
const app = express();

// Create uploads directory if it doesn't exist
fs.ensureDirSync('uploads');

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Add debugging middleware to log all requests
app.use((req, res, next) => {
  console.log('Request URL:', req.originalUrl);
  console.log('Request Method:', req.method);
  console.log('Request Headers:', JSON.stringify(req.headers));
  next();
});

// Session middleware
app.use(
  session({
    secret: process.env.JWT_ACCESS_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  })
);

// Define a simple route for testing
app.get('/', (req, res) => {
  res.json({ message: "Welcome to zomato clone API" });
});

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/orders", orderRoutes);

// Custom route handler for the specific URL pattern the user is trying to access
app.put("/api/v1/restaurants/:restaurantId/:menuItemId/bulk-update", (req, res, next) => {
  console.log('Custom route handler triggered');
  // Modify the URL to match the expected pattern
  req.url = `/api/v1/restaurants/${req.params.restaurantId}/menu-items/bulk-update`;
  // Forward to the regular route handler
  next();
});

// Nested routes for menu items and categories
app.use("/api/v1/restaurants/:restaurantId/menu-items", menuItemRoutes);
app.use("/api/v1/restaurants/:restaurantId/categories", categoryRoutes); 
app.use("/api/v1/restaurants/:restaurantId/orders", RestaurantOrderRoutes);

// Error handler middleware
app.use(errorHandler);

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error("Unhandled Promise Rejection: ", err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});