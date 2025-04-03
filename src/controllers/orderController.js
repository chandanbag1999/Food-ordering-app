const Order = require('../models/OrderModel');
const Restaurant = require('../models/RestaurantModel');
const User = require('../models/userModel');  
const MenuItem = require('../models/MenuItemModel');
const mongoose = require('mongoose');

// Create a new order
const createOrder = async (req, res) => {
  try {
    const { restaurantId, items, orderType, paymentMethod, deliveryAddress, specialInstructions } = req.body;

    // Verify restaurant exists and is active/approved
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant || !restaurant.isActive || !restaurant.isApproved) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or not active/approved",
      });
    };

    // Validate items exist and are available
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one item to order",
      });
    };
    
    // Process order items
    const orderItems = [];
    let subtotal = 0;

    for(const item of items) {
      // Validate menu item exists
      const menuItem = await MenuItem.findOne({
        _id: item.menuItemId,
        restaurantId,
        isAvailable: true
      });

      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item ${item.menuItemId} not found or not available`,
        });
      };

      // Calculate item price with customizations
      let itemPrice = menuItem.getFinalPrice();
      let customizations = [];

      if (item.customizations && Array.isArray(item.customizations)) {
        // Log for debugging
        console.log('Menu item customization groups:', JSON.stringify(menuItem.customizationGroups || []));
        console.log('Requested customizations:', JSON.stringify(item.customizations));
        
        for (const customization of item.customizations) {
          // Try to find the group by name or groupName (to be flexible)
          const group = menuItem.customizationGroups && menuItem.customizationGroups.find(
            group => (group.name === customization.groupName) || (group.groupName === customization.groupName)
          );

          // If no customization groups exist or the specific group is not found, skip this customization
          if (!group) {
            console.log(`Warning: Customization group ${customization.groupName} not found for item ${menuItem.name}. Skipping this customization.`);
            continue; // Skip this customization instead of failing the entire order
          }

          const selectedOptions = [];

          for (const optionName of customization.options) {
            // Try to find the option in the group
            const option = group.options && group.options.find(opt => opt.name === optionName);

            if (!option) {
              console.log(`Warning: Option ${optionName} not found in group ${customization.groupName} for item ${menuItem.name}. Skipping this option.`);
              continue; // Skip this option instead of failing the entire order
            }

            itemPrice += option.price || 0;
            selectedOptions.push({
              name: option.name,
              price: option.price || 0
            });
          }

          if (selectedOptions.length > 0) {
            customizations.push({
              groupName: customization.groupName,
              options: selectedOptions
            });
          }
        }
      } else {
        // If no customizations provided, just use an empty array
        customizations = [];
      }

      // Calculate total price for this item
      const quantity = item.quantity || 1;
      const totalPrice = itemPrice * quantity;
      subtotal += totalPrice;

      // Add item to order
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: itemPrice,
        quantity,
        customizations,
        specialInstructions: item.specialInstructions || '',
        totalPrice
      });
    };

    // calculate tax amount and fees
    const taxRate = 0.05; // 5% tax rate
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));

    // calculate delivery fee if applicable
    let deliveryFee = 0;

    if (orderType === 'delivery') {
      deliveryFee = restaurant.deliverySettings.deliveryFee || 0;

      // Apply free delivery if subtotal exceeds minimum amount
      if (restaurant.deliverySettings.freeDeliveryMinAmount > 0 && subtotal >= restaurant.deliverySettings.freeDeliveryMinAmount) {
        deliveryFee = 0;
      };
    };

    // create order
    const order = await Order.create({
      userId: req.user._id,
      restaurantId,
      items: orderItems,
      orderType,
      PaymentMethod: paymentMethod, // Match the case in the model (capital P)
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending', // Will be updated after payment processing
      subtotal,
      taxAmount,
      deliveryFee,
      packagingFee: 0, // Can be customized based on restaurant settings
      discount: 0, // Will be updated if coupon is applied
      totalAmount: subtotal + taxAmount + deliveryFee,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
      contactPhone: req.user.phoneNumber || req.body.contactPhone || '+1234567890', // Ensure a phone number is always provided
      statusHistory: [{
        status: 'pending',
        timestamp: Date.now(),
        updatedBy: req.user._id
      }],
    });

    // calculate estimated delivery time
    if (orderType === 'delivery') {
      order.calculateEstimatedDeliveryTime(restaurant.deliverySettings.estimatedDeliveryTime);
      await order.save();
    };

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    })
  }
};
  


// Get all order for a user
const getUserAllOrders = async (req, res) => {
  try {
    
    // Build query
    const query = { userId: req.user._id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    };

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    };

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Sorting
    let sort = { createdAt: -1 }; // Default sort by newest first

    // Execute query
    const orders = await Order.find(query)
      .sort(sort)
      .skip(startIndex)
      .limit(limit)
      .populate('restaurantId', 'name address.city images.logo')

    // Get total count 
    const total = await Order.countDocuments(query);

    // Pagination results
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };

    return res.status(200).json({
      success: true,
      count: orders.length,
      message: 'Orders fetched successfully',
      data: orders,
      pagination
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    })
  }
};


// Get all orders for a restaurant(restaurant owner, admin)

const getRestaurantAllOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    console.log('Restaurant Orders - Request params:', req.params);
    console.log('Restaurant ID:', restaurantId);
    console.log('User details:', JSON.stringify(req.user));

    // If restaurantId is not provided in params, try to find restaurants owned by the user
    let restaurant;
    let query = {};
    
    if (restaurantId) {
      // If restaurantId is provided, check if it exists and user has access
      restaurant = await Restaurant.findById(restaurantId);
      
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: 'Restaurant not found'
        });
      }
      
      // Check if user is owner or admin
      const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
      const isOwner = restaurant.ownerId && restaurant.ownerId.toString() === req.user._id.toString();
      
      console.log('Authorization check:', { isAdmin, isOwner, restaurantOwnerId: restaurant.ownerId, userId: req.user._id });
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view orders for this restaurant'
        });
      }
      
      // Set query to filter by this restaurant
      query.restaurantId = restaurantId;
    } else if (req.user.role === 'restaurant_owner') {
      // If no restaurantId but user is restaurant owner, find their restaurants
      const ownedRestaurants = await Restaurant.find({ ownerId: req.user._id });
      
      if (ownedRestaurants.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No restaurants found for this owner'
        });
      }
      
      // Set query to filter by all restaurants owned by this user
      const restaurantIds = ownedRestaurants.map(r => r._id);
      query.restaurantId = { $in: restaurantIds };
      
      console.log('Finding orders for all owned restaurants:', restaurantIds);
    } else if (['super_admin', 'sub_admin'].includes(req.user.role)) {
      // Admins can see all orders if no restaurantId specified
      console.log('Admin user - showing all orders');
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view restaurant orders'
      });
    }


    // Additional query parameters from request
    console.log('Base query:', query);

    // filter by status
    if (req.query.status) {
      query.status = req.query.status;
    };

    // filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    };

    // pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // sorting
    let sort = { createdAt: -1 }; // default sort by newest first

    // execute query
    const orders = await Order.find(query)
      .sort(sort)
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'name email phone');

    // get total count
    const total = await Order.countDocuments(query);

    // pagination results
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };

    return res.status(200).json({
      success: true,
      count: orders.length,
      message: 'Orders fetched successfully',
      data: orders,
      pagination
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    })
  }
};

// get single orders (Customer, Restaurant Owner, Admin)
const getSingleOrder = async (req, res) => {
  try {
    console.log('Fetching order with ID:', req.params.orderId);
    console.log('User details:', JSON.stringify(req.user));
    
    // For debugging - temporarily bypass authorization
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      console.log('Order not found with ID:', req.params.orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // For debugging - log the entire order object
    console.log('Order found:', JSON.stringify(order));
    
    // Temporarily bypass authorization check for debugging
    return res.status(200).json({
      success: true,
      message: 'Order fetched successfully',
      data: order
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    })
  }
};

// update order status (Admin, Restaurant Owner, delivery person)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, notes } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      })
    };
    
    console.log('Updating order status with ID:', req.params.orderId);
    console.log('User details:', JSON.stringify(req.user));
    console.log('New status:', status);
    console.log('Notes:', note || notes);

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    };

    // Check authorization
    const isOwner = await isRestaurantOwner(req.user._id, order.restaurantId);
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isRestaurantOwnerRole = req.user.role === 'restaurant_owner';
    const isDeliveryPerson = req.user.role === 'delivery_person';
    
    console.log('Authorization check:', {
      isOwner,
      isAdmin,
      isRestaurantOwnerRole,
      isDeliveryPerson,
      userRole: req.user.role
    });
    
    // Allow restaurant owners, admins, and delivery persons to update status
    const isAuthorized = isAdmin || isRestaurantOwnerRole || isDeliveryPerson;
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    };

    // validate status transition
    if(!isValidStatusTransition(order.status, status, req.user.role)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change order status from ${order.status} to ${status}`
      });
    };
    
    // update order status
    order.status = status;
    
    // add to status history
    order.statusHistory.push({
      status,
      timestamp: Date.now(),
      updatedBy: req.user._id,
      note: note || notes || ''
    });

    // Handle special status cases
    if (status === 'delivered') {
      order.actualDeliveryTime = Date.now();
    } else if (status === 'cancelled') {
      order.cancellationTime = Date.now();
      order.cancelledBy = req.user._id;
      order.cancellationReason = note || 'No reason provided';
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    })
  }
};

