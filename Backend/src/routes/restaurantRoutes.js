const express = require('express');
const restaurantController = require('../controllers/restaurantController');
const { protect, authorize } = require('../middleware/auth');
const { cache } = require('../middleware/cacheMiddleware');

const router = express.Router();

// Public routes with caching
router.get('/', cache(300), restaurantController.getRestaurants);
router.get('/:restaurantId', cache(300), restaurantController.getRestaurant);

// Restaurant owner routes
router.get(
    '/my-restaurant',
    protect,
    authorize('restaurant_owner'),
    restaurantController.getMyRestaurant
);

// Create restaurant route
router.post(
    '/',
    protect,
    authorize('restaurant_owner'),
    restaurantController.createRestaurant
);

// Admin only routes - these specific routes must come before the generic :restaurantId routes
router.put(
    '/approve/:restaurantId',
    protect,
    authorize('super_admin', 'sub_admin'),
    restaurantController.approveRestaurant
);

router.get(
    '/owner/:ownerId',
    protect,
    authorize('super_admin', 'sub_admin', 'restaurant_owner'),
    restaurantController.getRestaurantByOwner
);

// Generic routes that use :restaurantId parameter must come last
router.put(
    '/:restaurantId',
    protect,
    authorize('restaurant_owner', 'super_admin', 'sub_admin'),
    restaurantController.updateRestaurant
);

router.delete(
    '/:restaurantId',
    protect,
    authorize('restaurant_owner', 'super_admin'),
    restaurantController.deleteRestaurant
);

module.exports = router;