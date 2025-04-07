const express = require('express');
const favoriteController = require('../controllers/favoriteController');
const { protect, authorize } = require('../middleware/auth');


const router = express.Router({ mergeParams: true });

// Protect all routes
router.use(protect);

// Get all users who favorited a restaurant (admin and restaurant owner only)
router.route('/')
  .get(
    authorize('restaurant_owner', 'super_admin', 'sub_admin'),
    favoriteController.getRestaurantFavorites
  );

module.exports = router;

//  http://localhost:5001/api/v1/restaurants/:restaurantId/favorites