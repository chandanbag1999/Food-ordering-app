const Restaurant = require("../models/RestaurantModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

// Get all restaurants

const getRestaurants = async (req, res) => {
    try {
       // Build query
       const query = {};
       
       // Filter by active and approved status
        query.isActive = true;
        query.isApproved = true;

        // Filter by cuisine type
        if (req.query.cuisine) {
            query.cuisineType = { $in: req.query.cuisine.split(",") };
        };

        // Filter by features
        if (req.query.vegetarian === 'true') {
            query["features.isVegetarian"] = true;
        };

        if (req.query.vegan === 'true') {
            query["features.isVegan"] = true;
            
        };

        if (req.query.delivery === 'true') {
            query["features.hasDelivery"] = true;
            
        };

        if (req.query.takeaway === 'true') {
            query["features.hasTakeaway"] = true;
            
        };

        if (req.query.dineIn === 'true') {
            query["features.hasDineIn"] = true;
            
        };

        // Search by name or description
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { "address.city": { $regex: req.query.search, $options: 'i' } },
            ];
        };

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        // Sorting
        let sort = {};

        if (req.query.sort) {
            const sortFields = req.query.sort.split(",");
            sortFields.forEach(field => {
                if (field.startWith("-")) {
                    sort[field.substring(1)] = -1; // Descending
                }
            })
        } else {
            sort = { rating : -1 }; // Default sort by rating descending
        };

        // Excute query
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
            Pages: Math.ceil(total / limit),
        };

        return res.status(200).json({
            success: true,
            data: restaurants,
            pagination,
            count: restaurants.length,
            message: "Restaurants fetched successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching restaurants",
            error: error.message
        });
        
    }
};

// Get Single Restaurant
const getRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Validate if the restaurantId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant ID format"
            });
        }

       const restaurant = await Restaurant.findById(restaurantId);

       if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        };

        // Check if restaurant is active and approved for public access
        if (!req.user && (!restaurant.isActive || !restaurant.isApproved)) {
            return res.status(403).json({
                success: false,
                message: "Restaurant is not available for public access"
            });
        };

        // If user is not owner or admin, and restaurant is not active or approved
        if (
             req.user && 
             req.user.role !== 'super_admin' &&
             req.user.role !== 'sub_admin' &&
             req.user._id.toString() !== restaurant.ownerId.toString() &&
             (!restaurant.isActive || !restaurant.isApproved) 
            ) {
            return res.status(404).json({
                success: false,
                message: "Restaurant is not available for public access"
            });
        };

        return res.status(200).json({
            success: true,
            data: restaurant
        });

    } catch (error) {
        console.error('Error in getRestaurant:', error);
        return res.status(500).json({
            success: false,
            message: "Error fetching restaurant",
            error: error.message
        });
    }
};

// Create new restaurant
const createRestaurant = async (req, res) => {
    try {
        // Check if user is a restaurant owner
        if (req.user.role !== "restaurant_owner") {
            return res.status(403).json({
                success: false,
                meassage: "Only restaurent owner can create restaurants"
            });
        };

        // Check if user already has a restaurant
        const existingRestaurant = await Restaurant.findOne({ ownerId: req.user._id });
        if (existingRestaurant) {
            return res.status(400).json({
                success: false,
                message: "You already has a restaurant"
            })
        };

        // Create restaurent
        const restaurant = await Restaurant.create({
            ...req.body,
            ownerId: req.user._id
        });

        // Update user with restaurant ID
        await User.findByIdAndUpdate(req.user._id, { restaurantId: restaurant._id});

        return res.status(201).json({
            success: true,
            message: "Restaurant created successfully",
            data: restaurant
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Eroor creating restaurant",
            error: error.message
        })
    }
};

// Update restaurant Private (Restaurant Owner, Admin)
const updateRestaurant = async (req, res) => {
    try {
      let restaurant = await Restaurant.findById(req.params.restaurantId);

      if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        };  

        // Check if user is owner or admin
        if (
            req.user.role !== "super_admin" &&
            req.user.role !== "sub_admin" &&
            restaurant.ownerId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this restaurant",
            });
        };

        // Prevent changing owner
        if (req.body.ownerId && req.body.ownerId !== restaurant.ownerId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot change the owner of the restaurant",
            });
        };

        // Update restaurant
        restaurant = await Restaurant.findByIdAndUpdate(
            req.params.restaurantId,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );


        return res.status(200).json({
            success: true,
            message: "Restaurant updated successfully",
            data: restaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error updating restaurant",
            error: error.message,
        });
    }
};

// Delete restaurant ( Restaurant owner and Admin)
const deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        };

        // Check if user is owner or admin
        if (
            req.user.role !== "super_admin" &&
            restaurant.ownerId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this restaurant",
            });
        };

        // Delete restaurant
        await restaurant.deleteOne();  // Updated from remove() to deleteOne()

        // Remove restaurant ID from user
        await User.findByIdAndUpdate(
            restaurant.ownerId,
            { $unset: { restaurantId: ""}}
        );

        return res.status(200).json({
            success: true,
            message: "Restaurant deleted successfully",
            data: {},
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error deleting restaurant",
            error: error.message
        });
        
    }
};

// Approve restaurant (Admin)
const approveRestaurant = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to approve this restaurant",
            });
        };

        const restaurant = await Restaurant.findById(req.params.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        };

        // Update approval status and add remarks
        restaurant.isApproved = true;
        restaurant.approvedBy = req.user._id;
        restaurant.approvedAt = new Date();
        restaurant.approvalStatus = req.body.status;
        restaurant.approvalRemarks = req.body.remarks;
        await restaurant.save();

        return res.status(200).json({
            success: true,
            message: "Restaurant approved successfully",
            data: restaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error approving restaurant",
            error: error.message,
        });
    }
};

// Get restaurant by owner (Admin, owner)
const getRestaurantByOwner = async (req, res) => {
    try {
        const ownerId = req.params.ownerId;

        // Check if user is admin or owner
        if (req.user.role !== "super_admin" && req.user.role !== "sub_admin" && req.user._id.toString() !== ownerId) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this restaurant",
            });
        };

        const restaurant = await Restaurant.find({ ownerId });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        };

        return res.status(200).json({
            success: true,
            count: restaurant.length,
            message: "Restaurants fetched successfully",
            data: restaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching restaurant",
            error: error.message,
        });
    }
};

// Get my restaurant (Restaurant owner)
const getMyRestaurant = async (req, res) => {
    try {
        // Check if user is restaurant owner
        if (req.user.role !== "restaurant_owner") {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this restaurant",
            });
        };

        const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        };

        return res.status(200).json({
            success: true,
            message: "Restaurant fetched successfully",
            data: restaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching restaurant",
            error: error.message,
        });
    }
};

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