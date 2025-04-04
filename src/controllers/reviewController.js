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

// Get single review
const getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Verify if the review exists
    const review = await Review.findById(reviewId)
    .populate('userId', 'name avatar')
    .populate('restaurantId', 'name address');

    if (!review || !review.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      }); 
    };

    return res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving review',
      error: error.message
    });
  } 
};

// create new review
const createReview = async (req, res) => {
 try {
  const { restaurantId } = req.params;
  const { rating, text, photos, orderId } = req.body;

  if (!rating || !text || !orderId) {
    return res.status(400).json({
      success: false,
      message: 'Rating and text are required'
    });
  };

  // Verify if the restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    return res.status(404).json({
      success: false,
      message: 'Restaurant not found'
    }); 
  };

  // check if user are already reviewed the restaurant
  const existingReview = await Review.findOne({
    userId: req.user.id,
    restaurantId
  });

  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this restaurant'
    });   
  };

  // check if review is based on an order
  let isVerifiedOrder = false;

  if (orderId) {
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user._id,
      restaurantId,
      status: { $in: ['completed', 'delivered'] }
    });   
    if (order) {
     isVerifiedOrder = true;
    }
  };

  // create new review
  const review = await Review.create({
    userId: req.user._id,
    restaurantId,
    orderId,
    rating,
    text,
    photos: photos || [],
    isVerifiedOrder,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Populate the user data
  await review.populate('userId', 'name avatar');

  return res.status(201).json({
    success: true,
    message: 'Review created successfully',
    data: review
  });
  
 } catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Error creating review',
    error: error.message
  });
 } 
}








module.exports = {
  getAllRestaurantReviews, 
  getReview,
  createReview
}