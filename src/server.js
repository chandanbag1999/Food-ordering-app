const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

// Load inverment veriable
dotenv.config();

// Create express app
const app = express();


// Middleware
app.use(express.json()); // perse JSon request body
app.use(express.urlencoded({ extended: true })); // perse URL-encoded request body
app.use(cors()); // enable cors for all routes
app.use(morgan('dev')); // http request logger


// define a simple route for testing
app.get('/', (req, res)=>{
  res.json({ meassage: "Welcome to zomato clone API"});
});



// connect to MOngoDB and start server

const startServer = async () => {
  try {
    // Connect to mongoDB
    await connectDB();

    // start the server
    const PORT = process.env.PORT || 5000
    app.listen(PORT, ()=>{
      console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();



// Handle unhandled promise rejections
process.on('unhandledRejection', (err)=>{
  console.error("Unhandled Promise Rejection: ", err);

  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  };
  
});