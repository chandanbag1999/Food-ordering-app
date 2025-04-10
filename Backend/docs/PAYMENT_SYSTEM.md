# Payment System Implementation

This document provides an overview of the payment system implementation for the Zomato Clone API.

## Models

### Payment Model (`src/models/Payment.js`)

The Payment model stores information about each payment transaction:

- Basic payment information (amount, currency, status)
- Payment method details
- Payment gateway information
- Transaction IDs and references
- Refund tracking
- Error handling
- Receipt generation

Methods include:
- `updateStatus`: Update payment status with additional details
- `processRefund`: Record refund details
- `updateRefundStatus`: Track refund status changes
- `generateReceipt`: Create a receipt URL for completed payments

### Payment Method Model (`src/models/PaymentMethod.js`)

The PaymentMethod model allows users to save their payment methods securely:

- Support for multiple payment types (cards, UPI, wallets, bank transfers)
- Secure storage with encryption for sensitive data
- Default payment method management
- Card type detection

Methods include:
- `decryptCardNumber`: Decrypt stored card number (for authorized use)
- `setAsDefault`: Set a payment method as the default

## Controllers

### Payment Controller (`src/controllers/paymentController.js`)

Handles all payment-related operations:

- `initializePayment`: Start a payment for an order
- `verifyPayment`: Verify and complete a payment
- `getPaymentById`: Retrieve payment details
- `getUserPayments`: Get all payments for a user
- `requestRefund`: Request a refund for a payment
- `processRefund`: Process a refund request (admin only)
- `getPaymentReceipt`: Generate a payment receipt

### Payment Method Controller (`src/controllers/paymentMethodController.js`)

Manages saved payment methods:

- `addPaymentMethod`: Save a new payment method
- `getUserPaymentMethods`: Get all payment methods for a user
- `getPaymentMethodById`: Get details of a specific payment method
- `updatePaymentMethod`: Update a payment method
- `deletePaymentMethod`: Remove a payment method
- `setDefaultPaymentMethod`: Set a payment method as default

### Webhook Controller (`src/controllers/webhookController.js`)

Handles payment gateway callbacks:

- `handleRazorpayWebhook`: Process Razorpay webhook events
- Event handlers for payment authorization, capture, failure
- Event handlers for refund creation, processing, failure

## Services

### Razorpay Service (`src/services/razorpayService.js`)

Integrates with the Razorpay payment gateway:

- `createOrder`: Create a new order in Razorpay
- `verifyPaymentSignature`: Verify payment signatures
- `fetchPayment`: Get payment details from Razorpay
- `capturePayment`: Capture an authorized payment
- `refundPayment`: Process a refund
- `createCustomer`: Create a customer in Razorpay
- `createToken`: Create a token for saved cards
- `generateCheckoutOptions`: Generate options for the frontend checkout

## Routes

### Payment Routes (`src/routes/paymentRoutes.js`)

API endpoints for payment operations:

- `POST /api/payments/initialize`: Initialize a payment
- `POST /api/payments/verify`: Verify a payment
- `GET /api/payments`: Get user payments
- `GET /api/payments/:id`: Get payment details
- `POST /api/payments/:id/refund`: Request a refund
- `PUT /api/payments/:id/refund`: Process a refund (admin)
- `GET /api/payments/:id/receipt`: Get payment receipt

### Payment Method Routes (`src/routes/paymentMethodRoutes.js`)

API endpoints for payment method management:

- `POST /api/payment-methods`: Add a payment method
- `GET /api/payment-methods`: Get user payment methods
- `GET /api/payment-methods/:id`: Get payment method details
- `PUT /api/payment-methods/:id`: Update a payment method
- `DELETE /api/payment-methods/:id`: Delete a payment method
- `PUT /api/payment-methods/:id/default`: Set as default

### Webhook Routes (`src/routes/webhookRoutes.js`)

Endpoints for payment gateway callbacks:

- `POST /api/webhooks/razorpay`: Handle Razorpay webhook events

## Security Considerations

1. **Sensitive Data Encryption**: Card numbers and CVV are encrypted before storage
2. **PCI Compliance**: Minimal storage of payment data
3. **Webhook Signature Verification**: All webhooks are verified using cryptographic signatures
4. **Authorization**: All routes are protected with appropriate authorization
5. **Data Sanitization**: Sensitive payment data is sanitized in responses

## Integration with Order System

- Orders are updated with payment status
- Order status changes based on payment events
- Refunds update order status

## Testing the Payment System

To test the payment system:

1. Set up Razorpay test credentials in `.env`
2. Create an order through the API
3. Initialize payment for the order
4. Use Razorpay test cards to complete payment
5. Verify the payment status

## Future Enhancements

1. Support for additional payment gateways
2. Subscription payment support
3. Split payments for marketplace model
4. Enhanced analytics for payment data
5. Fraud detection integration 