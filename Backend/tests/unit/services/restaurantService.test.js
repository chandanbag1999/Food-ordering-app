const mongoose = require('mongoose');
const restaurantService = require('../../../src/services/restaurantService');
const Restaurant = require('../../../src/models/RestaurantModel');
const User = require('../../../src/models/userModel');

// Mock the dependencies
jest.mock('../../../src/models/RestaurantModel');
jest.mock('../../../src/models/userModel');

describe('Restaurant Service Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllRestaurants', () => {
    it('should return restaurants with pagination', async () => {
      // Mock data
      const mockRestaurants = [
        { _id: 'restaurant1', name: 'Restaurant 1', rating: 4.5 },
        { _id: 'restaurant2', name: 'Restaurant 2', rating: 4.7 }
      ];

      // Setup mock implementations
      Restaurant.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockRestaurants)
          })
        })
      });

      Restaurant.countDocuments.mockResolvedValue(2);

      // Call the service
      const result = await restaurantService.getAllRestaurants({ limit: 10, page: 1 });

      // Assertions
      expect(Restaurant.find).toHaveBeenCalled();
      expect(Restaurant.countDocuments).toHaveBeenCalled();
      expect(result.restaurants).toEqual(mockRestaurants);
      expect(result.count).toBe(2);
      expect(result.pagination).toHaveProperty('total', 2);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);
      expect(result.pagination).toHaveProperty('pages', 1);
    });

    it('should apply filters correctly', async () => {
      // Setup query parameters
      const queryParams = {
        cuisine: 'Italian,Indian',
        vegetarian: 'true',
        search: 'pasta',
        page: '2',
        limit: '5'
      };

      // Mock implementation
      Restaurant.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      Restaurant.countDocuments.mockResolvedValue(0);

      // Call the service
      await restaurantService.getAllRestaurants(queryParams);

      // Assertions for query building
      expect(Restaurant.find).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
        isApproved: true,
        cuisineType: { $in: ['Italian', 'Indian'] },
        'features.isVegetarian': true
      }));
    });
  });

  describe('getRestaurantById', () => {
    it('should return a restaurant by ID', async () => {
      // Mock data
      const mockRestaurant = {
        _id: 'restaurant1',
        name: 'Restaurant 1',
        isActive: true,
        isApproved: true,
        ownerId: new mongoose.Types.ObjectId()
      };

      // Mock ObjectId validation
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock Restaurant.findById
      Restaurant.findById.mockResolvedValue(mockRestaurant);

      // Call the service
      const result = await restaurantService.getRestaurantById('restaurant1');

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith('restaurant1');
      expect(Restaurant.findById).toHaveBeenCalledWith('restaurant1');
      expect(result).toEqual(mockRestaurant);
    });

    it('should throw error for invalid ID format', async () => {
      // Mock ObjectId validation to fail
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

      // Call the service and expect it to throw
      await expect(restaurantService.getRestaurantById('invalid-id'))
        .rejects.toThrow('Invalid restaurant ID format');

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith('invalid-id');
      expect(Restaurant.findById).not.toHaveBeenCalled();
    });

    it('should throw error if restaurant not found', async () => {
      // Mock ObjectId validation
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      
      // Mock Restaurant.findById to return null
      Restaurant.findById.mockResolvedValue(null);

      // Call the service and expect it to throw
      await expect(restaurantService.getRestaurantById('existing-id'))
        .rejects.toThrow('Restaurant not found');

      // Assertions
      expect(Restaurant.findById).toHaveBeenCalledWith('existing-id');
    });
  });

  describe('createRestaurant', () => {
    it('should create a restaurant and update user', async () => {
      // Mock data
      const restaurantData = {
        name: 'New Restaurant',
        description: 'A fantastic restaurant'
      };
      const userId = 'user1';
      const createdRestaurant = {
        _id: 'restaurant1',
        ...restaurantData,
        ownerId: userId
      };

      // Mock implementations
      Restaurant.create.mockResolvedValue(createdRestaurant);
      User.findByIdAndUpdate.mockResolvedValue({});

      // Call the service
      const result = await restaurantService.createRestaurant(restaurantData, userId);

      // Assertions
      expect(Restaurant.create).toHaveBeenCalledWith({
        ...restaurantData,
        ownerId: userId
      });
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, { restaurantId: 'restaurant1' });
      expect(result).toEqual(createdRestaurant);
    });
  });
}); 