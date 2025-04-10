const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dbHandler = require('../setup');
const app = require('../../../src/server'); // This will need to be modified to export the app
const User = require('../../../src/models/userModel');
const Restaurant = require('../../../src/models/RestaurantModel');
const Session = require('../../../src/models/sessionModel');

describe('Restaurant Routes', () => {
  let ownerUser;
  let adminUser;
  let ownerToken;
  let adminToken;
  let testRestaurant;
  let ownerSession;
  let adminSession;

  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  beforeEach(async () => {
    await dbHandler.clearDatabase();

    // Create test users
    ownerUser = await User.create({
      fullname: 'Restaurant Owner',
      email: 'owner@test.com',
      phoneNumber: '1234567890',
      password: 'password123',
      role: 'restaurant_owner'
    });

    adminUser = await User.create({
      fullname: 'Admin User',
      email: 'admin@test.com',
      phoneNumber: '0987654321',
      password: 'password123',
      role: 'super_admin'
    });

    // Create sessions
    ownerSession = await Session.create({
      userId: ownerUser._id,
      isActive: true,
      lastActive: new Date()
    });

    adminSession = await Session.create({
      userId: adminUser._id,
      isActive: true,
      lastActive: new Date()
    });

    // Create tokens
    ownerToken = jwt.sign(
      { userId: ownerUser._id, sessionId: ownerSession._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminUser._id, sessionId: adminSession._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test restaurant
    testRestaurant = await Restaurant.create({
      name: 'Test Restaurant',
      ownerId: ownerUser._id,
      description: 'A test restaurant',
      cuisineType: ['Italian', 'Mexican'],
      address: {
        street: 'Test Street',
        state: 'Test State',
        zipCode: '12345',
        coordinates: {
          latitude: 12.345,
          longitude: 67.890
        }
      },
      contactPhone: '1234567890',
      email: 'restaurant@test.com',
      openingHours: {
        monday: { open: '09:00', close: '21:00', isClosed: false },
        tuesday: { open: '09:00', close: '21:00', isClosed: false },
        wednesday: { open: '09:00', close: '21:00', isClosed: false },
        thursday: { open: '09:00', close: '21:00', isClosed: false },
        friday: { open: '09:00', close: '21:00', isClosed: false },
        saturday: { open: '09:00', close: '21:00', isClosed: false },
        sunday: { open: '09:00', close: '21:00', isClosed: false }
      },
      isActive: true,
      isApproved: true
    });

    // Update owner with restaurant ID
    await User.findByIdAndUpdate(ownerUser._id, { restaurantId: testRestaurant._id });
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('GET /api/v1/restaurants', () => {
    it('should return all active and approved restaurants', async () => {
      const res = await request(app).get('/api/v1/restaurants');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Restaurant');
    });

    it('should filter restaurants by cuisine', async () => {
      const res = await request(app).get('/api/v1/restaurants?cuisine=Italian');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      
      // Test with non-matching cuisine
      const res2 = await request(app).get('/api/v1/restaurants?cuisine=Chinese');
      
      expect(res2.statusCode).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data).toHaveLength(0);
    });

    it('should support pagination', async () => {
      // Create more restaurants to test pagination
      await Promise.all([
        Restaurant.create({
          name: 'Test Restaurant 2',
          ownerId: ownerUser._id,
          description: 'Another test restaurant',
          cuisineType: ['Japanese'],
          address: {
            street: 'Test Street',
            state: 'Test State',
            zipCode: '12345',
            coordinates: {
              latitude: 12.345,
              longitude: 67.890
            }
          },
          contactPhone: '1234567890',
          email: 'restaurant2@test.com',
          openingHours: {
            monday: { open: '09:00', close: '21:00', isClosed: false },
            tuesday: { open: '09:00', close: '21:00', isClosed: false },
            wednesday: { open: '09:00', close: '21:00', isClosed: false },
            thursday: { open: '09:00', close: '21:00', isClosed: false },
            friday: { open: '09:00', close: '21:00', isClosed: false },
            saturday: { open: '09:00', close: '21:00', isClosed: false },
            sunday: { open: '09:00', close: '21:00', isClosed: false }
          },
          isActive: true,
          isApproved: true
        }),
        Restaurant.create({
          name: 'Test Restaurant 3',
          ownerId: ownerUser._id,
          description: 'Yet another test restaurant',
          cuisineType: ['Indian'],
          address: {
            street: 'Test Street',
            state: 'Test State',
            zipCode: '12345',
            coordinates: {
              latitude: 12.345,
              longitude: 67.890
            }
          },
          contactPhone: '1234567890',
          email: 'restaurant3@test.com',
          openingHours: {
            monday: { open: '09:00', close: '21:00', isClosed: false },
            tuesday: { open: '09:00', close: '21:00', isClosed: false },
            wednesday: { open: '09:00', close: '21:00', isClosed: false },
            thursday: { open: '09:00', close: '21:00', isClosed: false },
            friday: { open: '09:00', close: '21:00', isClosed: false },
            saturday: { open: '09:00', close: '21:00', isClosed: false },
            sunday: { open: '09:00', close: '21:00', isClosed: false }
          },
          isActive: true,
          isApproved: true
        })
      ]);

      // Test first page with limit=2
      const res = await request(app).get('/api/v1/restaurants?page=1&limit=2');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.pages).toBe(2);

      // Test second page
      const res2 = await request(app).get('/api/v1/restaurants?page=2&limit=2');
      
      expect(res2.statusCode).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/restaurants/:restaurantId', () => {
    it('should return a restaurant by ID', async () => {
      const res = await request(app).get(`/api/v1/restaurants/${testRestaurant._id}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testRestaurant._id.toString());
      expect(res.body.data.name).toBe('Test Restaurant');
    });

    it('should return 404 for non-existing restaurant', async () => {
      const nonExistingId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/restaurants/${nonExistingId}`);
      
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid restaurant ID', async () => {
      const res = await request(app).get('/api/v1/restaurants/invalid-id');
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/restaurants', () => {
    it('should require authentication', async () => {
      const res = await request(app).post('/api/v1/restaurants').send({
        name: 'New Restaurant',
        description: 'A new restaurant',
        cuisineType: ['Italian']
      });
      
      expect(res.statusCode).toBe(401);
    });

    it('should not allow non-restaurant-owners to create restaurants', async () => {
      const res = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Restaurant',
          description: 'A new restaurant',
          cuisineType: ['Italian']
        });
      
      expect(res.statusCode).toBe(403);
    });

    it('should not allow owners with existing restaurants to create another', async () => {
      const res = await request(app)
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Another Restaurant',
          description: 'Another restaurant',
          cuisineType: ['Italian']
        });
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already have a restaurant');
    });
  });
}); 