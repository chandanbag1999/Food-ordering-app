const mongoose = require('mongoose');

// Schema for cart item customizations
const CartItemCustomizationSchema = new mongoose.Schema({
  customizationGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  groupName: {
    type: String,
    required: true
  },
  customizationOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  optionName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
}, { _id: false });

// Schema for cart items
const CartItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: [true, 'Menu item ID is required']
  },
  name: {
    type: String,
    required: [true, 'Item name is required']
  },
  price: {
    type: Number,
    required: [true, 'Item price is required']
  },
  discountedPrice: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  customizations: [CartItemCustomizationSchema],
  specialInstructions: {
    type: String,
    maxlength: [200, 'Special instructions cannot be more than 200 characters']
  },
  itemTotal: {
    type: Number,
    required: [true, 'Item total is required']
  }
}, { _id: true });

// Main Cart Schema
const CartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required']
  },
  items: [CartItemSchema],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  packagingFee: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only have one active cart per restaurant
CartSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

// Calculate cart totals before saving
CartSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + item.itemTotal;
  }, 0);
  
  // Calculate total
  this.total = this.subtotal + this.taxAmount + this.deliveryFee + this.packagingFee - this.discount;
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

// Method to calculate item total
CartSchema.methods.calculateItemTotal = function(item) {
  let basePrice = item.discountedPrice > 0 ? item.discountedPrice : item.price;
  let customizationsTotal = 0;
  
  if (item.customizations && item.customizations.length > 0) {
    customizationsTotal = item.customizations.reduce((sum, customization) => {
      return sum + customization.price;
    }, 0);
  }
  
  return (basePrice + customizationsTotal) * item.quantity;
};

// Method to add an item to the cart
CartSchema.methods.addItem = function(item) {
  // Calculate item total
  item.itemTotal = this.calculateItemTotal(item);
  
  // Check if item already exists with same customizations
  const existingItemIndex = this.items.findIndex(existingItem => {
    // Check if menu item ID matches
    if (existingItem.menuItemId.toString() !== item.menuItemId.toString()) {
      return false;
    }
    
    // Check if special instructions match
    if (existingItem.specialInstructions !== item.specialInstructions) {
      return false;
    }
    
    // Check if customizations match
    if (existingItem.customizations.length !== item.customizations.length) {
      return false;
    }
    
    // Check each customization
    for (let i = 0; i < existingItem.customizations.length; i++) {
      const existingCustomization = existingItem.customizations[i];
      const newCustomization = item.customizations[i];
      
      if (
        existingCustomization.customizationOptionId.toString() !== newCustomization.customizationOptionId.toString() ||
        existingCustomization.customizationGroupId.toString() !== newCustomization.customizationGroupId.toString()
      ) {
        return false;
      }
    }
    
    return true;
  });
  
  if (existingItemIndex !== -1) {
    // Update quantity and item total
    this.items[existingItemIndex].quantity += item.quantity;
    this.items[existingItemIndex].itemTotal = this.calculateItemTotal(this.items[existingItemIndex]);
  } else {
    // Add new item
    this.items.push(item);
  }
  
  return this;
};

// Method to remove an item from the cart
CartSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
  return this;
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const itemIndex = this.items.findIndex(item => item._id.toString() === itemId.toString());
  
  if (itemIndex !== -1) {
    this.items[itemIndex].quantity = quantity;
    this.items[itemIndex].itemTotal = this.calculateItemTotal(this.items[itemIndex]);
  }
  
  return this;
};

// Method to clear the cart
CartSchema.methods.clearCart = function() {
  this.items = [];
  this.subtotal = 0;
  this.taxAmount = 0;
  this.deliveryFee = 0;
  this.packagingFee = 0;
  this.discount = 0;
  this.couponCode = null;
  this.total = 0;
  
  return this;
};

// Method to apply a coupon
CartSchema.methods.applyCoupon = function(couponCode, discountAmount) {
  this.couponCode = couponCode;
  this.discount = discountAmount;
  this.total = this.subtotal + this.taxAmount + this.deliveryFee + this.packagingFee - this.discount;
  
  return this;
};

// Method to set delivery fee
CartSchema.methods.setDeliveryFee = function(fee) {
  this.deliveryFee = fee;
  this.total = this.subtotal + this.taxAmount + this.deliveryFee + this.packagingFee - this.discount;
  
  return this;
};

// Method to set tax amount
CartSchema.methods.setTaxAmount = function(taxAmount) {
  this.taxAmount = taxAmount;
  this.total = this.subtotal + this.taxAmount + this.deliveryFee + this.packagingFee - this.discount;
  
  return this;
};

const Cart = mongoose.model('Cart', CartSchema);

module.exports = Cart;
