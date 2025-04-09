const Payment = require('../models/paymentModel');
const PaymentMethod = require('../models/PaymentMethodModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const razorpayService = require('../utils/razorpayService');
const mongoose = require('mongoose');




// Initialize payment for an order
const initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, savePaymentMethod } = req.body;
    
    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderId and paymentMethod'
      });
    }
    
    // Find order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order belongs to user
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    
    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }
    
    // Create payment record
    const payment = await Payment.create({
      userId: req.user._id,
      orderId: order._id,
      amount: order.totalAmount,
      currency: 'INR',
      paymentMethod: paymentMethod.type,
      paymentGateway: paymentMethod.gateway || 'razorpay',
      status: 'pending'
    });
    
    // Handle different payment methods
    if (paymentMethod.type === 'cash_on_delivery') {
      // For COD, just mark payment as pending and update order
      order.paymentId = payment._id;
      order.PaymentMethod = 'cash_on_delivery';
      order.paymentStatus = 'pending';
      await order.save();
      
      return res.status(200).json({
        success: true,
        message: 'Cash on delivery payment initialized',
        data: {
          payment,
          order,
          nextStep: {
            message: "To confirm this COD order, use the verify-cod endpoint",
            endpoint: "/api/v1/payments/verify-cod",
            method: "POST",
            body: {
              paymentId: payment._id
            }
          }
        }
      });
    } else {
      // For online payments, create order in Razorpay
      const razorpayOrder = await razorpayService.createOrder({
        amount: order.totalAmount,
        currency: 'INR',
        receipt: `order_${order._id}`,
        notes: {
          orderId: order._id.toString(),
          userId: req.user._id.toString()
        }
      });
      
      // Update payment with Razorpay order ID
      payment.gatewayOrderId = razorpayOrder.id;
      payment.metadata = {
        ...payment.metadata,
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt
        }
      };
      await payment.save();
      
      // Update order with payment ID
      order.paymentId = payment._id;
      order.PaymentMethod = paymentMethod.type;
      order.paymentStatus = 'pending';
      await order.save();
      
      // If user wants to save payment method
      if (savePaymentMethod && paymentMethod.type !== 'cash_on_delivery') {
        // Save payment method logic would go here
        // This is just a placeholder as actual card details should be handled securely
        if (paymentMethod.cardDetails) {
          await PaymentMethod.create({
            userId: req.user._id,
            type: paymentMethod.type,
            name: paymentMethod.name || `${paymentMethod.type} ending in ${paymentMethod.cardDetails.last4}`,
            cardNumberLast4: paymentMethod.cardDetails.last4,
            cardType: paymentMethod.cardDetails.brand,
            expiryMonth: paymentMethod.cardDetails.expiryMonth,
            expiryYear: paymentMethod.cardDetails.expiryYear,
            cardHolderName: paymentMethod.cardDetails.holderName,
            isDefault: false
          });
        }
      }
      
      // Generate checkout options for frontend
      const checkoutOptions = razorpayService.generateCheckoutOptions(
        {
          amount: order.totalAmount,
          razorpayOrderId: razorpayOrder.id,
          orderId: order._id.toString(),
          description: `Order #${order.orderNumber}`
        },
        {
          name: req.user.fullName,
          email: req.user.email,
          phone: req.user.phoneNumber,
          userId: req.user._id.toString()
        }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Payment initialized',
        data: {
          payment,
          order,
          razorpayOrder,
          checkoutOptions
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error initializing payment',
      error: error.message
    });
  }
};

