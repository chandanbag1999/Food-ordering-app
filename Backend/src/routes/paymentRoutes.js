const express = require('express');
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const razorpayService = require('../utils/razorpayService');
const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const crypto = require('crypto');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes for all authenticated users
router.post('/initialize', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentController.initializePayment);
router.post('/verify', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentController.verifyPayment);

// Special route for confirming cash on delivery orders
router.post('/verify-cod', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), async (req, res) => {
  try {
    console.log('COD verification request body:', JSON.stringify(req.body, null, 2));
    
    const { paymentId } = req.body;
    
    console.log('Payment ID extracted from request:', paymentId);
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide payment ID in the request body'
      });
    }
    
    // Find payment
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      console.log(`Payment not found with ID: ${paymentId}`);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    console.log('Found payment:', {
      id: payment._id,
      method: payment.paymentMethod,
      status: payment.status
    });
    
    // Check if payment belongs to user
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }
    
    // Check if payment method is cash on delivery
    if (payment.paymentMethod !== 'cash_on_delivery') {
      return res.status(400).json({
        success: false,
        message: 'This payment is not cash on delivery'
      });
    }
    
    // Update payment status
    payment.status = 'pending'; // For COD, it remains pending until delivery
    await payment.save();
    
    // Find and update order
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.status = 'confirmed';
      await order.save();
    }
    
    return res.status(200).json({
      success: true,
      message: 'Cash on delivery order confirmed',
      data: {
        payment,
        order
      }
    });
  } catch (error) {
    console.error('Error in COD verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error confirming cash on delivery order',
      error: error.message
    });
  }
});

router.get('/', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentController.getUserPayments);
router.get('/:id', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentController.getPaymentById);
router.get('/:id/receipt', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentController.getPaymentReceipt);
router.post('/:id/refund', authorize('customer', 'restaurant_owner', 'super_admin', 'sub_admin'), paymentController.requestRefund);

// Admin-only routes
router.put('/:id/refund', authorize('super_admin', 'sub_admin', 'restaurant_owner'), paymentController.processRefund);

// Dev/testing routes - only available in development mode
if (process.env.NODE_ENV === 'development') {
  // Debug endpoint for COD verification
  router.post('/debug/verify-cod', (req, res) => {
    try {
      console.log('Debug COD verification request body:', JSON.stringify(req.body, null, 2));
      
      // Check if we have a payment ID
      if (!req.body.paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing payment ID in request body',
          expectedFormat: {
            paymentId: 'YOUR_PAYMENT_ID_HERE'
          },
          receivedBody: req.body
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Debug information for COD verification',
        info: {
          requestBody: req.body,
          nextStep: 'Use the extracted payment ID with the /verify-cod endpoint',
          correctEndpoint: '/api/v1/payments/verify-cod',
          correctMethod: 'POST',
          correctBody: {
            paymentId: req.body.paymentId
          }
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error in debug COD verification',
        error: error.message
      });
    }
  });

  // Generate a test signature
  router.post('/test/generate-signature', (req, res) => {
    try {
      const { orderId, paymentId } = req.body;
      
      if (!orderId || !paymentId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide orderId and paymentId'
        });
      }
      
      const signature = razorpayService.generateTestSignature(orderId, paymentId);
      
      return res.status(200).json({
        success: true,
        message: 'Test signature generated',
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error generating test signature',
        error: error.message
      });
    }
  });
  
  // Test endpoint for verifying signatures - available publicly for testing
  router.post('/test/verify-signature', (req, res) => {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        test_mode, 
        test_secret,
        accept_signature
      } = req.body;
      
      if (!razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({
          success: false,
          message: 'Please provide razorpay_order_id and razorpay_payment_id'
        });
      }
      
      // Special case: if accept_signature is true, always accept this signature
      if (accept_signature === true || accept_signature === 'true') {
        console.log('TEST MODE: Explicitly accepting signature as valid');
        
        if (!razorpay_signature) {
          return res.status(400).json({
            success: false,
            message: 'Cannot accept a signature that is not provided'
          });
        }
        
        // In a real application, this signature would be stored in a database for future verifications
        return res.status(200).json({
          success: true,
          message: 'Signature accepted as valid in test mode',
          test_mode: true,
          note: 'This is for testing only - in production, signatures are cryptographically verified',
          acceptance_details: {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature
          }
        });
      }
      
      // If signature is not provided, generate one and return it
      if (!razorpay_signature) {
        // If test_secret is provided, use it for generating the signature
        const signature = test_secret ? 
          generateSignatureWithSecret(razorpay_order_id, razorpay_payment_id, test_secret) : 
          razorpayService.generateTestSignature(razorpay_order_id, razorpay_payment_id);
        
        return res.status(200).json({
          success: true,
          message: 'Test signature generated',
          data: {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature: signature
          }
        });
      }
      
      // If signature is provided, verify it
      if (test_mode === 'true' || test_mode === true) {
        // Check for special test signature
        if (razorpay_signature === 'f944dafd0ddfb953d4b937b055eb1709700577fdb4bf58ee1d249bc47edfb424') {
          console.log('TEST MODE: Recognized hardcoded test signature');
          return res.status(200).json({
            success: true,
            message: 'Known test signature recognized and accepted',
            test_mode: true
          });
        }
        
        // In test mode, we'll verify the signature directly here
        // This is useful when testing with signatures generated with a different key
        const isTestingSignatureValid = verifyTestSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          test_secret || 'test_secret_key' // Use provided test secret or a default one
        );
        
        return res.status(200).json({
          success: isTestingSignatureValid,
          message: isTestingSignatureValid ? 
            'Test signature is valid (using test mode)' : 
            'Test signature verification failed (using test mode)',
          test_mode: true,
          verification_details: {
            method: 'Direct test verification',
            payload: razorpay_order_id + '|' + razorpay_payment_id,
            secret_used: test_secret ? '[CUSTOM SECRET]' : '[DEFAULT TEST SECRET]'
          }
        });
      } else {
        // Normal verification using the service
        const debug = razorpayService.debugVerifySignature({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        });
        
        return res.status(200).json({
          success: debug.success,
          message: debug.success ? 'Signature is valid' : 'Signature verification failed',
          debug
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error processing signature',
        error: error.message
      });
    }
  });

  // Special test endpoint for reverse engineering signatures
  router.post('/test/reverse-engineer-signature', (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Please provide razorpay_order_id, razorpay_payment_id, and razorpay_signature'
        });
      }
      
      // Try known secrets
      const knownSecrets = [
        process.env.RAZORPAY_KEY_SECRET,
        'test_secret_key',
        'wXWhP5gd1i0kElzgppuXPINn',
        'YourTestKeySecret', // From template .env
        'your_razorpay_webhook_secret',
        'test123',
        'razorpay',
        'secret',
        'key'
      ];
      
      // Standard payload
      const payload = razorpay_order_id + '|' + razorpay_payment_id;
      
      // Try all known secrets
      const results = knownSecrets.map(secret => {
        const generatedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
        
        return {
          secret: secret === process.env.RAZORPAY_KEY_SECRET ? '[ENV SECRET]' : secret,
          matches: generatedSignature === razorpay_signature,
          generatedSignature: generatedSignature.substring(0, 10) + '...'
        };
      });
      
      // Find any matching secrets
      const matchingSecrets = results.filter(result => result.matches);
      
      return res.status(200).json({
        success: matchingSecrets.length > 0,
        message: matchingSecrets.length > 0 
          ? `Found ${matchingSecrets.length} matching secret(s)` 
          : 'No matching secrets found',
        payload,
        providedSignature: razorpay_signature.substring(0, 10) + '...',
        matchingSecrets: matchingSecrets.map(m => ({ 
          secret: m.secret,
          generatedSignature: m.generatedSignature
        })),
        allTestedSecrets: knownSecrets.map(s => 
          s === process.env.RAZORPAY_KEY_SECRET ? '[ENV SECRET]' : s
        )
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error reverse engineering signature',
        error: error.message
      });
    }
  });
}

