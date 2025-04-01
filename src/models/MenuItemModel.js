const mongoose = require('mongoose');

// Schema for customization options
const customizationOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

// Schema for customization groups
const customizationGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  required: {
    type: Boolean,
    default: false
  },
  multiSelect: {
    type: Boolean,
    default: false
  },
  minSelect: {
    type: Number,
    default: 0
  },
    maxSelect: {
        type: Number,
        default: 1
    },
    options: [customizationOptionSchema]
});

// Schema for menu items
const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required']
  },
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Menu item description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Menu item price is required'],
    min: 0
  },
  discountedPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Menu item category is required']
  },
  image: {
    type: String,
    default: 'default_image.jpg',
  },
  // Dietary preferences
  isVegan: {
    type: Boolean,
    default: false
  },
    isVegetarian: {
        type: Boolean,
        default: false
    },
    isGlutenFree: {
        type: Boolean,
        default: false
    },

    // Customization options
    customizationGroups: [customizationGroupSchema],
    // Availability
    isAvailable: {
        type: Boolean,
        default: true
    },
    // Popularity score
    orderCount: {
        type: Number,
        default: 0
    },
    // Ratings and reviews
    ratings: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    // Tags for Searching
    tags: [String],
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Create index for Searching
menuItemSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' });

// Method to calculate final price (considering discounts)
menuItemSchema.methods.getFinalPrice = function() {
  return this.discountedPrice && this.discountedPrice < this.price ? this.discountedPrice : this.price;
};

// Method to check if item has discount
menuItemSchema.methods.hasDiscount = function() {
  return this.discountedPrice && this.discountedPrice < this.price;
};

// Method to calculate discount percentage
menuItemSchema.methods.getDiscountPercentage = function() {
  if (this.hasDiscount()) {
    return ((this.price - this.discountedPrice) / this.price) * 100;
  }
  return 0;
};

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;