// Verify and complete payment
const verifyPayment = async (req, res) => {
  try {
    // Capture full request body for debugging
    console.log('Full payment verification request body:', JSON.stringify(req.body, null, 2));
    
    const { paymentId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    console.log('Payment verification request:', {
      paymentId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature: razorpay_signature ? '[SIGNATURE PROVIDED]' : '[MISSING]'
    });
    
    // We need at least the paymentId
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide payment ID'
      });
    }
    
    // Find payment
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    console.log('Found payment record:', {
      id: payment._id,
      status: payment.status,
      amount: payment.amount,
      userId: payment.userId,
      orderId: payment.orderId,
      gatewayOrderId: payment.gatewayOrderId,
      paymentMethod: payment.paymentMethod
    });
    
    // Check if payment belongs to user
    if (payment.userId.toString() !== req.user._id.toString()) {
      console.error(`Payment authorization failed: User ${req.user._id} attempted to access payment of user ${payment.userId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }
    
    // Special handling for cash on delivery
    if (payment.paymentMethod === 'cash_on_delivery') {
      console.log('Processing cash on delivery payment verification');
      
      // For cash on delivery, we just mark the payment as completed or keep it pending
      // depending on the business logic - typically it stays pending until delivery
      payment.status = 'pending'; // Or you might use a special status like 'cod_pending'
      await payment.save();
      
      // Find and update order
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.status = 'confirmed'; // Update order status to confirmed
        await order.save();
      }
      
      return res.status(200).json({
        success: true,
        message: 'Cash on delivery payment verification completed',
        data: {
          payment,
          order
        }
      });
    }
    
    // For non-COD payments, we need the Razorpay identifiers
    if (!razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Razorpay payment ID for online payments'
      });
    }
    
    // Handle missing signature in development mode
    if (!razorpay_signature && process.env.NODE_ENV === 'development') {
      console.warn('Missing signature in development mode - generating test signature');
      const testSignature = razorpayService.generateTestSignature(
        razorpay_order_id || payment.gatewayOrderId,
        razorpay_payment_id
      );
      
      // Log the test signature for use in future requests
      console.log('Generated test signature for verification:', testSignature);
      
      // In development mode, we'll accept the payment without verification
      console.log('Development mode: Accepting payment without signature verification');
      
      // Update payment status
      payment.status = 'completed';
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.metadata = {
        ...payment.metadata,
        devMode: true,
        testSignature
      };
      await payment.save();
      
      // Find and update order
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        await order.save();
      }
      
      return res.status(200).json({
        success: true,
        message: 'Payment processed in development mode (test signature generated)',
        data: {
          payment,
          testSignature,
          verificationNotice: 'In production, a valid signature is required. Use the test signature for future verification.'
        }
      });
    }
    
    // For production or if signature is provided in development
    if (!razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Please provide razorpay_signature'
      });
    }
    
    // Verify the payment signature
    console.log('Verifying payment signature...');
    
    // In development mode, provide detailed debug information
    if (process.env.NODE_ENV === 'development') {
      const debug = razorpayService.debugVerifySignature({
        razorpay_order_id: razorpay_order_id || payment.gatewayOrderId,
        razorpay_payment_id,
        razorpay_signature
      });
      
      if (!debug.success) {
        console.error('Payment signature verification failed:', debug);
        payment.status = 'failed';
        payment.metadata = {
          ...payment.metadata,
          verificationError: 'Invalid signature',
          debug
        };
        await payment.save();
        
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature',
          debug
        });
      }
      
      console.log('Signature verification succeeded in debug mode');
    } else {
      // Normal signature verification for production
      const isValid = razorpayService.verifyPaymentSignature({
        razorpay_order_id: razorpay_order_id || payment.gatewayOrderId,
        razorpay_payment_id,
        razorpay_signature
      });
      
      if (!isValid) {
        console.error('Payment signature verification failed');
        payment.status = 'failed';
        payment.metadata = {
          ...payment.metadata,
          verificationError: 'Invalid signature'
        };
        await payment.save();
        
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
    }
    
    // If we get here, the signature is valid
    // Update payment status
    payment.status = 'completed';
    payment.gatewayPaymentId = razorpay_payment_id;
    await payment.save();
    
    // Find and update order
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
    }
    
    return res.status(200).json({
      success: true,
      message: 'Payment verified and completed successfully',
      data: {
        payment,
        order
      }
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

//  Get payment details
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check if payment belongs to user or user is admin
    if (
      payment.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin' &&
      req.user.role !== 'sub_admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving payment',
      error: error.message
    });
  }
};

//  Get all payments for a use
const getUserPayments = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Filtering
    const filter = { userId: req.user._id };
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by payment method
    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }
    
    // Execute query
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('orderId', 'orderNumber totalAmount items.menuItem items.quantity');
    
    // Get total count
    const total = await Payment.countDocuments(filter);
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    return res.status(200).json({
      success: true,
      count: payments.length,
      pagination,
      data: payments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving payments',
      error: error.message
    });
  }
};

// Request refund for a payment
const requestRefund = async (req, res) => {
  try {
    // Accept either "reason" or "comment" field for better flexibility
    const reason = req.body.reason || req.body.comment;
    const { amount, status } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for the refund (use "reason" or "comment" field)',
        expectedFormat: {
          reason: "Why the refund is needed",
          amount: "Optional: specific amount to refund"
        }
      });
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check if payment belongs to user
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request refund for this payment'
      });
    }
    
    // Check if payment is in a refundable state
    const refundableStatuses = ['completed'];
    
    // In development mode, allow refunds for pending payments too
    if (process.env.NODE_ENV === 'development') {
      refundableStatuses.push('pending', 'processing');
    }
    
    // Special check for already refunded payments
    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'This payment has already been refunded',
        paymentStatus: payment.status,
        refundDetails: {
          refundStatus: payment.refundStatus,
          refundAmount: payment.refundAmount,
          refundReason: payment.refundReason,
          refundId: payment.refundId
        }
      });
    }
    
    // Check if payment status is refundable
    if (!refundableStatuses.includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot request refund for payment with status: ${payment.status}`,
        allowedStatuses: refundableStatuses,
        note: "In production, only completed payments can be refunded"
      });
    }
    
    // Check if refund is already requested
    if (payment.refundStatus !== 'none') {
      return res.status(400).json({
        success: false,
        message: `Refund already ${payment.refundStatus}`
      });
    }
    
    // Process refund
    const refundAmount = amount || payment.amount;
    
    // For Razorpay payments in completed status
    if (payment.status === 'completed' && payment.paymentGateway === 'razorpay' && payment.gatewayPaymentId) {
      try {
        const refund = await razorpayService.refundPayment(
          payment.gatewayPaymentId,
          Math.round(refundAmount * 100),
          { notes: { reason } }
        );
        
        // Update payment with refund details
        payment.processRefund(refundAmount, reason);
        payment.refundStatus = 'processed';
        payment.refundId = refund.id;
        await payment.save();
        
        // Update order status
        const order = await Order.findById(payment.orderId);
        if (order) {
          order.status = 'refunded';
          await order.save();
        }
        
        return res.status(200).json({
          success: true,
          message: 'Refund processed successfully',
          data: {
            payment,
            refund
          }
        });
      } catch (error) {
        // Update payment with failed refund status
        payment.processRefund(refundAmount, reason);
        payment.refundStatus = 'failed';
        payment.errorMessage = error.message;
        await payment.save();
        
        return res.status(500).json({
          success: false,
          message: 'Error processing refund with payment gateway',
          error: error.message
        });
      }
    } else {
      // For pending payments or other payment methods, mark as pending
      // In development mode, we allow refunding pending payments for testing
      const isDevModePendingRefund = process.env.NODE_ENV === 'development' && payment.status === 'pending';
      
      payment.processRefund(refundAmount, reason);
      
      // Handle admin-initiated refunds that include a status
      if (status === 'approved' && (req.user.role === 'super_admin' || req.user.role === 'sub_admin' || process.env.NODE_ENV === 'development')) {
        payment.refundStatus = 'processed';
        payment.status = 'refunded';
        
        // Add a note about admin approval
        const approvalNote = req.user.role === 'super_admin' || req.user.role === 'sub_admin' ? 
          `Admin-approved refund: ${reason}` : 
          `DEV MODE: Auto-approved refund: ${reason}`;
          
        payment.notes = payment.notes ? 
          `${payment.notes}; ${approvalNote}` : 
          approvalNote;
      }
      // If in development mode and refunding a pending payment, automatically approve the refund
      else if (isDevModePendingRefund) {
        payment.refundStatus = 'processed';
        payment.status = 'refunded';
        
        // Add a note about this being a development-only behavior
        payment.notes = payment.notes ? 
          `${payment.notes}; DEV MODE: Auto-approved refund for pending payment` : 
          'DEV MODE: Auto-approved refund for pending payment';
      }
      
      await payment.save();
      
      // Update order status
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.status = (status === 'approved' || isDevModePendingRefund) ? 'refunded' : 'refund_requested';
        await order.save();
      }
      
      return res.status(200).json({
        success: true,
        message: isDevModePendingRefund || status === 'approved' ? 
          'Refund approved successfully' : 
          'Refund request submitted successfully',
        devModeNote: isDevModePendingRefund && !status ? 
          'In production, pending payments cannot be refunded directly' : 
          undefined,
        data: {
          payment
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error requesting refund',
      error: error.message
    });
  }
};

