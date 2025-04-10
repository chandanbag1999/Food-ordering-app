const Cart = require('../models/CartModel');
const MenuItem = require('../models/MenuItemModel');
const Restaurant = require('../models/RestaurantModel');
const Coupon = require('../models/CouponModel');
const mongoose = require('mongoose');
const couponController = require('./couponController');




// Get user's cart
const getCart = async (req, res) => {
  try {
    // Find user's cart
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: 'restaurantId',
        select: 'name address cuisineType images.logo deliveryFee minimumOrderAmount estimatedDeliveryTime'
      });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving cart',
      error: error.message
    });
  }
};

//  Add item to cart
const addItemToCart = async (req, res) => {
  try {
    const { menuItemId, quantity, customizations, specialInstructions } = req.body;
    
    if (!menuItemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide menuItemId and quantity'
      });
    }
    
    // Find menu item
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Find restaurant
    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Check if menu item is available
    if (!menuItem.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'This menu item is currently unavailable'
      });
    }
    
    // Check if restaurant is open
    if (!restaurant.isOpenNow()) {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development' && process.env.BYPASS_RESTAURANT_HOURS === 'true') {
        console.log('Warning: Bypassing restaurant opening hours check in development mode');
      } else {
        return res.status(400).json({
          success: false,
          message: 'This restaurant is currently closed'
        });
      }
    }
    
    // Process customizations
    let processedCustomizations = [];
    if (customizations && customizations.length > 0) {
      // Validate customizations
      for (const customization of customizations) {
        const { customizationGroupId, customizationOptionId } = customization;
        
        // Find customization group in menu item
        const group = menuItem.customizationGroups.find(
          group => group._id.toString() === customizationGroupId.toString()
        );
        
        if (!group) {
          return res.status(400).json({
            success: false,
            message: `Customization group ${customizationGroupId} not found for this menu item`
          });
        }
        
        // Find customization option in group
        const option = group.options.find(
          option => option._id.toString() === customizationOptionId.toString()
        );
        
        if (!option) {
          return res.status(400).json({
            success: false,
            message: `Customization option ${customizationOptionId} not found in group ${customizationGroupId}`
          });
        }
        
        // Add to processed customizations
        processedCustomizations.push({
          customizationGroupId,
          groupName: group.name,
          customizationOptionId,
          optionName: option.name,
          price: option.price
        });
      }
    }
    
    // Find or create cart
    let cart = await Cart.findOne({ userId: req.user._id });
    
    // If cart exists but for a different restaurant, clear it
    if (cart && cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      await Cart.deleteOne({ _id: cart._id });
      cart = null;
    }
    
    // Create new cart if it doesn't exist
    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        restaurantId: menuItem.restaurantId,
        items: [],
        subtotal: 0,
        taxAmount: 0,
        deliveryFee: restaurant.deliveryFee || 0,
        packagingFee: restaurant.packagingFee || 0,
        discount: 0,
        total: 0
      });
    }
    
    // Create cart item
    const cartItem = {
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      discountedPrice: menuItem.discountedPrice || 0,
      quantity: parseInt(quantity),
      customizations: processedCustomizations,
      specialInstructions: specialInstructions || '',
      itemTotal: 0 // Will be calculated by addItem method
    };
    
    // Add item to cart
    cart.addItem(cartItem);
    
    // Calculate tax (assuming 10% tax rate)
    const taxRate = 0.1;
    cart.setTaxAmount(cart.subtotal * taxRate);
    
    // Save cart
    await cart.save();
    
    return res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error adding item to cart',
      error: error.message
    });
  }
};

//  Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity (minimum 1)'
      });
    }
    
    // Find user's cart
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find item in cart by menuItemId
    const cartItem = cart.items.find(item => item.menuItemId.toString() === menuItemId);
    
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Update item quantity using the cart item's _id
    cart.updateItemQuantity(cartItem._id.toString(), parseInt(quantity));
    
    // Calculate tax (assuming 10% tax rate)
    const taxRate = 0.1;
    cart.setTaxAmount(cart.subtotal * taxRate);
    
    // Save cart
    await cart.save();
    
    return res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: cart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating cart item',
      error: error.message
    });
  }
};

// Remove item from cart
const removeCartItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    // Find user's cart
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Find item in cart by menuItemId
    const cartItem = cart.items.find(item => item.menuItemId.toString() === menuItemId);
    
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    
    // Remove item from cart using the cart item's _id
    cart.removeItem(cartItem._id.toString());
    
    // If cart is empty, delete it
    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      
      return res.status(200).json({
        success: true,
        message: 'Item removed and cart is now empty',
        data: null
      });
    } else {
      // Calculate tax (assuming 10% tax rate)
      const taxRate = 0.1;
      cart.setTaxAmount(cart.subtotal * taxRate);
      
      // Save cart
      await cart.save();
      
      return res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        data: cart
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error removing item from cart',
      error: error.message
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    // Find and delete user's cart
    const result = await Cart.deleteOne({ userId: req.user._id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error clearing cart',
      error: error.message
    });
  }
};

//  Apply coupon to cart
const applyCoupon = async (req, res) => {
  // Use the coupon controller to apply the coupon
  return couponController.applyCouponToCart(req, res);
};

// Remove coupon from cart
const removeCoupon = async (req, res) => {
  try {
    // Find user's cart
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Remove coupon
    cart.couponCode = null;
    cart.discount = 0;
    
    // Recalculate total
    cart.total = cart.subtotal + cart.taxAmount + cart.deliveryFee + cart.packagingFee;
    
    // Save cart
    await cart.save();
    
    return res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
      data: cart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error removing coupon',
      error: error.message
    });
  }
}; 

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon
};




