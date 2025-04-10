# Profile Picture Upload Setup Guide

This guide explains how to set up and test the profile picture upload functionality.

## Prerequisites

1. Get Cloudinary credentials:
   - Sign up at [Cloudinary](https://cloudinary.com)
   - Go to Dashboard to find your credentials
   - Copy Cloud Name, API Key, and API Secret

2. Update `.env` file with your Cloudinary credentials:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_DEFAULT_AVATAR=https://res.cloudinary.com/your_cloud_name/image/upload/v1/profile-pictures/default-avatar.png
```

## Testing with Postman

### 1. Update Profile Picture

```http
PUT http://localhost:5001/api/v1/profile/picture
Authorization: Bearer your_access_token
Content-Type: multipart/form-data

Form Data:
- Key: profilePicture
- Value: Select File (jpg, jpeg, png, or gif)
```

Expected Success Response:
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "profilePicture": {
      "url": "https://res.cloudinary.com/your-cloud-name/image/upload/...",
      "publicId": "profile-pictures/..."
    }
  }
}
```

### 2. Delete Profile Picture

```http
DELETE http://localhost:5001/api/v1/profile/picture
Authorization: Bearer your_access_token
```

Expected Success Response:
```json
{
  "success": true,
  "message": "Profile picture deleted successfully",
  "data": {
    "profilePicture": {
      "url": "https://res.cloudinary.com/your-cloud-name/image/upload/v1/profile-pictures/default-avatar.png",
      "publicId": null
    }
  }
}
```

## Testing Flow

1. First, log in to get an access token using any auth endpoint
2. Use the access token in the Authorization header
3. Test uploading a profile picture:
   - Use Postman's form-data
   - Select a valid image file
   - Send the request
4. Verify the image URL in the response
5. Try updating with a new image
6. Test deleting the profile picture

## Error Handling

The API handles various error cases:

1. File too large (>5MB):
```json
{
  "success": false,
  "message": "File too large"
}
```

2. Invalid file type:
```json
{
  "success": false,
  "message": "Only image files are allowed!"
}
```

3. No file uploaded:
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

## File Processing

1. Local Upload:
   - Files are temporarily stored in `/uploads` directory
   - Unique filename generated using UUID
   - Original file extension preserved

2. Cloud Upload:
   - Image optimized to max 500x500 pixels
   - Stored in 'profile-pictures' folder on Cloudinary
   - Secure HTTPS URL provided

3. Cleanup:
   - Local file deleted after successful cloud upload
   - Old cloud image deleted when updating profile picture
   - Local file deleted if cloud upload fails

## Security Features

1. File validation:
   - Only images allowed (jpg, jpeg, png, gif)
   - Max file size: 5MB
   - Secure filename generation

2. Authentication:
   - Protected routes require valid JWT token
   - One profile picture per user

3. Storage:
   - Temporary local storage with automatic cleanup
   - Secure cloud storage with Cloudinary
   - Public IDs tracked for proper cleanup

## Common Issues

1. "Error uploading to cloud storage":
   - Check Cloudinary credentials
   - Verify API key permissions
   - Check file size and format

2. "Authorization failed":
   - Ensure valid access token
   - Token must be in Bearer format

3. File not showing up:
   - Check response URL
   - Verify Cloudinary folder permissions
   - Check file format compatibility