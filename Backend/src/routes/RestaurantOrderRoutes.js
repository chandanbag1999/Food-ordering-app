const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // Enable mergeParams to access parent route parameters


// Get all orders for a restaurant(restaurant owner, admin)
router.get("/", protect, authorize("restaurant_owner", "super_admin", "sub_admin"), orderController.getRestaurantAllOrders);

// Get order statistics for a restaurant(restaurant owner, admin)
router.get("/statistics", protect, authorize("restaurant_owner", "super_admin", "sub_admin"), orderController.getRestaurantOrderStats);

module.exports = router;