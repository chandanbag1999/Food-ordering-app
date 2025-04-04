const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


// Public routes
router.get('/:restaurantId', reviewController.getAllRestaurantReviews); //TODO: not right possible to get all reviews
router.get("./:reviewId", reviewController.getReview); // TODO: in testing feature









module.exports = router;