const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


// Public routes
router.get('/:reviewId', reviewController.getReview);
router.get('/:restaurantId', reviewController.getAllRestaurantReviews); //TODO: not right position to get all reviews









module.exports = router;