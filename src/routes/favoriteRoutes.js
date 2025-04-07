const express = require('express');
const favoriteController = require('../controllers/favoriteController');
const { protect, authorize } = require('../middleware/auth');


const router = express.Router();

// Protect all routes
router.use(protect);

// Routes for all users
router.route('/')
  .get(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), favoriteController.getFavorites)
  .post(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), favoriteController.addFavorite);

router.route('/:id')
  .put(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), favoriteController.updateFavoriteNotes)
  .delete(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), favoriteController.removeFavorite);

router.route('/check/:restaurantId')
  .get(authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), favoriteController.checkFavorite);



module.exports = router;