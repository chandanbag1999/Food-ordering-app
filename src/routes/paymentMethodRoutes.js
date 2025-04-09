const express = require('express');
const paymentMethodController = require('../controllers/paymentMethodController');
const { protect, authorize } = require('../middleware/auth');


const router = express.Router();


// Protect all routes
router.use(protect);

// Routes for all authenticated users
router.post('/', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentMethodController.addPaymentMethod);
router.get('/', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentMethodController.getUserPaymentMethods);
router.get('/:id', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentMethodController.getPaymentMethodById);
router.put('/:id', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentMethodController.updatePaymentMethod);
router.delete('/:id', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentMethodController.deletePaymentMethod);
router.put('/:id/default', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentMethodController.setDefaultPaymentMethod);

module.exports = router;