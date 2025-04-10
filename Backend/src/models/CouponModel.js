const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Coupon description is required']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0, 'Discount amount cannot be negative']
  },
  minimumOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  maximumDiscountAmount: {
    type: Number,
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: null
  },
  applicableRestaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  excludedRestaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  applicableMenuItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  excludedMenuItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  }],
  applicableCategories: [{
    type: String
  }],
  firstOrderOnly: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ID is required']
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

// Index for faster lookups
CouponSchema.index({ isActive: 1 });
CouponSchema.index({ expiryDate: 1 });
CouponSchema.index({ applicableRestaurants: 1 });

// Update timestamp before saving
CouponSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if coupon is valid
CouponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.isActive) {
    return {
      valid: false,
      message: 'This coupon is inactive'
    };
  }
  
  // Check if coupon has expired
  console.log('Checking expiry date:', {
    now: now,
    expiryDate: this.expiryDate,
    isExpired: now > this.expiryDate,
    nowTimeStamp: now.getTime(),
    expiryTimeStamp: this.expiryDate.getTime()
  });
  
  if (now > this.expiryDate) {
    return {
      valid: false,
      message: 'This coupon has expired'
    };
  }
  
  // Check if coupon has reached usage limit
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    return {
      valid: false,
      message: 'This coupon has reached its usage limit'
    };
  }
  
  return {
    valid: true,
    message: 'Coupon is valid'
  };
};

// Method to check if coupon is applicable for a restaurant
CouponSchema.methods.isApplicableForRestaurant = function(restaurantId) {
  // If no specific restaurants are set, coupon is applicable to all
  if (this.applicableRestaurants.length === 0 && this.excludedRestaurants.length === 0) {
    return true;
  }
  
  // If restaurant is in excluded list
  if (this.excludedRestaurants.some(id => id.toString() === restaurantId.toString())) {
    return false;
  }
  
  // If applicable restaurants are specified, check if restaurant is in the list
  if (this.applicableRestaurants.length > 0) {
    return this.applicableRestaurants.some(id => id.toString() === restaurantId.toString());
  }
  
  return true;
};

// Method to check if coupon is applicable for a menu item
CouponSchema.methods.isApplicableForMenuItem = function(menuItemId, categoryName) {
  // If no specific menu items or categories are set, coupon is applicable to all
  if (
    this.applicableMenuItems.length === 0 && 
    this.excludedMenuItems.length === 0 &&
    this.applicableCategories.length === 0
  ) {
    return true;
  }
  
  // If menu item is in excluded list
  if (this.excludedMenuItems.some(id => id.toString() === menuItemId.toString())) {
    return false;
  }
  
  // If applicable menu items are specified, check if menu item is in the list
  if (this.applicableMenuItems.length > 0) {
    return this.applicableMenuItems.some(id => id.toString() === menuItemId.toString());
  }
  
  // If applicable categories are specified, check if menu item's category is in the list
  if (this.applicableCategories.length > 0 && categoryName) {
    return this.applicableCategories.includes(categoryName);
  }
  
  return true;
};

// Method to check if coupon is applicable for a user
CouponSchema.methods.isApplicableForUser = function(user, userOrderCount) {
  // Check if coupon is for first-time users only
  if (this.firstOrderOnly && userOrderCount > 0) {
    return {
      applicable: false,
      message: 'This coupon is valid for first orders only'
    };
  }
  
  // Check if user has reached their usage limit for this coupon
  if (this.perUserLimit !== null && user.couponUsage && user.couponUsage[this.code] >= this.perUserLimit) {
    return {
      applicable: false,
      message: `You have already used this coupon ${this.perUserLimit} times`
    };
  }
  
  return {
    applicable: true,
    message: 'Coupon is applicable for this user'
  };
};

// Method to calculate discount amount
CouponSchema.methods.calculateDiscount = function(subtotal) {
  // Check if order meets minimum amount requirement
  if (subtotal < this.minimumOrderAmount) {
    return {
      applicable: false,
      discount: 0,
      message: `Minimum order amount of ${this.minimumOrderAmount} required`
    };
  }
  
  let discountAmount = 0;
  
  // Calculate discount based on type
  if (this.discountType === 'percentage') {
    discountAmount = (subtotal * this.discountAmount) / 100;
    
    // Apply maximum discount cap if set
    if (this.maximumDiscountAmount !== null && discountAmount > this.maximumDiscountAmount) {
      discountAmount = this.maximumDiscountAmount;
    }
  } else {
    // Fixed discount
    discountAmount = this.discountAmount;
    
    // Ensure discount doesn't exceed order subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }
  }
  
  return {
    applicable: true,
    discount: discountAmount,
    message: 'Discount applied successfully'
  };
};

const Coupon = mongoose.model('Coupon', CouponSchema);

module.exports = Coupon;


