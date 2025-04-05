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

// Update review
const updateReview = async (req, res) => {
 try {
  const { rating, text, photos } = req.body;

  // Find review
  const review = await Review.findById(req.params.reviewId);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  };

  // Check if user is authorized to update the review
  if (review.userId.toString() !== req.user._id.toString() && 
   req.user.role !== 'super_admin') {
   return res.status(403).json({
    success: false,
    message: 'Unauthorized to update this review ' 
   })
  };

  // Update review fields
  review.rating = rating || review.rating;
  review.text = text || review.text;
  review.photos = photos || review.photos;
  review.isEdited = true;
  review.lastEditedAt = Date.now();
  review.updatedAt = Date.now();

  // Save updated review
  await review.save();

  // Populate user data
  await review.populate('userId', 'name avatar');

  return res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: review
  });
 } catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Error updating review', 
    error: error.message
  })
 }
}

// Delete review(customers and admin)
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    // Find the review
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check ownership or admin rights
    if (review.userId.toString() !== req.user._id.toString() && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }
    
    // Delete review - using findByIdAndDelete instead of remove() which is deprecated
    await Review.findByIdAndDelete(reviewId);
    
    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      data: {}
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  } 
};

// Add restaurant owner response to review(restaurent owner only)
const respondToReview = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      }); 
    };

    // Find review
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    };

    // Check if user is authorized to respond to the review
    const restaurant = await Restaurant.findById(review.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    };

    if (restaurant.ownerId.toString() !== req.user._id.toString() && 
     req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the restaurant owner can respond to reviews'
      });
    };

    // Add response to review
    review.ownerResponse = {
      text,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save updated review
    await review.save();

    return res.status(200).json({
      success: true,
      message: 'Review response added successfully',
      data: review 
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error responding to review',
      error: error.message
    });
  }
};

// Report a review
const reportReview = async (req, res) => {
 try {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Report reason is required'
    });
  };

  // Find review
  const review = await Review.findById(req.params.reviewId);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  };

  // Check if user has already reported the review
  if (review.reportedBy.includes(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: 'You have already reported this review'
    });
  };

  // Add report to review
  review.isReported = true;
  review.reportReason = reason;
  review.reportedBy.push(req.user._id);

  // Save updated review
  await review.save();
  
  return res.status(200).json({
    success: true,
    message: 'Review reported successfully',
    data: {}
  });
 } catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Error reporting review',
    error: error.message 
  })
 }
};

// Get all reviews by a user(User, Admin)
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
   
    // Check authorization
    if (userId !== req.user._id.toString() && 
        req.user.role !== 'super_admin' && 
        req.user.role !== 'sub_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these reviews'
      });
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Execute query
    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('restaurantId', 'name address images.logo');
    
    // Get total count
    const total = await Review.countDocuments({ userId });
    
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

// Get all reported reviews (admin only)
const getReportedReviews = async (req, res) => {
 try {
  // Check if user is admin
  if (req.user.role !== 'super_admin' && req.user.role !== 'sub_admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  };

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  
  // Execute query
  const reviews = await Review.find({ isReported: true })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('userId', 'name email')
    .populate('restaurantId', 'name ownerId')
    .populate('reportedBy', 'name email');
  
  // Get total count
  const total = await Review.countDocuments({ isReported: true });
  
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
    data: reviews   
  })
 } catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Error retrieving reported reviews',
    error: error.message
  });
 } 
};

//  Moderate a review (admin only)
const moderateReview = async (req, res) => {
try {
  const { action } = req.body;
    
  if (!action || !['approve', 'remove'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid action (approve or remove)'
    });
  }
    
  // Check if user is admin
  if (req.user.role !== 'super_admin' && req.user.role !== 'sub_admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to moderate reviews'
    });
  }
    
  // Find review
  const review = await Review.findById(req.params.reviewId);
    
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  };

  if (action === 'approve') {
    // Clear reported status
    review.isReported = false;
    review.reportReason = '';
    review.reportedBy = [];
    
    await review.save();
    
    return res.status(200).json({
      success: true,
      message: 'Review approved and report cleared',
      data: review
    });
  } else if (action === 'remove') {
    // Deactivate review
    review.isActive = false;
    
    await review.save();
    
    return res.status(200).json({
      success: true,
      message: 'Review removed from public view',
      data: review
    });
  };
 } catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Error moderating review',
    error: error.message
  });
 } 
};


module.exports = {
  getAllRestaurantReviews, 
  getReview,
  createReview,
  updateReview,
  deleteReview,
  respondToReview,
  reportReview,
  getUserReviews,
  getReportedReviews,
  moderateReview
};