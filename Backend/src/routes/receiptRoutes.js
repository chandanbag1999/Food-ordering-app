const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Payment = require('../models/paymentModel');
const router = express.Router();

// Protect all routes
router.use(protect);

// Get receipt for a payment
router.get('/:id', async (req, res) => {
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
        message: 'Not authorized to access this receipt'
      });
    }
    
    // Get provisional flag from query params
    const provisional = req.query.provisional === 'true';
    
    // Check if receipt is available based on payment status
    if (payment.status === 'completed' || provisional) {
      // For completed payments or provisional receipts in development
      
      // In a real app, this would generate a PDF or HTML receipt
      // For now, we'll return a placeholder HTML with payment details
      
      // Set response type to HTML
      res.setHeader('Content-Type', 'text/html');
      
      // Generate a simple HTML receipt
      const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${provisional ? 'Provisional Receipt' : 'Payment Receipt'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .receipt { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; }
          .provisional-banner { background-color: #ffec9e; padding: 10px; text-align: center; margin-bottom: 20px; }
          .company { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .title { font-size: 20px; margin-bottom: 20px; color: #888; }
          .info-row { display: flex; margin-bottom: 5px; }
          .label { width: 150px; font-weight: bold; }
          .value { flex: 1; }
          .amount { text-align: right; }
          .total { font-weight: bold; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
          .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
        </style>
      </head>
      <body>
        <div class="receipt">
          ${provisional ? '<div class="provisional-banner">PROVISIONAL RECEIPT - PAYMENT NOT YET COMPLETED</div>' : ''}
          <div class="header">
            <div class="company">MealLink</div>
            <div class="title">${provisional ? 'PROVISIONAL RECEIPT' : 'PAYMENT RECEIPT'}</div>
          </div>
          
          <div class="info-row">
            <div class="label">Receipt ID:</div>
            <div class="value">${payment._id}</div>
          </div>
          
          <div class="info-row">
            <div class="label">Date:</div>
            <div class="value">${new Date(payment.createdAt).toLocaleString()}</div>
          </div>
          
          <div class="info-row">
            <div class="label">Payment Method:</div>
            <div class="value">${payment.paymentMethod}</div>
          </div>
          
          <div class="info-row">
            <div class="label">Payment Status:</div>
            <div class="value">${payment.status}</div>
          </div>
          
          <div class="info-row">
            <div class="label">Amount:</div>
            <div class="value amount">₹${payment.amount.toFixed(2)}</div>
          </div>
          
          <div class="info-row total">
            <div class="label">Total:</div>
            <div class="value amount">₹${payment.amount.toFixed(2)}</div>
          </div>
          
          <div class="footer">
            <p>Thank you for using MealLink!</p>
            ${provisional ? '<p>This is a provisional receipt. The final receipt will be available once payment is completed.</p>' : ''}
            <p>For any inquiries, please contact support@meallink.com</p>
          </div>
        </div>
      </body>
      </html>
      `;
      
      return res.send(receiptHtml);
    } else {
      // For payments with other statuses
      return res.status(400).json({
        success: false,
        message: `Receipt is not available for payments with status: ${payment.status}`
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
});

module.exports = router; 