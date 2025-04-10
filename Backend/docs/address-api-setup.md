# Address API Setup Guide

This guide explains how to set up and use the address management features with Google Maps integration.

## Environment Variables

Add the following to your `.env` file:

```
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

To get a Google Maps API key:
1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Geocoding API
   - Places API
   - Maps JavaScript API
4. Create credentials (API key)
5. Copy the API key to your `.env` file

## Testing with Postman

### 1. Add a New Address

```http
POST /api/v1/addresses
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "type": "home",
  "label": "My Home",
  "street": "123 Main St",
  "landmark": "Near City Park",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zipCode": "400001",
  "isDefault": true
}
```

### 2. Get All Addresses

```http
GET /api/v1/addresses
Authorization: Bearer your_access_token
```

### 3. Update Address

```http
PUT /api/v1/addresses/:addressId
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "label": "Updated Home",
  "landmark": "Next to Shopping Mall"
}
```

### 4. Delete Address

```http
DELETE /api/v1/addresses/:addressId
Authorization: Bearer your_access_token
```

### 5. Get Address Suggestions

```http
GET /api/v1/addresses/suggestions?latitude=19.0760&longitude=72.8777
Authorization: Bearer your_access_token
```

### 6. Search Nearby Places

```http
GET /api/v1/addresses/nearby?latitude=19.0760&longitude=72.8777&radius=5000&type=restaurant
Authorization: Bearer your_access_token
```

## Response Examples

### Successful Address Addition
```json
{
  "success": true,
  "message": "Address added successfully",
  "data": {
    "type": "home",
    "label": "My Home",
    "street": "123 Main St",
    "landmark": "Near City Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    },
    "isDefault": true,
    "formattedAddress": "123 Main St, Mumbai, Maharashtra 400001, India",
    "placeId": "ChIJ...",
    "_id": "...",
    "userId": "..."
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid address",
  "error": "Could not validate address"
}
```

## Testing Flow

1. First, log in using any of the authentication endpoints to get an access token
2. Use the access token in the Authorization header for all address endpoints
3. Start by adding a new address
4. Try updating the address with new details
5. Get all addresses to verify the changes
6. Test the nearby search functionality
7. Finally, test address deletion

## Common Issues

1. "Invalid API key" - Check your GOOGLE_MAPS_API_KEY in .env
2. "Invalid address" - Ensure address details are correct and Google Maps can find it
3. "Authorization failed" - Make sure you're using a valid access token
4. "Address not found" - Verify the addressId when updating/deleting

## Rate Limiting

- Google Maps API has usage limits based on your plan
- For testing, stay within the free tier limits:
  - 40,000 calls per month
  - 50 calls per second