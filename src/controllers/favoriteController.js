const Favorite = require("../models/FavoriteModel");
const Restaurant = require("../models/RestaurantModel");


// Get all favorite for a user
const getFavorites = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Execute query
    const favorites = await Favorite.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate({
        path: 'restaurantId',
        select: 'name address cuisineType images.logo rating reviewCount features'
      });

    // Get total count
    const total = await Favorite.countDocuments({ userId: req.user._id });
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    return res.status(200).json({
      success: true,
      count: favorites.length,
      pagination,
      data: favorites
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving favorites',
      error: error.message
    });
  }
};

//  Add restaurant to favorites
const addFavorite = async (req, res) => {
  try {
    const { restaurantId, notes } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a restaurant ID'
      });
    }
    
    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    };


    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      userId: req.user._id,
      restaurantId
    });
    
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant already in favorites'
      });
    };

    // Add to favorites
    const favorite = await Favorite.create({
      userId: req.user._id,
      restaurantId,
      notes: notes || '',
      createdAt: Date.now()
    });
    
    // Populate restaurant data
    await favorite.populate({
      path: 'restaurantId',
      select: 'name address cuisineType images.logo rating reviewCount features'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Restaurant added to favorites',
      data: favorite
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error adding to favorites',
      error: error.message
    });
  }
};

// Remove restaurant from favorites
const removeFavorite = async (req, res) => {
  try {
    const favorite = await Favorite.findById(req.params.id);
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }
    
    // Check ownership
    if (favorite.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove this favorite'
      });
    }
    
    // Remove from favorites - using deleteOne() instead of remove()
    await Favorite.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Restaurant removed from favorites',
      data: {}
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error removing from favorites',
      error: error.message
    });
  }
};

// Update favorite notes
const updateFavoriteNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    // Check if favorite exists
    const favorite = await Favorite.findById(req.params.id);
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    };

    // Check ownership
    if (favorite.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this favorite'
      });
    }
    
    // Update notes
    favorite.notes = notes;
    await favorite.save();
    
    // Populate restaurant data
    await favorite.populate({
      path: 'restaurantId',
      select: 'name address cuisineType images.logo rating reviewCount features'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Favorite updated successfully',
      data: favorite
    });
    

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating favorite',
      error: error.message
    });
  }
};

// Check if restaurant is in user's favorites
const checkFavorite = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const favorite = await Favorite.findOne({
      userId: req.user._id,
      restaurantId
    });
    
    return res.status(200).json({
      success: true,
      isFavorite: !!favorite,
      data: favorite || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking favorite status',
      error: error.message
    });
  }
};

// Get all users who favorited a restaurant(Restaurant Owner, Admin)
const getRestaurantFavorites = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Check authorization
    if (
      req.user.role !== 'super_admin' &&
      req.user.role !== 'sub_admin' &&
      restaurant.ownerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this information'
      });
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    // Execute query
    const favorites = await Favorite.find({ restaurantId })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'name email phone');
    
    // Get total count
    const total = await Favorite.countDocuments({ restaurantId });
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    return res.status(200).json({
      success: true,
      count: favorites.length,
      pagination,
      data: favorites
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving restaurant favorites',
      error: error.message
    });
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  updateFavoriteNotes,
  checkFavorite,
  getRestaurantFavorites
};
