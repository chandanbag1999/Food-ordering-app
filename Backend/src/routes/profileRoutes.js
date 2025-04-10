const express = require('express');
const { protect } = require('../middleware/auth');
const { updateProfilePicture, deleteProfilePicture } = require('../controllers/profileController');
const { uploadLocal } = require('../utils/uploadUtils');

const router = express.Router();

// Handle file upload route with error handling
router.put('/picture', protect, uploadLocal, updateProfilePicture);
router.delete('/picture', protect, deleteProfilePicture);

module.exports = router;