const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'net_banking', 'cash_on_delivery', 'online_payment', 'other']
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'paytm', 'cash', 'other'],
    default: 'razorpay'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    trim: true
  },
  gatewayPaymentId: {
    type: String,
    trim: true
  },
  gatewayOrderId: {
    type: String,
    trim: true
  },
  gatewaySignature: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String,
    trim: true
  },
  refundId: {
    type: String,
    trim: true
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    trim: true
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed', 'failed'],
    default: 'none'
  },
  paymentDetails: {
    type: Object
  },
  errorMessage: {
    type: String,
    trim: true
  },
  errorCode: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  metadata: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ gatewayPaymentId: 1 });

// Method to update payment status
PaymentSchema.methods.updateStatus = function(status, details = {}) {
  this.status = status;
  this.updatedAt = Date.now();
  
  if (details.transactionId) this.transactionId = details.transactionId;
  if (details.gatewayPaymentId) this.gatewayPaymentId = details.gatewayPaymentId;
  if (details.gatewayOrderId) this.gatewayOrderId = details.gatewayOrderId;
  if (details.gatewaySignature) this.gatewaySignature = details.gatewaySignature;
  if (details.receiptUrl) this.receiptUrl = details.receiptUrl;
  if (details.errorMessage) this.errorMessage = details.errorMessage;
  if (details.errorCode) this.errorCode = details.errorCode;
  if (details.notes) this.notes = details.notes;
  if (details.metadata) this.metadata = { ...this.metadata, ...details.metadata };
  
  return this;
};

// Method to process refund
PaymentSchema.methods.processRefund = function(amount, reason) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundStatus = 'pending';
  this.updatedAt = Date.now();
  
  return this;
};

// Method to update refund status
PaymentSchema.methods.updateRefundStatus = function(status, refundId = null) {
  this.refundStatus = status;
  if (refundId) this.refundId = refundId;
  this.updatedAt = Date.now();
  
  return this;
};

// Method to generate receipt
PaymentSchema.methods.generateReceipt = function(options = {}) {
  // Get options
  const provisional = options.provisional || (this.status !== 'completed');
  
  // For a real application, this would typically generate a receipt URL or PDF
  // This is a placeholder that would be replaced with actual receipt generation logic
  
  // Base receipt URL
  let receiptBaseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.meallink.com/receipts' 
    : 'http://localhost:5001/api/v1/receipts';
  
  // Add appropriate query parameters based on payment status
  let receiptUrl = `${receiptBaseUrl}/${this._id}`;
  
  // If provisional, add appropriate flag
  if (provisional) {
    receiptUrl += '?provisional=true';
  }
  
  // In a real application, this URL would point to a receipt generation service
  // or a pre-generated PDF stored in a secure location
  
  return receiptUrl;
};

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
