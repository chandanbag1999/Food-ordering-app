const mongoose = require("mongoose");
const { Pay } = require("twilio/lib/twiml/VoiceResponse");

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  customizations: [{
    groupName: String,
    options: [{
      name: String,
      price: Number
    }]
  }],
  specialInstructions: {
    type: String,
    trim: true
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: [
      'pending',       // Initial state when order is created
      'confirmed',     // Restaurant has confirmed the order
      'preparing',     // Food is being prepared
      'ready',         // Food is ready for pickup/delivery
      'out_for_delivery', // Order is out for delivery
      'delivered',     // Order has been delivered
      'completed',     // Order is complete
      'cancelled',     // Order was cancelled
      'refunded',       // Order was refunded
      'refund_requested', // Refund has been requested
      'refund_failed'  // Refund attempt failed
    ],
    default: 'pending'
  },
  orderType: {
    type: String,
    enum: ['delivery', 'pickup', 'dine_in'],
    required: true
  },
  PaymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'card', 'credit_card', 'debit_card', 'upi', 'wallet', 'net_banking', 'online_payment'],
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paymentGetWay: String,
    paymentTime: Date,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    required: true,
  },
  deliveryFee: {
    type: Number,
    required: true,
  },
  packagingFee: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  couponCode: {
    type: String,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    instruction: String
  },
  contactPhone: {
    type: String,
    required: true
  },
  estimateDeliveryTime: {
    type: Date,
  },
  actualDeliveryTime: {
    type: Date,
  },
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  ratings: {
    food: {
      type: Number,
      min: 1,
      max: 5,
    },
    delivery: {
      type: Number,
      min: 1,
      max: 5,
    },
    overall: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  review: {
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  statusHistory: [{
    status: {
      type: String,
      enum: [
        'pending',       // Initial state when order is created
        'confirmed',     // Restaurant has confirmed the order
        'preparing',     // Food is being prepared
        'ready',         // Food is ready for pickup/delivery
        'out_for_delivery', // Order is out for delivery
        'delivered',     // Order has been delivered
        'completed',     // Order is complete
        'cancelled',     // Order was cancelled
        'refunded'       // Order was refunded
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  cancellationReason: {
    type: String
  },
  cancellationTime: {
    type: Date
  },
  cancellqtionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundAmount: {
    type: Number
  },
  refundTime: {
    type: Date
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
  timestamps: true
});


// Calculate total amount before saving the order
orderSchema.pre('save', function (next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);

  // Calculate total amount
  this.totalAmount = this.subtotal + this.taxAmount + this.deliveryFee + this.packagingFee - this.discount;

  // add status to history if it's a new status
  const lastStatus = this.statusHistory.length > 0 ? this.statusHistory[this.statusHistory.length - 1] : null;

  if (!lastStatus || lastStatus !== this.status) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  };

  next();
});

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function () {
  const nonCancellableStatuses = ['delivered', 'completed', 'refunded'];
  return !nonCancellableStatuses.includes(this.status);
};

// Method to check if order can be modified
orderSchema.methods.canBeModified = function () {
  const nonModifiableStatuses = ['preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded'];
  return !nonModifiableStatuses.includes(this.status);
};


// Method to calculate estimated delivery time
orderSchema.methods.calculateEstimatedDeliveryTime = function (restaurantPrepTime) {
  const now = new Date();
  // Default prep time is 30 minutes if not provided
  const prepTimeMinutes = restaurantPrepTime || 30;
  // Default delivery time is 20 minutes
  const deliveryTimeMinutes = 20;

  const estimatedTime = new Date(now.getTime() + ((prepTimeMinutes + deliveryTimeMinutes) * 60000));
  this.estimateDeliveryTime = estimatedTime;

  return estimatedTime;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;