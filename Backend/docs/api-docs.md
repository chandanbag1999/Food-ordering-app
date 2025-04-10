# MealLink API Documentation

## Authentication Endpoints

### Register User

Registers a new user in the system.

- **URL**: `/api/v1/auth/register/init`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "fullname": "John Doe",
    "email": "john@example.com"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Registration initiated successfully",
    "data": {
      "fullname": "John Doe",
      "email": "john@example.com"
    }
  }
  ```

### Verify Phone

Verifies and associates a phone number with the registering user.

- **URL**: `/api/v1/auth/register/verify-phone`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "phoneNumber": "1234567890"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "OTP sent to your phone number",
    "data": {
      "phoneNumber": "1234567890"
    }
  }
  ```

### Verify OTP

Verifies the OTP sent to the user's phone number for registration.

- **URL**: `/api/v1/auth/register/verify-otp`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "phoneNumber": "1234567890",
    "otp": "123456"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "OTP verified successfully"
  }
  ```

### Email Login

Initiates email-based login.

- **URL**: `/api/v1/auth/login/email`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "jwt-token-here",
      "user": {
        "id": "user-id",
        "fullname": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "phoneNumber": "1234567890"
      }
    }
  }
  ```

## Restaurant Endpoints

### Get All Restaurants

Returns a paginated list of all active and approved restaurants.

- **URL**: `/api/v1/restaurants`
- **Method**: `GET`
- **Auth Required**: No
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Number of results per page (default: 10)
  - `cuisine` (optional): Filter by cuisine type(s), comma separated
  - `vegetarian` (optional): Filter by vegetarian restaurants (true/false)
  - `vegan` (optional): Filter by vegan restaurants (true/false)
  - `delivery` (optional): Filter by delivery availability (true/false)
  - `takeaway` (optional): Filter by takeaway availability (true/false)
  - `dineIn` (optional): Filter by dine-in availability (true/false)
  - `search` (optional): Search term for restaurant name, description, or city
  - `sort` (optional): Sort field(s), comma separated, prefix with "-" for descending order

- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "restaurant_id",
        "name": "Restaurant Name",
        "description": "Restaurant description",
        "cuisineType": ["Italian", "Mexican"],
        "rating": 4.5,
        "address": {
          "street": "123 Main St",
          "state": "State",
          "zipCode": "12345",
          "coordinates": {
            "latitude": 12.345,
            "longitude": 67.890
          }
        },
        "contactPhone": "1234567890",
        "email": "restaurant@example.com",
        "openingHours": {
          "monday": { "open": "09:00", "close": "22:00", "isClosed": false },
          // Other days of week...
        },
        "features": {
          "hasDelivery": true,
          "hasTakeaway": true,
          "hasDineIn": true,
          "hasParking": false,
          "hasWifi": true,
          "isVegetarian": false,
          "isVegan": false
        }
      }
      // More restaurants...
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "pages": 5
    },
    "count": 10,
    "message": "Restaurants fetched successfully"
  }
  ```

### Get Restaurant by ID

Returns a single restaurant by its ID.

- **URL**: `/api/v1/restaurants/:restaurantId`
- **Method**: `GET`
- **Auth Required**: No
- **URL Parameters**: `restaurantId` - ID of the restaurant
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "_id": "restaurant_id",
      "name": "Restaurant Name",
      "description": "Restaurant description",
      "cuisineType": ["Italian", "Mexican"],
      "rating": 4.5,
      "address": {
        "street": "123 Main St",
        "state": "State",
        "zipCode": "12345",
        "coordinates": {
          "latitude": 12.345,
          "longitude": 67.890
        }
      },
      "contactPhone": "1234567890",
      "email": "restaurant@example.com",
      "openingHours": {
        "monday": { "open": "09:00", "close": "22:00", "isClosed": false },
        // Other days of week...
      },
      "features": {
        "hasDelivery": true,
        "hasTakeaway": true,
        "hasDineIn": true,
        "hasParking": false,
        "hasWifi": true,
        "isVegetarian": false,
        "isVegan": false
      }
    }
  }
  ```

### Create Restaurant

Creates a new restaurant. Only available for users with `restaurant_owner` role.

