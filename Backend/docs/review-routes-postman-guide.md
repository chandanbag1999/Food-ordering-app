# Review Routes Postman Testing Guide

## Server Information
The server is running on port 5001 as configured in server.js. Base URL for all requests: `http://localhost:5001`

## Authentication
Most review routes require authentication. You'll need to:

1. First login to get a token:
   - **URL**: `http://localhost:5001/api/v1/auth/login`
   - **Method**: POST
   - **Body**: 
     ```json
     {
       "email": "your_email@example.com",
       "password": "your_password"
     }
     ```
   - **Response**: Copy the `token` from the response

2. For all authenticated requests, add the token to your request headers:
   - Key: `Authorization`
   - Value: `Bearer your_token_here`

## Review Routes Testing

### 1. Get a Single Review
- **URL**: `http://localhost:5001/api/v1/reviews/:reviewId`
- **Method**: GET
- **Authentication**: Not required (public route)
- **URL Parameters**: Replace `:reviewId` with the actual review ID
- **Example**: `http://localhost:5001/api/v1/reviews/60d21b4667d0d8992e610c85`

### 2. Update a Review
- **URL**: `http://localhost:5001/api/v1/reviews/:reviewId`
- **Method**: PUT
- **Authentication**: Required (customer role)
- **URL Parameters**: Replace `:reviewId` with the actual review ID
- **Body**:
  ```json
  {
    "rating": 4,
    "text": "Updated review text",
    "photos": ["url_to_photo1", "url_to_photo2"]
  }
  ```
- **Notes**: Only the customer who created the review or a super_admin can update it

### 3. Delete a Review
- **URL**: `http://localhost:5001/api/v1/reviews/:reviewId`
- **Method**: DELETE
- **Authentication**: Required (customer or super_admin role)
- **URL Parameters**: Replace `:reviewId` with the actual review ID
- **Notes**: Only the customer who created the review or a super_admin can delete it

### 4. Respond to a Review (Restaurant Owner)
- **URL**: `http://localhost:5001/api/v1/reviews/:reviewId/respond`
- **Method**: PUT
- **Authentication**: Required (restaurant_owner or super_admin role)
- **URL Parameters**: Replace `:reviewId` with the actual review ID
- **Body**:
  ```json
  {
    "text": "Thank you for your feedback. We appreciate your comments and will work to improve our service."
  }
  ```
- **Notes**: Only the restaurant owner or a super_admin can respond to reviews

### 5. Report a Review
- **URL**: `http://localhost:5001/api/v1/reviews/:reviewId/report`
- **Method**: PUT
- **Authentication**: Required (customer, restaurant_owner, super_admin, or sub_admin role)
- **URL Parameters**: Replace `:reviewId` with the actual review ID
- **Body**:
  ```json
  {
    "reason": "This review contains inappropriate content"
  }
  ```
- **Notes**: A user can only report a review once

### 6. Get All Reported Reviews (Admin Only)
- **URL**: `http://localhost:5001/api/v1/reviews/admin/reported`
- **Method**: GET
- **Authentication**: Required (super_admin or sub_admin role)
- **Query Parameters** (optional):
  - `page`: Page number (default: 1)
  - `limit`: Number of reviews per page (default: 20)
- **Example**: `http://localhost:5001/api/v1/reviews/admin/reported?page=1&limit=10`

### 7. Moderate a Review (Admin Only)
- **URL**: `http://localhost:5001/api/v1/reviews/:reviewId/moderate`
- **Method**: PUT
- **Authentication**: Required (super_admin or sub_admin role)
- **URL Parameters**: Replace `:reviewId` with the actual review ID
- **Body**:
  ```json
  {
    "action": "approve" 
  }
  ```
- **Notes**: 
  - `action` can be either "approve" (clears reported status) or "remove" (deactivates the review)

## Additional Routes for Reviews

These routes are not directly in ReviewRoutes.js but are related to reviews:

### 1. Get All Reviews for a Restaurant
- **URL**: `http://localhost:5001/api/v1/restaurants/:restaurantId/reviews`
- **Method**: GET
- **Authentication**: Not required
- **URL Parameters**: Replace `:restaurantId` with the actual restaurant ID
- **Query Parameters** (optional):
  - `rating`: Filter by rating (1-5)
  - `verified`: Filter by verified orders (true/false)
  - `page`: Page number
  - `limit`: Number of reviews per page
  - `sort`: Sort field (e.g., "-createdAt" for newest first)
- **Example**: `http://localhost:5001/api/v1/restaurants/60d21b4667d0d8992e610c85/reviews?rating=5&verified=true&page=1&limit=10`

### 2. Create a Review for a Restaurant
- **URL**: `http://localhost:5001/api/v1/restaurants/:restaurantId/reviews`
- **Method**: POST
- **Authentication**: Required (customer role)
- **URL Parameters**: Replace `:restaurantId` with the actual restaurant ID
- **Body**:
  ```json
  {
    "rating": 5,
    "text": "Excellent food and service!",
    "photos": ["url_to_photo1", "url_to_photo2"],
    "orderId": "60d21b4667d0d8992e610c85" 
  }
  ```
- **Notes**: 
  - `orderId` is used to verify if the review is based on an actual order
  - A user can only review a restaurant once

### 3. Get All Reviews by a User
- **URL**: `http://localhost:5001/api/v1/users/:userId/reviews`
- **Method**: GET
- **Authentication**: Required (must be the user or an admin)
- **URL Parameters**: Replace `:userId` with the actual user ID
- **Query Parameters** (optional):
  - `page`: Page number
  - `limit`: Number of reviews per page
- **Example**: `http://localhost:5001/api/v1/users/60d21b4667d0d8992e610c85/reviews?page=1&limit=10`

## Testing Tips

1. **Role-Based Testing**: Make sure to test with different user roles (customer, restaurant_owner, super_admin, sub_admin) to verify authorization works correctly.

2. **Error Handling**: Test error scenarios like:
   - Trying to update/delete a review that doesn't belong to you
   - Reporting a review multiple times
   - Accessing admin routes without admin privileges

3. **Pagination**: Test pagination by setting different page and limit values.

4. **Filtering**: Test filtering options where available (e.g., by rating).

5. **Invalid IDs**: Test with invalid review/restaurant/user IDs to ensure proper error handling.