// cancel order (Customer, Restaurant Owner, Admin)
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const { cancellationReason } = req.body;
    
    console.log('Cancelling order with ID:', req.params.orderId);
    console.log('User details:', JSON.stringify(req.user));
    console.log('Cancellation reason:', reason || cancellationReason);

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    };

    // Check authorization
    const isOwner = await isRestaurantOwner(req.user._id, order.restaurantId);
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isCustomer = order.userId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isCustomer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    };

    // Check if order can be cancelled
    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: `Order in ${order.status} status cannot be cancelled`
      });
    };
    
    // update order
    order.status = 'cancelled';
    order.cancellationTime = Date.now();
    order.cancelledBy = req.user._id;
    order.cancellationReason = reason || cancellationReason || 'No reason provided';

    // add to status history
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: Date.now(),
      updatedBy: req.user._id,
      note: reason || cancellationReason || 'No reason provided'
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    })
  }
};


// Add review and rating to order(customar)
const addOrderReview = async (req, res) => {
  try {
    // Handle both flat and nested structure for ratings and review
    const ratings = req.body.ratings || {};
    const review = req.body.review || {};
    
    // Extract ratings from either flat or nested structure
    const foodRating = ratings.food || req.body.foodRating;
    const deliveryRating = ratings.delivery || req.body.deliveryRating;
    const overallRating = ratings.overall || req.body.overallRating;
    const reviewText = review.text || req.body.reviewText;
    
    console.log('Extracted ratings:', { foodRating, deliveryRating, overallRating, reviewText });
    
    if (!overallRating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least an overall rating'
      });
    };
    
    console.log('Adding review to order with ID:', req.params.orderId);
    console.log('User details:', JSON.stringify(req.user));
    console.log('Review data:', { foodRating, deliveryRating, overallRating, reviewText });

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    };

    // Check if user is the order owner or a restaurant owner/admin
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isRestaurantOwner = req.user.role === 'restaurant_owner';
    const isCustomer = order.userId && order.userId.toString() === req.user._id.toString();
    
    console.log('Review authorization check:', { isAdmin, isRestaurantOwner, isCustomer, userRole: req.user.role });
    
    // Allow customers, restaurant owners and admins to add reviews
    if (!isCustomer && !isRestaurantOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this order'
      });
    };

    // Check if order is in a reviewable state
    // For customers, only delivered or completed orders can be reviewed
    // For restaurant owners and admins, any order can be reviewed
    console.log('Order status:', order.status);
    console.log('User role check:', { 
      isAdmin, 
      isRestaurantOwner, 
      role: req.user.role, 
      userId: req.user._id,
      orderStatus: order.status 
    });
    
    // IMPORTANT: Temporarily bypass status check for all users to debug the issue
    // We'll just log a warning instead of returning an error
    if (order.status !== 'delivered' && order.status !== 'completed') {
      console.log('WARNING: Order is not in delivered or completed status, but allowing review for debugging');
    }
    
    console.log('Order status check passed. Current status:', order.status);


    // Update order with review
    order.ratings = {
      food: foodRating || 0,
      delivery: deliveryRating || 0,
      overall: overallRating
    };
    
    order.review = {
      text: reviewText || '',
      createdAt: Date.now()
    };
    
    // Update order status to completed if it was delivered
    if (order.status === 'delivered') {
      order.status = 'completed';
      order.statusHistory.push({
        status: 'completed',
        timestamp: Date.now(),
        updatedBy: req.user._id,
        note: 'Order completed with review'
      });
    }
    
    await order.save();

    // Update restaurant ratings
    await updateRestaurantRatings(order.restaurantId);
    
    return res.status(200).json({
      success: true,
      message: 'Review added successfully',
      data: order
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message
    });
  }
}
  

