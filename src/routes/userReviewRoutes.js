const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');


const router = express.Router({ mergeParams: true });

// Get all reviews by a user
router.get(
  '/',
  protect,
  authorize('customer', 'super_admin', 'sub_admin'),
  reviewController.getUserReviews
);

module.exports = router; 