const User = require('../models/userModel');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadUtils');
const path = require('path');
const fs = require('fs-extra');

const updateProfilePicture = async (req, res) => {
  try {
    // Log the entire request for debugging
    console.log('Profile picture update request:', {
      body: req.body,
      file: req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null,
      headers: req.headers
    });

    // Validate request format
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        message: 'Request must be multipart/form-data'
      });
    }

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (req.file.size > maxSize) {
      // Clean up the file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error('Error deleting oversized file:', error);
      }
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }

    // Check if the file is an image by mimetype
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Clean up the file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error('Error deleting invalid file:', error);
      }
      return res.status(400).json({
        success: false,
        message: 'Only image files (jpg, png, gif) are allowed'
      });
    }

    // Get user and their current profile picture
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store the old public ID for cleanup after successful upload
    const oldPublicId = user.profilePicture?.publicId;

    try {
      // Upload local file to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.path);
      console.log('Cloudinary upload result:', cloudinaryResult);

      if (!cloudinaryResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Error uploading to cloud storage',
          error: cloudinaryResult.error
        });
      }

      // Update user profile with new picture URL
      user.profilePicture = {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId
      };
      
      await user.save();

      // Delete old profile picture from Cloudinary if it exists
      if (oldPublicId) {
        const deleteResult = await deleteFromCloudinary(oldPublicId);
        if (!deleteResult.success) {
          console.error('Failed to delete old profile picture:', deleteResult.error);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: {
          profilePicture: user.profilePicture
        }
      });

    } catch (uploadError) {
      console.error('Error in upload process:', uploadError);
      
      // Clean up local file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting local file:', unlinkError);
        }
      }

      throw uploadError;
    }
  } catch (error) {
    console.error('Profile picture update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile picture',
      error: error.message
    });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.profilePicture?.publicId) {
      return res.status(400).json({
        success: false,
        message: 'No profile picture to delete'
      });
    }

    // Delete from Cloudinary
    const deleteResult = await deleteFromCloudinary(user.profilePicture.publicId);
    
    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting from cloud storage',
        error: deleteResult.error
      });
    }

    // Reset to default avatar
    user.profilePicture = {
      url: process.env.CLOUDINARY_DEFAULT_AVATAR || 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/profile-pictures/default-avatar.png',
      publicId: null
    };
    
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully',
      data: {
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error in deleteProfilePicture:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting profile picture',
      error: error.message
    });
  }
};

module.exports = {
  updateProfilePicture,
  deleteProfilePicture
};