- **URL**: `/api/v1/restaurants`
- **Method**: `POST`
- **Auth Required**: Yes (Restaurant Owner)
- **Request Body**:
  ```json
  {
    "name": "New Restaurant",
    "description": "Description of the restaurant",
    "cuisineType": ["Italian", "Mediterranean"],
    "address": {
      "street": "123 Main St",
      "state": "State",
      "zipCode": "12345",
      "coordinates": {
        "latitude": 12.345,
        "longitude": 67.890
      }
    },
    "contactPhone": "1234567890",
    "email": "restaurant@example.com",
    "openingHours": {
      "monday": { "open": "09:00", "close": "22:00", "isClosed": false },
      "tuesday": { "open": "09:00", "close": "22:00", "isClosed": false },
      "wednesday": { "open": "09:00", "close": "22:00", "isClosed": false },
      "thursday": { "open": "09:00", "close": "22:00", "isClosed": false },
      "friday": { "open": "09:00", "close": "22:00", "isClosed": false },
      "saturday": { "open": "09:00", "close": "22:00", "isClosed": false },
      "sunday": { "open": "09:00", "close": "22:00", "isClosed": true }
    },
    "features": {
      "hasDelivery": true,
      "hasTakeaway": true,
      "hasDineIn": true,
      "hasParking": false,
      "hasWifi": true,
      "isVegetarian": false,
      "isVegan": false
    },
    "deliverySettings": {
      "minOrderAmount": 10,
      "deliveryFee": 2.5,
      "freeDeliveryMinAmount": 25,
      "deliveryRadius": 5,
      "estimatedDeliveryTime": 30
    },
    "paymentMethods": {
      "acceptCash": true,
      "acceptsCard": true,
      "acceptsUPI": true,
      "acceptsWallet": false
    }
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Restaurant created successfully",
    "data": {
      "_id": "restaurant_id",
      "name": "New Restaurant",
      // ... all other fields
    }
  }
  ```

### Update Restaurant

Updates an existing restaurant. Available to the restaurant owner or admins.

- **URL**: `/api/v1/restaurants/:restaurantId`
- **Method**: `PUT`
- **Auth Required**: Yes (Restaurant Owner or Admin)
- **URL Parameters**: `restaurantId` - ID of the restaurant
- **Request Body**: Any fields that need to be updated
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Restaurant updated successfully",
    "data": {
      "_id": "restaurant_id",
      "name": "Updated Restaurant Name",
      // ... updated fields
    }
  }
  ```

### Delete Restaurant

Deletes a restaurant. Available to the restaurant owner or super admin.

- **URL**: `/api/v1/restaurants/:restaurantId`
- **Method**: `DELETE`
- **Auth Required**: Yes (Restaurant Owner or Super Admin)
- **URL Parameters**: `restaurantId` - ID of the restaurant
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Restaurant deleted successfully"
  }
  ```

### Get My Restaurant

Returns the restaurant owned by the authenticated user. Only for restaurant owners.

- **URL**: `/api/v1/restaurants/my-restaurant`
- **Method**: `GET`
- **Auth Required**: Yes (Restaurant Owner)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "_id": "restaurant_id",
      "name": "My Restaurant",
      // ... all restaurant fields
    }
  }
  ```

### Approve Restaurant

Approves, rejects, or sets a restaurant's approval status to pending. Admin only.

- **URL**: `/api/v1/restaurants/approve/:restaurantId`
- **Method**: `PUT`
- **Auth Required**: Yes (Admin)
- **URL Parameters**: `restaurantId` - ID of the restaurant
- **Request Body**:
  ```json
  {
    "status": "approved", // or "rejected" or "pending"
    "remarks": "Restaurant approved after review."
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Restaurant approved successfully",
    "data": {
      "_id": "restaurant_id",
      "name": "Restaurant Name",
      "approvalStatus": "approved",
      "approvalRemarks": "Restaurant approved after review.",
      "isApproved": true,
      "approvedBy": "admin_id",
      "approvedAt": "2023-06-15T10:30:00.000Z",
      // ... other fields
    }
  }
  ```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error message describing the issue"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Role [role] is not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server Error"
}
``` 