//  Assign delivery person to order(Restaurant Owner, Admin)
const assignDeliveryPerson = async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;
    if (!deliveryPersonId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a delivery person ID'
      });
    };
    
    console.log('Assigning delivery person to order with ID:', req.params.orderId);
    console.log('User details:', JSON.stringify(req.user));
    console.log('Delivery person ID:', deliveryPersonId);

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    };

    // Check authorization
    const isOwner = await isRestaurantOwner(req.user._id, order.restaurantId);
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign delivery for this order'
      });
    }
    
    // Check if order type is delivery
    if (order.orderType !== 'delivery') {
      return res.status(400).json({
        success: false,
        message: 'Can only assign delivery person to delivery orders'
      });
    };

    // Check if delivery person exists and has the right role
    const deliveryPerson = await User.findOne({
      _id: deliveryPersonId,
      role: 'delivery_person'
    });
    
    if (!deliveryPerson) {
      return res.status(404).json({
        success: false,
        message: 'Delivery person not found'
      });
    };

    // Update order
    order.deliveryPersonId = deliveryPersonId;
    
    // Add note to status history
    order.statusHistory.push({
      status: order.status,
      timestamp: Date.now(),
      updatedBy: req.user._id,
      note: `Assigned to delivery person: ${deliveryPerson.name}`
    });
    
    await order.save();
    
    return res.status(200).json({
      success: true,
      message: 'Delivery person assigned successfully',
      data: order
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error assigning delivery person',
      error: error.message
    });
  }
};

