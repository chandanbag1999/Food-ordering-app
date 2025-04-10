const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required'],
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  text: {
    type: String,
    required: [true, 'Review text is required'],
    trim: true,
    maxlength: [500, 'Review text cannot exceed 500 characters'],
  },
  photos: [String],
  likes: {
    type: Number,
    default: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
  },
  isVerifiedOrder: {
    type: Boolean,
    default: false,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  lastEditedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isReported: {
    type: Boolean,
    default: false,
  },
  reportReason: {
    type: String,
  },
  reportedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  ownerResponse: {
   text: String,
   createdAt: Date,
   updatedAt: Date, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Prevent user from submitting more than one review per restaurant
reviewSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

// Static method to get avarage rating for a restaurant
reviewSchema.statics.getAverageRating = async function (restaurantId) {
  const obj = await this.aggregate([
    { $match: { restaurantId: mongoose.Types.ObjectId(restaurantId), isActive: true } },
    {
      $group: {
        _id: '$restaurantId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]); 

  try {
    if (obj.length > 0) {
      await this.model('Restaurant').findByIdAndUpdate(restaurantId, {
        rating:parseFloat(obj[0].averageRating.toFixed(1)), // Round the average rating to one decimal place and convert it to a number before saving it to the Restaurant schem
        reviewCount: obj[0].reviewCount
    });
    } else {
       // If no reviews, set default values
       await mongoose.model('Restaurant').findByIdAndUpdate(restaurantId, {
        rating: 0,
        reviewCount: 0
      });
    }
  } catch (error) {
    console.log(error);
    
  }
};

// Call getAverageRating after save
reviewSchema.post('save', function() {
  this.constructor.getAverageRating(this.restaurantId);
});

// Call getAverageRating after remove
reviewSchema.post('remove', function() {
  this.constructor.getAverageRating(this.restaurantId);
});

// Call getAverageRating after findOneAndUpdate (for soft deletes)
reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await doc.constructor.getAverageRating(doc.restaurantId);
  }
});

// Ensure that isActive is considered when calculating average ratings
reviewSchema.pre('aggregate', function() {
  // Add isActive: true to the match stage if it exists
  this.pipeline().forEach(stage => {
    if (stage.$match && stage.$match.restaurantId && !stage.$match.hasOwnProperty('isActive')) {
      stage.$match.isActive = true;
    }
  });
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;