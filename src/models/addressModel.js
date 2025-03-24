const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    required: true,
    default: 'home'
  },
  label: {
    type: String,
    maxLength: [50, 'Label cannot be more than 50 characters'],
    trim: true
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required']
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  formattedAddress: String,
  placeId: String,
  googlePlaceData: Object,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add geospatial index for location queries
addressSchema.index({ location: '2dsphere' });

// Add compound index for user and type
addressSchema.index({ userId: 1, type: 1 });

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;