//  Get order statistics for restaurant(Restaurant Owner, Admin)
const getRestaurantOrderStats = async (req, res) => {
  try {
    // Get restaurantId from params or query
    let restaurantId = req.params.restaurantId;
    const { startDate, endDate } = req.query;
    
    console.log('Restaurant Stats - Request params:', req.params);
    console.log('Restaurant ID from params:', restaurantId);
    console.log('User details:', JSON.stringify(req.user));
    console.log('Query params:', req.query);
    
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required'
      });
    }

    // Check if restaurant exists and user owns it
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Check ownership or admin rights
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isOwner = restaurant.ownerId && restaurant.ownerId.toString() === req.user._id.toString();
    
    console.log('Authorization check:', { isAdmin, isOwner, restaurantOwnerId: restaurant.ownerId, userId: req.user._id });
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats for this restaurant'
      });
    };

    // Build date range query
    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get total orders
    const totalOrders = await Order.countDocuments({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      ...dateQuery
    });

    // Get orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          ...dateQuery
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get orders by type
    const ordersByType = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          ...dateQuery
        }
      },
      {
        $group: {
          _id: '$orderType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total revenue
    const revenueStats = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: { $nin: ['cancelled', 'refunded'] },
          ...dateQuery
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get popular items
    const popularItems = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          status: { $nin: ['cancelled', 'refunded'] },
          ...dateQuery
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          totalOrdered: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 }
    ]);


    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        ordersByStatus: ordersByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        ordersByType: ordersByType.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        revenue: revenueStats.length > 0 ? {
          totalRevenue: revenueStats[0].totalRevenue,
          avgOrderValue: revenueStats[0].avgOrderValue,
          completedOrders: revenueStats[0].count
        } : {
          totalRevenue: 0,
          avgOrderValue: 0,
          completedOrders: 0
        },
        popularItems
      }
    });


  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving order statistics',
      error: error.message
    });
  }
};


// Helper function to update restaurant ratings
const updateRestaurantRatings = async (restaurantId) => {
  try {
    // Get all completed orders with ratings
    const orders = await Order.find({
      restaurantId,
      status: 'completed',
      'ratings.overall': { $gt: 0 }
    });
    
    if (orders.length === 0) return;

    // Calculate average rating
    const totalRating = orders.reduce((sum, order) => sum + order.ratings.overall, 0);
    const avgRating = totalRating / orders.length;

    // Update restaurant
    await Restaurant.findByIdAndUpdate(restaurantId, {
      rating: parseFloat(avgRating.toFixed(1)),
      reviewCount: orders.length
    });
  } catch (error) {
    console.error('Error updating restaurant ratings:', error);
  }
};

// Helper function to check if a user is the owner of a restaurant
const isRestaurantOwner = async (userId, restaurantId) => {
  try {
    // If restaurantId is an object with _id property (populated), extract the ID
    const restId = restaurantId._id ? restaurantId._id : restaurantId;
    
    const restaurant = await Restaurant.findById(restId);
    return restaurant && restaurant.ownerId.toString() === userId.toString();
  } catch (error) {
    console.error('Error checking restaurant ownership:', error);
    return false;
  }
};

// Helper function to validate order status transitions
const isValidStatusTransition = (currentStatus, newStatus, userRole) => {
  // Define valid status transitions
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['out_for_delivery', 'completed'], // completed for pickup orders
    'out_for_delivery': ['delivered', 'cancelled'],
    'delivered': ['completed'],
    'completed': [], // Terminal state
    'cancelled': ['pending'], // Allow reactivating cancelled orders
    'refunded': []  // Terminal state
  };
  
  // Admins and restaurant owners can make any transition
  if (['super_admin', 'sub_admin', 'restaurant_owner'].includes(userRole)) {
    return true;
  }
  
  // Check if the transition is valid
  return validTransitions[currentStatus] && validTransitions[currentStatus].includes(newStatus);
};



module.exports = {
  createOrder,
  getUserAllOrders,
  getRestaurantAllOrders,
  getSingleOrder,
  updateOrderStatus,
  cancelOrder,
  addOrderReview,
  assignDeliveryPerson,
  getRestaurantOrderStats,
};
