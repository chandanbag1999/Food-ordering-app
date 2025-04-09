const Razorpay = require('razorpay');
const crypto = require('crypto');


// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// Create a new order in Razorpay
const createOrder = async (orderData) => {
  try {
    const options = {
      amount: Math.round(orderData.amount * 100), // amount in smallest currency unit (paise)
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes || {},
      payment_capture: 1 // Auto-capture payment
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay create order error:', error);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
};


// Verify Razorpay payment signature - corrected implementation based on Razorpay docs
const verifyPaymentSignature = (paymentData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    console.log('Verifying Razorpay signature with:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? '[PROVIDED]' : '[MISSING]'
    });
    
    // Make sure all required parameters are present
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing required parameters for signature verification');
      return false;
    }
    
    // According to Razorpay docs:
    // The hmac of orderId + "|" + paymentId concatenated with the secret key
    const payload = razorpay_order_id + "|" + razorpay_payment_id;
    console.log('Payload for signature generation:', payload);
    
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');
    
    // Log for debugging (partial to prevent leaking sensitive data)
    console.log('Generated signature (first 10 chars):', generatedSignature.substring(0, 10) + '...');
    console.log('Actual signature (first 10 chars):', 
      razorpay_signature ? razorpay_signature.substring(0, 10) + '...' : 'Invalid signature');
    
    const isValid = generatedSignature === razorpay_signature;
    console.log('Signature verification result:', isValid ? 'VALID' : 'INVALID');
    
    return isValid;
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
};


//  Fetch payment details from Razorpay
const fetchPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay fetch payment error:', error);
    throw new Error(`Failed to fetch Razorpay payment: ${error.message}`);
  }
};


//  Capture a payment in Razorpay
const capturePayment = async (paymentId, amount) => {
  try {
    const payment = await razorpay.payments.capture(paymentId, amount);
    return payment;
  } catch (error) {
    console.error('Razorpay capture payment error:', error);
    throw new Error(`Failed to capture Razorpay payment: ${error.message}`);
  }
};


// Refund a payment in Razorpay
const refundPayment = async (paymentId, amount, options = {}) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount,
      speed: options.speed || 'normal', // 'normal' or 'optimum'
      notes: options.notes || {}
    });
    return refund;
  } catch (error) {
    console.error('Razorpay refund payment error:', error);
    throw new Error(`Failed to refund Razorpay payment: ${error.message}`);
  }
};


//  Fetch refund details from Razorpay
const fetchRefund = async (refundId) => {
  try {
    const refund = await razorpay.refunds.fetch(refundId);
    return refund;
  } catch (error) {
    console.error('Razorpay fetch refund error:', error);
    throw new Error(`Failed to fetch Razorpay refund: ${error.message}`);
  }
};


//  Create a customer in Razorpay
const createCustomer = async (customerData) => {
  try {
    const customer = await razorpay.customers.create({
      name: customerData.name,
      email: customerData.email,
      contact: customerData.phone,
      notes: customerData.notes || {}
    });
    return customer;
  } catch (error) {
    console.error('Razorpay create customer error:', error);
    throw new Error(`Failed to create Razorpay customer: ${error.message}`);
  }
};


// Create a token for saved card in Razorpay
const createToken = async (tokenData) => {
  try {
    const token = await razorpay.tokens.create({
      customer_id: tokenData.customerId,
      method: 'card',
      card: {
        number: tokenData.cardNumber,
        name: tokenData.cardHolderName,
        expiry_month: tokenData.expiryMonth,
        expiry_year: tokenData.expiryYear,
        cvv: tokenData.cvv
      }
    });
    return token;
  } catch (error) {
    console.error('Razorpay create token error:', error);
    throw new Error(`Failed to create Razorpay token: ${error.message}`);
  }
};


//  Delete a token in Razorpay
const deleteToken = async (customerId, tokenId) => {
  try {
    const response = await razorpay.customers.deleteToken(customerId, tokenId);
    return response;
  } catch (error) {
    console.error('Razorpay delete token error:', error);
    throw new Error(`Failed to delete Razorpay token: ${error.message}`);
  }
};


