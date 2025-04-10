const mongoose = require('mongoose');
const Restaurant = require('../models/RestaurantModel');
const User = require('../models/userModel');

/**
 * Get all restaurants with filters, pagination, and sorting
 */
const getAllRestaurants = async (queryParams) => {
  // Build query
  const query = {};
  
  // Filter by active and approved status
  query.isActive = true;
  query.isApproved = true;

  // Filter by cuisine type
  if (queryParams.cuisine) {
    query.cuisineType = { $in: queryParams.cuisine.split(",") };
  }

  // Filter by features
  if (queryParams.vegetarian === 'true') {
    query["features.isVegetarian"] = true;
  }

  if (queryParams.vegan === 'true') {
    query["features.isVegan"] = true;
  }

  if (queryParams.delivery === 'true') {
    query["features.hasDelivery"] = true;
  }

  if (queryParams.takeaway === 'true') {
    query["features.hasTakeaway"] = true;
  }

  if (queryParams.dineIn === 'true') {
    query["features.hasDineIn"] = true;
  }

  // Search by name or description
  if (queryParams.search) {
    query.$or = [
      { name: { $regex: queryParams.search, $options: 'i' } },
      { description: { $regex: queryParams.search, $options: 'i' } },
      { "address.city": { $regex: queryParams.search, $options: 'i' } },
    ];
  }

  // Pagination
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Sorting
  let sort = {};

  if (queryParams.sort) {
    const sortFields = queryParams.sort.split(",");
    sortFields.forEach(field => {
      if (field.startsWith("-")) {
        sort[field.substring(1)] = -1; // Descending
      } else {
        sort[field] = 1; // Ascending
      }
    });
  } else {
    sort = { rating: -1 }; // Default sort by rating descending
  }

  // Execute query
  const restaurants = await Restaurant.find(query)
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  // Get total count of restaurants
  const total = await Restaurant.countDocuments(query);

  // Pagination result
  const pagination = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };

  return {
    restaurants,
    pagination,
    count: restaurants.length
  };
};

/**
 * Get restaurant by ID
 */
const getRestaurantById = async (restaurantId, user = null) => {
  // Validate if the restaurantId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new Error('Invalid restaurant ID format');
  }

  const restaurant = await Restaurant.findById(restaurantId);

  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Check if restaurant is active and approved for public access
  if (!user && (!restaurant.isActive || !restaurant.isApproved)) {
    throw new Error('Restaurant is not available for public access');
  }

  // If user is not owner or admin, and restaurant is not active or approved
  if (
    user && 
    user.role !== 'super_admin' &&
    user.role !== 'sub_admin' &&
    user._id.toString() !== restaurant.ownerId.toString() &&
    (!restaurant.isActive || !restaurant.isApproved) 
  ) {
    throw new Error('Restaurant is not available for public access');
  }

  return restaurant;
};

/**
 * Create a new restaurant
 */
const createRestaurant = async (restaurantData, userId) => {
  // Create restaurant
  const restaurant = await Restaurant.create({
    ...restaurantData,
    ownerId: userId
  });

  // Update user with restaurant ID
  await User.findByIdAndUpdate(userId, { restaurantId: restaurant._id });

  return restaurant;
};

/**
 * Update restaurant
 */
const updateRestaurant = async (restaurantId, updateData, userId, userRole) => {
  // Check if restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Check if user is authorized to update
  if (userRole !== 'super_admin' && userRole !== 'sub_admin' && restaurant.ownerId.toString() !== userId.toString()) {
    throw new Error('Not authorized to update this restaurant');
  }

  // Update restaurant
  const updatedRestaurant = await Restaurant.findByIdAndUpdate(
    restaurantId,
    updateData,
    { new: true, runValidators: true }
  );

  return updatedRestaurant;
};

/**
 * Delete restaurant
 */
const deleteRestaurant = async (restaurantId, userId, userRole) => {
  // Check if restaurant exists
  const restaurant = await Restaurant.findById(restaurantId);
  
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Check if user is authorized to delete
  if (userRole !== 'super_admin' && userRole !== 'sub_admin' && restaurant.ownerId.toString() !== userId.toString()) {
    throw new Error('Not authorized to delete this restaurant');
  }

  await Restaurant.findByIdAndDelete(restaurantId);
  
  // Update user to remove restaurant reference
  await User.findByIdAndUpdate(restaurant.ownerId, { $unset: { restaurantId: "" } });

  return { success: true };
};

/**
 * Approve restaurant
 */
const approveRestaurant = async (restaurantId, status, remarks, adminId) => {
  const restaurant = await Restaurant.findById(restaurantId);
  
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  restaurant.approvalStatus = status;
  restaurant.approvalRemarks = remarks;
  restaurant.isApproved = status === 'approved';
  restaurant.approvedBy = adminId;
  restaurant.approvedAt = new Date();

  await restaurant.save();

  return restaurant;
};

/**
 * Get restaurant by owner
 */
const getRestaurantByOwner = async (ownerId) => {
  const restaurant = await Restaurant.findOne({ ownerId });
  
  if (!restaurant) {
    throw new Error('Restaurant not found for this owner');
  }

  return restaurant;
};

module.exports = {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  approveRestaurant,
  getRestaurantByOwner
}; 