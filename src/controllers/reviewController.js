const mongoose = require('mongoose');
const Review = require("../models/ReviewModel");
const Restaurant = require("../models/RestaurantModel");
const Order = require("../models/OrderModel");
const User = require("../models/userModel");

// Get all review for a restaurant
const getAllRestaurantReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Verify if the restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: "fail",
        message: "Restaurant not found",
      })
    };

    // Build query
    const query = { 
      restaurantId,
      isActive: true 
    };
    
    // Filter by rating
    if (req.query.rating) {
      query.rating = parseInt(req.query.rating);
    }
    
    // Filter by verified orders
    if (req.query.verified === 'true') {
      query.isVerifiedOrder = true;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Sorting
    let sort = {};
    if (req.query.sort) {
      const sortFields = req.query.sort.split(',');
      sortFields.forEach(field => {
        if (field.startsWith('-')) {
          sort[field.substring(1)] = -1;
        } else {
          sort[field] = 1;
        }
      });
    } else {
      // Default sort by newest first
      sort = { createdAt: -1 };
    }
    
    // Execute query
    const reviews = await Review.find(query)
      .sort(sort)
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'name avatar');
    
    // Get total count
    const total = await Review.countDocuments(query);
    
    // Get rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), isActive: true } },
      { $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    // Format rating stats
    const formattedRatingStats = {};
    ratingStats.forEach(stat => {
      formattedRatingStats[stat._id] = stat.count;
    });
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    return res.status(200).json({
      success: true,
      count: reviews.length,
      pagination,
      ratingStats: formattedRatingStats,
      data: reviews
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving reviews',
      error: error.message
    });
  }
};










module.exports = {
  getAllRestaurantReviews, 
}