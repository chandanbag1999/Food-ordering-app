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

// Create express app
const app = express();

// Create uploads directory if it doesn't exist
fs.ensureDirSync('uploads');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

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