// Helper function to generate signatures with a specific secret
function generateSignatureWithSecret(orderId, paymentId, secretKey) {
  try {
    const payload = orderId + '|' + paymentId;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
    
    console.log('Generated test signature with custom secret:');
    console.log('- Payload:', payload);
    console.log('- Secret key used:', secretKey.substring(0, 3) + '...');
    console.log('- Generated signature:', signature.substring(0, 10) + '...');
    
    return signature;
  } catch (error) {
    console.error('Error generating test signature:', error);
    throw new Error(`Failed to generate test signature: ${error.message}`);
  }
}

// Helper function to verify test signatures with a specific secret
function verifyTestSignature(orderId, paymentId, signature, secretKey) {
  try {
    const payload = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('hex');
    
    console.log('Test verification details:');
    console.log('- Payload:', payload);
    console.log('- Secret key used:', secretKey.substring(0, 3) + '...');
    console.log('- Generated signature:', expectedSignature.substring(0, 10) + '...');
    console.log('- Provided signature:', signature.substring(0, 10) + '...');
    console.log('- Match result:', expectedSignature === signature);
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error in test signature verification:', error);
    return false;
  }
}

// Public debug endpoint for payment verification
router.post('/debug/public-verify', (req, res) => {
  try {
    // Only available in development mode
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Debug endpoints are only available in development mode'
      });
    }
    
    // Use test case or request body
    const useTestCase = req.query.useTestCase === 'true';
    
    let razorpay_order_id, razorpay_payment_id, razorpay_signature;
    
    if (useTestCase) {
      // Use test case values
      razorpay_order_id = req.body.razorpay_order_id || "67f0107b0043bd6ba498053e";
      razorpay_payment_id = req.body.razorpay_payment_id || "order_QGfMogsqjhZnsd";
      razorpay_signature = req.body.razorpay_signature;
    } else {
      // Use request body
      razorpay_order_id = req.body.razorpay_order_id;
      razorpay_payment_id = req.body.razorpay_payment_id;
      razorpay_signature = req.body.razorpay_signature;
    }
    
    console.log('Debug verification request:', {
      useTestCase,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? '[PROVIDED]' : '[MISSING]'
    });
    
    // Check if required parameters are provided
    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide razorpay_order_id and razorpay_payment_id'
      });
    }
    
    // If signature is not provided, generate one and return it
    if (!razorpay_signature) {
      const signature = razorpayService.generateTestSignature(razorpay_order_id, razorpay_payment_id);
      
      return res.status(200).json({
        success: true,
        message: 'Test signature generated for use in verification',
        data: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature: signature
        },
        instructions: 'Use this signature in your verification request'
      });
    }
    
    // If signature is provided, verify it with debug info
    const debug = razorpayService.debugVerifySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });
    
    return res.status(200).json({
      success: debug.success,
      message: debug.success ? 'Signature is valid' : 'Signature verification failed',
      debug
    });
  } catch (error) {
    console.error('Error in public debug verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing signature verification',
      error: error.message
    });
  }
});

module.exports = router; 