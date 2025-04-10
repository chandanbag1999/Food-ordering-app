const express = require('express');
const cartController = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Cart routes
router.route('/')
  .get(authorize('customer', 'super_admin', 'sub_admin'), cartController.getCart)
  .delete(authorize('customer', 'super_admin', 'sub_admin'), cartController.clearCart);

// Cart items routes
router.route('/items')
  .post(authorize('customer', 'super_admin', 'sub_admin'), cartController.addItemToCart);

router.route('/items/:menuItemId')
  .put(authorize('customer', 'super_admin', 'sub_admin'), cartController.updateCartItem)
  .delete(authorize('customer', 'super_admin', 'sub_admin'), cartController.removeCartItem);

// Coupon routes
router.route('/apply-coupon')
  .post(authorize('customer', 'super_admin', 'sub_admin'), cartController.applyCoupon);

router.route('/remove-coupon')
  .delete(authorize('customer', 'super_admin', 'sub_admin'), cartController.removeCoupon);



module.exports = router;