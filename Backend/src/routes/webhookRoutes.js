const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

// Webhook routes are public (no auth required)
// They are secured by the webhook signature verification

// Razorpay webhook
router.post('/razorpay', 
  express.raw({ type: 'application/json' }), 
  (req, res, next) => {
    // Parse the raw body
    if (req.body.length) {
      req.body = JSON.parse(req.body.toString());
    }
    next();
  },
  webhookController.handleRazorpayWebhook
);

module.exports = router;