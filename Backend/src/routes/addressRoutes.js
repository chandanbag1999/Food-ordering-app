const express = require('express');
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  getAddressSuggestions,
  searchNearby
} = require('../controllers/addressController');

const router = express.Router();

// Validation middleware
const addressValidation = [
  body('type').isIn(['home', 'work', 'other']).withMessage('Invalid address type'),
  body('label').optional().isString().isLength({ max: 50 }),
  body('street').notEmpty().withMessage('Street is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zipCode').notEmpty().withMessage('ZIP code is required'),
  body('isDefault').optional().isBoolean()
];

// Routes
router.post('/', protect, addressValidation, addAddress);
router.get('/', protect, getAddresses);
router.put('/:addressId', protect, addressValidation, updateAddress);
router.delete('/:addressId', protect, deleteAddress);

// Location services routes
router.get('/suggestions', protect, [
  query('latitude').isFloat(),
  query('longitude').isFloat()
], getAddressSuggestions);

router.get('/nearby', protect, [
  query('latitude').isFloat(),
  query('longitude').isFloat(),
  query('radius').optional().isInt({ min: 100, max: 50000 }),
  query('type').optional().isString()
], searchNearby);

module.exports = router;