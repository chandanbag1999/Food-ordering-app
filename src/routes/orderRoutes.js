const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');



const router = express.Router();

// Customer routes
router.post("/", protect, authorize("customer"), orderController.createOrder);
router.get("/", protect, authorize("customer"), orderController.getUserAllOrders);

// Shared routes (accessible by multiple roles)
router.get("/:orderId", protect, authorize("customer", "restaurant_owner", "super_admin", "sub_admin", "delivery_person"), orderController.getSingleOrder);

router.put("/:orderId/cancel", protect, authorize("customer", "restaurant_owner", "super_admin", "sub_admin" ), orderController.cancelOrder);

router.put("/:orderId/status", protect, authorize("restaurant_owner", "super_admin", "sub_admin", "delivery_person"), orderController.updateOrderStatus);

// Customar-only routes
router.put("/:orderId/review", protect, authorize("customer"), orderController.addOrderReview);

// Admin-only routes and Restaurant owner routes
router.put("/:orderId/assign-delivery-person", protect, authorize("restaurant_owner", "super_admin", "sub_admin"), orderController.assignDeliveryPerson);

module.exports = router;