// Process refund (Admin only)
const processRefund = async (req, res) => {
  try {
    const { status, refundId, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide refund status'
      });
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check if refund is pending
    if (payment.refundStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot process refund with status: ${payment.refundStatus}`
      });
    }
    
    // Update refund status
    payment.updateRefundStatus(status, refundId);
    if (notes) payment.notes = notes;
    await payment.save();
    
    // Update order status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.status = status === 'processed' ? 'refunded' : 'refund_failed';
      await order.save();
    }
    
    return res.status(200).json({
      success: true,
      message: `Refund ${status} successfully`,
      data: {
        payment
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
};

// Get payment receipt
const getPaymentReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check if payment belongs to user or user is admin
    if (
      payment.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'super_admin' &&
      req.user.role !== 'sub_admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment receipt'
      });
    }
    
    // Get the requested format (if any)
    const format = req.query.format || 'url';
    
    // Check if receipt is available based on payment status
    if (payment.status === 'completed') {
      // For completed payments, generate normal receipt
      const receiptUrl = payment.generateReceipt({ provisional: false });
      
      return res.status(200).json({
        success: true,
        data: {
          receiptUrl,
          paymentStatus: payment.status
        }
      });
    } else if (payment.status === 'pending' || payment.status === 'processing') {
      // For pending or processing payments
      if (process.env.NODE_ENV === 'development' || req.user.role === 'super_admin' || req.user.role === 'sub_admin') {
        // In development mode or for admins, generate a provisional receipt
        const receiptUrl = payment.generateReceipt({ provisional: true });
        
        return res.status(200).json({
          success: true,
          message: 'This is a provisional receipt for a payment that is not yet completed',
          data: {
            receiptUrl,
            paymentStatus: payment.status,
            provisional: true
          }
        });
      } else {
        // In production mode for regular users, explain that receipt is not available yet
        return res.status(202).json({
          success: true,
          message: 'Your payment is being processed. Receipt will be available once payment is completed.',
          data: {
            paymentStatus: payment.status,
            estimatedCompletionTime: new Date(Date.now() + 3600000) // 1 hour from now as estimate
          }
        });
      }
    } else {
      // For failed or other status payments
      return res.status(400).json({
        success: false,
        message: `Receipt is not available for payments with status: ${payment.status}`,
        data: {
          paymentStatus: payment.status
        }
      });
    }
  } catch (error) {
    console.error('Error generating receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating receipt',
      error: error.message
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getPaymentById,
  getUserPayments,
  requestRefund,
  processRefund,
  getPaymentReceipt
};

