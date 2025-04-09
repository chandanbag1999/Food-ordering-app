const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const rezorpayService = require('../utils/razorpayService');
const crypto = require('crypto');



//  Handle Razorpay webhook events
const handleRazorpayWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature || !webhookSecret) {
      console.error('Missing webhook signature or secret');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook request'
      });
    }
    
    // Create a signature using the webhook secret and request body
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');
    
    // Compare signatures
    if (digest !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }
    
    // Process webhook event
    const event = req.body;
    const eventType = event.event;
    
    console.log(`Received Razorpay webhook: ${eventType}`);
    
    switch (eventType) {
      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment.entity);
        break;
        
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
        
      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity);
        break;
        
      case 'refund.processed':
        await handleRefundProcessed(event.payload.refund.entity);
        break;
        
      case 'refund.failed':
        await handleRefundFailed(event.payload.refund.entity);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
    
    // Always return 200 to acknowledge receipt of the webhook
    return res.status(200).json({
      success: true,
      message: 'Webhook received successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Always return 200 to acknowledge receipt of the webhook
    // This prevents Razorpay from retrying the webhook
    return res.status(200).json({
      success: true,
      message: 'Webhook received, but error during processing'
    });
  }
};

// Handle payment authorized event
const handlePaymentAuthorized = async (payment) => {
  try {
    // Find the payment in our database using the order ID
    const razorpayOrderId = payment.order_id;
    const dbPayment = await Payment.findOne({ gatewayOrderId: razorpayOrderId });
    
    if (!dbPayment) {
      console.error(`Payment not found for Razorpay order ID: ${razorpayOrderId}`);
      return;
    }
    
    // Update payment status to authorized
    dbPayment.updateStatus('authorized', {
      gatewayPaymentId: payment.id,
      paymentDetails: payment
    });
    await dbPayment.save();
    
    console.log(`Payment ${dbPayment._id} authorized`);
  } catch (error) {
    console.error('Error handling payment.authorized webhook:', error);
  }
};

// Handle payment.captured event
const handlePaymentCaptured = async (payment) => {
  try {
    // Find the payment in our database using the order ID
    const razorpayOrderId = payment.order_id;
    const dbPayment = await Payment.findOne({ gatewayOrderId: razorpayOrderId });
    
    if (!dbPayment) {
      console.error(`Payment not found for Razorpay order ID: ${razorpayOrderId}`);
      return;
    }
    
    // Update payment status to completed
    dbPayment.updateStatus('completed', {
      transactionId: payment.id,
      gatewayPaymentId: payment.id,
      gatewayOrderId: payment.order_id,
      paymentDetails: payment
    });
    await dbPayment.save();
    
    // Update order payment status
    const order = await Order.findById(dbPayment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
      
      console.log(`Order ${order._id} confirmed after payment capture`);
    }
    
    console.log(`Payment ${dbPayment._id} completed`);
  } catch (error) {
    console.error('Error handling payment.captured webhook:', error);
  }
};


// Handle payment.failed event
const handlePaymentFailed = async (payment) => {
  try {
    // Find the payment in our database using the order ID
    const razorpayOrderId = payment.order_id;
    const dbPayment = await Payment.findOne({ gatewayOrderId: razorpayOrderId });
    
    if (!dbPayment) {
      console.error(`Payment not found for Razorpay order ID: ${razorpayOrderId}`);
      return;
    }
    
    // Update payment status to failed
    dbPayment.updateStatus('failed', {
      errorMessage: payment.error_description || 'Payment failed',
      errorCode: payment.error_code,
      paymentDetails: payment
    });
    await dbPayment.save();
    
    // Update order payment status
    const order = await Order.findById(dbPayment.orderId);
    if (order) {
      order.paymentStatus = 'failed';
      await order.save();
      
      console.log(`Order ${order._id} marked as payment failed`);
    }
    
    console.log(`Payment ${dbPayment._id} failed`);
  } catch (error) {
    console.error('Error handling payment.failed webhook:', error);
  }
};

//Handle refund.created event
const handleRefundCreated = async (refund) => {
  try {
    // Find the payment in our database using the payment ID
    const razorpayPaymentId = refund.payment_id;
    const dbPayment = await Payment.findOne({ gatewayPaymentId: razorpayPaymentId });
    
    if (!dbPayment) {
      console.error(`Payment not found for Razorpay payment ID: ${razorpayPaymentId}`);
      return;
    }
    
    // Update refund status to pending
    dbPayment.processRefund(refund.amount / 100, 'Refund initiated via Razorpay');
    dbPayment.updateRefundStatus('pending', refund.id);
    await dbPayment.save();
    
    console.log(`Refund created for payment ${dbPayment._id}`);
  } catch (error) {
    console.error('Error handling refund.created webhook:', error);
  }
};

//  Handle refund.processed event
const handleRefundProcessed = async (refund) => {
  try {
    // Find the payment in our database using the payment ID
    const razorpayPaymentId = refund.payment_id;
    const dbPayment = await Payment.findOne({ gatewayPaymentId: razorpayPaymentId });
    
    if (!dbPayment) {
      console.error(`Payment not found for Razorpay payment ID: ${razorpayPaymentId}`);
      return;
    }
    
    // Update refund status to processed
    dbPayment.updateRefundStatus('processed', refund.id);
    await dbPayment.save();
    
    // Update order status
    const order = await Order.findById(dbPayment.orderId);
    if (order) {
      order.status = 'refunded';
      await order.save();
      
      console.log(`Order ${order._id} marked as refunded`);
    }
    
    console.log(`Refund processed for payment ${dbPayment._id}`);
  } catch (error) {
    console.error('Error handling refund.processed webhook:', error);
  }
};

// Handle refund.failed event
const handleRefundFailed = async (refund) => {
  try {
    // Find the payment in our database using the payment ID
    const razorpayPaymentId = refund.payment_id;
    const dbPayment = await Payment.findOne({ gatewayPaymentId: razorpayPaymentId });
    
    if (!dbPayment) {
      console.error(`Payment not found for Razorpay payment ID: ${razorpayPaymentId}`);
      return;
    }
    
    // Update refund status to failed
    dbPayment.updateRefundStatus('failed');
    dbPayment.errorMessage = refund.error_description || 'Refund failed';
    await dbPayment.save();
    
    // Update order status
    const order = await Order.findById(dbPayment.orderId);
    if (order) {
      order.status = 'refund_failed';
      await order.save();
      
      console.log(`Order ${order._id} marked as refund failed`);
    }
    
    console.log(`Refund failed for payment ${dbPayment._id}`);
  } catch (error) {
    console.error('Error handling refund.failed webhook:', error);
  }
};


module.exports = {
  handleRazorpayWebhook,
  handlePaymentAuthorized,
  handlePaymentCaptured,
  handlePaymentFailed,
  handleRefundCreated,
  handleRefundProcessed,
  handleRefundFailed
};
