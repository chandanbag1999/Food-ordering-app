const express = require('express');
const couponController = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');


const router = express.Router();


// Protect all routes
router.use(protect);

// Routes for all users
router.route('/validate')
  .post(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), couponController.validateCoupon);

router.route('/available')
  .get(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), couponController.getAvailableCoupons);

// Routes for admins and restaurant owners
router.route('/')
  .get(authorize('restaurant_owner', 'super_admin', 'sub_admin'), couponController.getAllCoupons)
  .post(authorize('restaurant_owner', 'super_admin', 'sub_admin'), couponController.createCoupon);

router.route('/:id')
  .get(authorize('restaurant_owner', 'super_admin', 'sub_admin'), couponController.getCouponById)
  .put(authorize('restaurant_owner', 'super_admin', 'sub_admin'), couponController.updateCoupon)
  .delete(authorize('restaurant_owner', 'super_admin', 'sub_admin'), couponController.deleteCoupon);

module.exports = router;