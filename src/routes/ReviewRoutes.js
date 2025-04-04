const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


// Public routes
router.get('/:reviewId', reviewController.getReview);










module.exports = router;