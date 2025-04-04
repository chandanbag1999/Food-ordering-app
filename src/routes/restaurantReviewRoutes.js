const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');



const router = express.Router({ mergeParams: true });


// Get all reviews for a restaurant
router.get('/', reviewController.getAllRestaurantReviews);

// Create a new review for a restaurant
router.post(
  '/',
  protect,
  authorize('customer'),
  reviewController.createReview
);


module.exports = router;