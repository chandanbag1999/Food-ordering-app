const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connectionDB = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB is Connected: ${connectionDB.connection.host}`);
    return connectionDB;
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('Continuing without MongoDB connection...');
    return null;
  }
};

module.exports = connectDB;