const restaurantService = require('../services/restaurantService');
const mongoose = require('mongoose');
const { clearCache } = require('../middleware/cacheMiddleware');
const { asyncHandler } = require('../utils/errorUtils');

// Get all restaurants
const getRestaurants = asyncHandler(async (req, res) => {
  const result = await restaurantService.getAllRestaurants(req.query);

  return res.status(200).json({
    success: true,
    data: result.restaurants,
    pagination: result.pagination,
    count: result.count,
    message: "Restaurants fetched successfully"
  });
});

// Get Single Restaurant
const getRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  
  try {
    const restaurant = await restaurantService.getRestaurantById(restaurantId, req.user);
    
    return res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    if (error.message === 'Invalid restaurant ID format') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Restaurant not found' || 
        error.message === 'Restaurant is not available for public access') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    throw error; // Re-throw for the error handler middleware
  }
});

// Create new restaurant
const createRestaurant = asyncHandler(async (req, res) => {
  // Check if user is a restaurant owner
  if (req.user.role !== "restaurant_owner") {
    return res.status(403).json({
      success: false,
      message: "Only restaurant owner can create restaurants"
    });
  }

  // Check if user already has a restaurant
  try {
    await restaurantService.getRestaurantByOwner(req.user._id);
    return res.status(400).json({
      success: false,
      message: "You already have a restaurant"
    });
  } catch (error) {
    if (error.message !== 'Restaurant not found for this owner') {
      throw error;
    }
    // If no restaurant found, proceed with creation
  }

  const restaurant = await restaurantService.createRestaurant(req.body, req.user._id);

  // Clear cache to ensure new restaurant is visible
  await clearCache('restaurants');

  return res.status(201).json({
    success: true,
    message: "Restaurant created successfully",
    data: restaurant
  });
});

// Update restaurant
const updateRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  try {
    const updatedRestaurant = await restaurantService.updateRestaurant(
      restaurantId, 
      req.body, 
      req.user._id, 
      req.user.role
    );

    // Clear cache to refresh restaurant data
    await clearCache(`restaurants`);
    await clearCache(`restaurants/${restaurantId}`);

    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      data: updatedRestaurant
    });
  } catch (error) {
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Not authorized to update this restaurant') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    throw error;
  }
});

// Delete restaurant
const deleteRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;

  try {
    await restaurantService.deleteRestaurant(
      restaurantId, 
      req.user._id, 
      req.user.role
    );

    // Clear cache to ensure deleted restaurant is no longer visible
    await clearCache(`restaurants`);
    await clearCache(`restaurants/${restaurantId}`);

    return res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully"
    });
  } catch (error) {
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Not authorized to delete this restaurant') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    throw error;
  }
});

// Approve restaurant - Admin only
const approveRestaurant = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { status, remarks } = req.body;

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid status (approved, rejected, or pending)"
    });
  }

  try {
    const restaurant = await restaurantService.approveRestaurant(
      restaurantId, 
      status, 
      remarks, 
      req.user._id
    );

    // Clear cache to reflect approval status change
    await clearCache(`restaurants`);
    await clearCache(`restaurants/${restaurantId}`);

    return res.status(200).json({
      success: true,
      message: `Restaurant ${status} successfully`,
      data: restaurant
    });
  } catch (error) {
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    throw error;
  }
});

// Get restaurant by owner ID
const getRestaurantByOwner = asyncHandler(async (req, res) => {
  const { ownerId } = req.params;

  try {
    const restaurant = await restaurantService.getRestaurantByOwner(ownerId);

    return res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    if (error.message === 'Restaurant not found for this owner') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    throw error;
  }
});

// Get my restaurant (for logged-in restaurant owner)
const getMyRestaurant = asyncHandler(async (req, res) => {
  try {
    const restaurant = await restaurantService.getRestaurantByOwner(req.user._id);

    return res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    if (error.message === 'Restaurant not found for this owner') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    throw error;
  }
});

module.exports = {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  approveRestaurant,
  getRestaurantByOwner,
  getMyRestaurant
};