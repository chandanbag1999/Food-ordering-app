# How to Test Razorpay Signature Verification

This guide provides step-by-step instructions for testing Razorpay payments in your development environment.

## Setup

1. **Razorpay Test Credentials**
   - Make sure you have set up Razorpay test keys in your `.env` file:
   ```
   RAZORPAY_KEY_ID=rzp_test_7LxpmwfSTBwTPO
   RAZORPAY_KEY_SECRET=wXWhP5gd1i0kElzgppuXPINn
   ```

2. **Test Cards**
   Use these test cards for payments:
   - Card Number: `4111 1111 1111 1111`
   - Expiry: Any future date (e.g., 12/25)
   - CVV: Any 3 digits (e.g., 123)
   - Name: Any name

## Method 1: Generate a Test Signature

This API endpoint can generate valid test signatures based on your Razorpay Key Secret:

```
POST http://localhost:5001/api/v1/payments/test/generate-signature
Body:
{
  "orderId": "67f0107b0043bd6ba498053e",
  "paymentId": "order_QGfMogsqjhZnsd"
}
```

Response:
```json
{
  "success": true,
  "message": "Test signature generated",
  "data": {
    "razorpay_order_id": "67f0107b0043bd6ba498053e",
    "razorpay_payment_id": "order_QGfMogsqjhZnsd",
    "razorpay_signature": "generated_signature_here"
  }
}
```

## Method 2: Verify Without Signature (Development Only)

In development mode, you can send a verification request without a signature:

```
POST http://localhost:5001/api/v1/payments/verify
Headers:
Authorization: Bearer YOUR_JWT_TOKEN
Body:
{
  "paymentId": "67f56e2b6c4ba388af295304",
  "razorpay_payment_id": "order_QGfMogsqjhZnsd",
  "razorpay_order_id": "67f0107b0043bd6ba498053e"
}
```

The system will generate a test signature for you and accept the payment in development mode.

## Method 3: Debug Signature Verification

This endpoint helps debug signature verification issues:

```
POST http://localhost:5001/api/v1/payments/debug/public-verify
Body:
{
  "razorpay_order_id": "67f0107b0043bd6ba498053e",
  "razorpay_payment_id": "order_QGfMogsqjhZnsd",
  "razorpay_signature": "your_signature_here"
}
```

If you don't include a signature, it will generate one for you:

```
POST http://localhost:5001/api/v1/payments/debug/public-verify
Body:
{
  "razorpay_order_id": "67f0107b0043bd6ba498053e",
  "razorpay_payment_id": "order_QGfMogsqjhZnsd"
}
```

## Troubleshooting

### Common Issues

1. **Invalid Signature**
   - The order of the payload may be incorrect (should be `orderId|paymentId`)
   - The Razorpay secret key might be wrong
   - The order ID or payment ID might be in a different format than expected

2. **Missing Order ID or Payment ID**
   - Make sure you are providing both in the verification request

3. **Order ID Format**
   - Razorpay sometimes prefixes the order ID with `order_`
   - Make sure you're using the correct format

## Production Implementation

In production:

1. **Always require signatures** for payment verification
2. **Store the Razorpay order ID** in your database when initializing payment
3. **Use HTTPS** for all payment-related communication
4. **Implement webhook handling** for asynchronous payment notifications
5. **Handle failures gracefully** with appropriate error messages to users

## Testing Flow

1. Initialize payment to get Razorpay checkout details
2. Complete the payment using test card details
3. In the success callback, capture all three parameters:
   - `razorpay_order_id`
   - `razorpay_payment_id`
   - `razorpay_signature`
4. Send these to your backend for verification

## Frontend Integration

In your frontend React code:

```javascript
const handlePayment = async () => {
  // 1. Initialize payment with your backend
  const response = await api.post('/api/v1/payments/initialize', {
    orderId: '123456',
    paymentMethod: { type: 'card' }
  });
  
  const { checkoutOptions } = response.data.data;
  
  // 2. Create Razorpay instance
  const razorpay = new window.Razorpay(checkoutOptions);
  
  // 3. Open checkout modal
  razorpay.open();
  
  // 4. Define success callback
  razorpay.on('payment.success', async (res) => {
    // 5. Send verification to your backend
    await api.post('/api/v1/payments/verify', {
      paymentId: response.data.data.payment._id,
      razorpay_order_id: res.razorpay_order_id,
      razorpay_payment_id: res.razorpay_payment_id,
      razorpay_signature: res.razorpay_signature
    });
    
    // 6. Show success message
    showSuccessMessage('Payment successful!');
  });
};
```
