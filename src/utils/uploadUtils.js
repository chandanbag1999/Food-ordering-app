const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Configure Cloudinary with detailed logging
const configureCloudinary = () => {
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };
  
  // Check if all required configuration is present
  const missingConfig = [];
  if (!config.cloud_name) missingConfig.push('CLOUDINARY_CLOUD_NAME');
  if (!config.api_key) missingConfig.push('CLOUDINARY_API_KEY');
  if (!config.api_secret) missingConfig.push('CLOUDINARY_API_SECRET');
  
  if (missingConfig.length > 0) {
    console.error('Missing Cloudinary configuration:', missingConfig.join(', '));
    return false;
  }
  
  console.log('Configuring Cloudinary with:', {
    cloud_name: config.cloud_name,
    api_key: config.api_key ? '✓ Present' : '✗ Missing',
    api_secret: config.api_secret ? '✓ Present' : '✗ Missing'
  });

  // Configure Cloudinary with the settings
  cloudinary.config(config);
  return true;
};

// Configure Cloudinary immediately
const isCloudinaryConfigured = configureCloudinary();

// Ensure uploads directory exists
const uploadsDir = 'uploads/';
fs.ensureDirSync(uploadsDir);

// Configure local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Processing file upload to directory:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    console.log('Processing file:', file.originalname);
    const uniqueSuffix = uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function with detailed logging
const fileFilter = (req, file, cb) => {
  console.log('Filtering file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  // Accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    console.log('File rejected: not an allowed image type');
    return cb(new Error('Only image files are allowed!'), false);
  }
  console.log('File accepted');
  cb(null, true);
};

// Create multer instance that accepts multiple field names
const createUpload = () => {
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    }
  });

  return (req, res, next) => {
    console.log('Received upload request with headers:', req.headers);

    // Try profilePicture first
    upload.single('profilePicture')(req, res, (err) => {
      if (err) {
        console.log('Error with profilePicture:', err.message);
        // If there's an error with profilePicture, try file
        upload.single('file')(req, res, (err2) => {
          if (err2) {
            console.log('Error with file:', err2.message);
            return next(err2);
          }
          next();
        });
      } else if (!req.file) {
        console.log('No file found with profilePicture, trying file field');
        // If no file was uploaded with profilePicture, try file
        upload.single('file')(req, res, (err2) => {
          if (err2) {
            console.log('Error with file:', err2.message);
            return next(err2);
          }
          next();
        });
      } else {
        console.log('File uploaded successfully with profilePicture field');
        next();
      }
    });
  };
};

// Function to upload file to Cloudinary with retries
const uploadToCloudinary = async (filePath, retries = 3) => {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      error: 'Cloudinary is not properly configured. Please check your environment variables.'
    };
  }

  console.log('Starting Cloudinary upload attempt:', {
    filePath,
    remainingRetries: retries
  });

  try {
    // Verify file exists and is readable
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    console.log('File stats:', {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    });

    // Attempt upload
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'profile-pictures',
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
      resource_type: 'auto'
    });

    console.log('Cloudinary upload successful:', {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      size: result.bytes
    });

    // Delete local file after successful upload
    try {
      await fs.unlink(filePath);
      console.log('Local file deleted successfully:', filePath);
    } catch (unlinkError) {
      console.error('Error deleting local file:', unlinkError);
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };

  } catch (error) {
    console.error('Cloudinary upload error:', {
      message: error.message,
      code: error.http_code,
      name: error.name
    });

    // Handle specific Cloudinary errors
    if (error.http_code === 401) {
      return {
        success: false,
        error: 'Cloudinary authentication failed. Please check your credentials.'
      };
    }

    // Retry logic for temporary errors
    if (retries > 0 && (error.http_code === 429 || error.http_code >= 500)) {
      console.log(`Retrying upload... ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return uploadToCloudinary(filePath, retries - 1);
    }

    // Clean up local file on error
    try {
      await fs.unlink(filePath);
      console.log('Cleaned up local file after failed upload:', filePath);
    } catch (unlinkError) {
      console.error('Error deleting local file:', unlinkError);
    }

    return {
      success: false,
      error: `Cloudinary upload failed: ${error.message}`
    };
  }
};

// Function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      error: 'Cloudinary is not properly configured. Please check your environment variables.'
    };
  }

  try {
    console.log('Attempting to delete from Cloudinary:', publicId);
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary delete result:', result);

    if (result.result === 'ok') {
      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: `Delete failed with result: ${result.result}`
      };
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  uploadLocal: createUpload(),
  uploadToCloudinary,
  deleteFromCloudinary
};