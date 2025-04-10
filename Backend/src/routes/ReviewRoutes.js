const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


// Public routes
router.get('/:reviewId', reviewController.getReview);

// Routes requiring authentication
router.put('/:reviewId', protect, authorize('customer'), reviewController.updateReview);
router.delete('/:reviewId', protect, authorize('customer', 'super_admin'), reviewController.deleteReview); // TODO: not checking

router.put('/:reviewId/respond', protect, authorize('restaurant_owner', 'super_admin'), reviewController.respondToReview);

router.put(
  '/:reviewId/report',
  protect,
  authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'),
  reviewController.reportReview
);


// Admin only routes
router.get(
  '/admin/reported',
  protect,
  authorize('super_admin', 'sub_admin'),
  reviewController.getReportedReviews
);

router.put(
 '/:reviewId/moderate',
 protect,
 authorize('super_admin','sub_admin'),
 reviewController.moderateReview 
);



module.exports = router;