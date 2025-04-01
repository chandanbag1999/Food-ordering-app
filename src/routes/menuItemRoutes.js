const express = require('express');
const menuItemsController = require('../controllers/menuItemController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // Enable parameter merging

// Test route to verify the router is working
router.get('/test', (req, res) => {
  console.log('Test route accessed!');
  return res.status(200).json({
    success: true,
    message: "Menu items router is working correctly",
    params: req.params
  });
});

// public routes
router.get('/', menuItemsController.getMenuItems);
router.get('/:menuItemId', menuItemsController.getMenuItemBy);

// Restaurant owner routes
router.post('/', protect, authorize('restaurant_owner', 'super_admin'), menuItemsController.createMenuItem);

// Make sure this route is defined BEFORE the :menuItemId routes to avoid conflicts
router.put('/bulk-update', protect, authorize('restaurant_owner', 'super_admin'), menuItemsController.bulkUpdateMenuItems);

router.put('/:menuItemId', protect, authorize('restaurant_owner', 'super_admin'), menuItemsController.updateMenuItem);
router.delete('/:menuItemId', protect, authorize('restaurant_owner', 'super_admin'), menuItemsController.deleteMenuItem);
router.put('/:menuItemId/toggle-availability', protect, authorize('restaurant_owner', 'super_admin'), menuItemsController.toggleMenuItemAvailability);

module.exports = router;