// Generate checkout options for frontend
const generateCheckoutOptions = (orderData, userData) => {
  return {
    key: process.env.RAZORPAY_KEY_ID,
    amount: Math.round(orderData.amount * 100),
    currency: orderData.currency || 'INR',
    name: process.env.COMPANY_NAME || 'Food Delivery App',
    description: orderData.description || 'Food Order Payment',
    order_id: orderData.razorpayOrderId,
    prefill: {
      name: userData.name,
      email: userData.email,
      contact: userData.phone
    },
    notes: {
      orderId: orderData.orderId,
      userId: userData.userId,
      ...orderData.notes
    },
    theme: {
      color: process.env.THEME_COLOR || '#F37254'
    }
  };
};


// Debug helper function to manually test a payment signature
const debugVerifySignature = (paymentData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    console.log('Debug signature verification with values:');
    console.log('- Order ID:', razorpay_order_id);
    console.log('- Payment ID:', razorpay_payment_id);
    console.log('- Signature:', razorpay_signature ? '[PROVIDED]' : '[MISSING]');
    console.log('- Using secret ending with:', process.env.RAZORPAY_KEY_SECRET.slice(-4));
    
    // Standard format: orderId|paymentId
    const payload1 = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature1 = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload1)
      .digest('hex');
    
    // Try reversed order format: paymentId|orderId
    const payload2 = razorpay_payment_id + "|" + razorpay_order_id;
    const expectedSignature2 = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload2)
      .digest('hex');
    
    // Try with order_* prefix if not already present
    let payload3 = payload1;
    if (!razorpay_order_id.startsWith('order_')) {
      payload3 = 'order_' + razorpay_order_id + "|" + razorpay_payment_id;
    }
    const expectedSignature3 = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload3)
      .digest('hex');
    
    // Try with all lowercase
    const payload4 = payload1.toLowerCase();
    const expectedSignature4 = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload4)
      .digest('hex');
    
    console.log('Test results:');
    console.log('1. Standard format (orderId|paymentId):');
    console.log('   Payload:', payload1);
    console.log('   Generated:', expectedSignature1.substring(0, 10) + '...');
    console.log('   Matches:', expectedSignature1 === razorpay_signature);
    
    console.log('2. Reversed format (paymentId|orderId):');
    console.log('   Payload:', payload2);
    console.log('   Generated:', expectedSignature2.substring(0, 10) + '...');
    console.log('   Matches:', expectedSignature2 === razorpay_signature);
    
    console.log('3. With order_ prefix:');
    console.log('   Payload:', payload3);
    console.log('   Generated:', expectedSignature3.substring(0, 10) + '...');
    console.log('   Matches:', expectedSignature3 === razorpay_signature);
    
    console.log('4. Lowercase format:');
    console.log('   Payload:', payload4);
    console.log('   Generated:', expectedSignature4.substring(0, 10) + '...');
    console.log('   Matches:', expectedSignature4 === razorpay_signature);
    
    const results = {
      standard: expectedSignature1 === razorpay_signature,
      reversed: expectedSignature2 === razorpay_signature,
      prefixed: expectedSignature3 === razorpay_signature,
      lowercase: expectedSignature4 === razorpay_signature
    };
    
    return {
      success: Object.values(results).some(r => r === true),
      payloads: {
        standard: payload1,
        reversed: payload2,
        prefixed: payload3,
        lowercase: payload4
      },
      signatures: {
        standard: expectedSignature1,
        reversed: expectedSignature2,
        prefixed: expectedSignature3,
        lowercase: expectedSignature4
      },
      results
    };
  } catch (error) {
    console.error('Debug signature verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate a test signature for payment verification
const generateTestSignature = (orderId, paymentId) => {
  try {
    console.log('Generating test signature for:');
    console.log('- Order ID:', orderId);
    console.log('- Payment ID:', paymentId);
    
    // Generate the standard format signature
    const payload = orderId + "|" + paymentId;
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');
    
    console.log('Generated signature (first 10 chars):', signature.substring(0, 10) + '...');
    
    return signature;
  } catch (error) {
    console.error('Error generating test signature:', error);
    throw new Error(`Failed to generate test signature: ${error.message}`);
  }
};

module.exports = { 
  createOrder, 
  verifyPaymentSignature,
  fetchPayment,
  capturePayment,
  refundPayment,
  fetchRefund,
  createCustomer,
  createToken,
  deleteToken,
  generateCheckoutOptions,
  debugVerifySignature,
  generateTestSignature
};