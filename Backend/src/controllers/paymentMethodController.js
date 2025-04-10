const PaymentMethod = require('../models/PaymentMethodModel');
const mongoose = require('mongoose');

// Add a new payment method
const addPaymentMethod = async (req, res) => {
  try {
    const {
      type,
      name,
      cardNumber,
      cardHolderName,
      expiryMonth,
      expiryYear,
      cvv,
      upiId,
      walletProvider,
      walletId,
      bankName,
      accountNumber,
      ifscCode,
      isDefault
    } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Payment method type is required'
      });
    }

    // Validate based on payment method type
    if (type === 'card') {
      if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv) {
        return res.status(400).json({
          success: false,
          message: 'All card details are required'
        });
      }
    } else if (type === 'upi') {
      if (!upiId) {
        return res.status(400).json({
          success: false,
          message: 'UPI ID is required'
        });
      }
    } else if (type === 'wallet') {
      if (!walletProvider || !walletId) {
        return res.status(400).json({
          success: false,
          message: 'Wallet provider and ID are required'
        });
      }
    } else if (type === 'bank_transfer') {
      if (!bankName || !accountNumber || !ifscCode) {
        return res.status(400).json({
          success: false,
          message: 'Bank details are required'
        });
      }
    }

    // Extract last 4 digits of card number if provided
    const cardNumberLast4 = cardNumber ? cardNumber.slice(-4) : null;
    
    // Extract card type (simplified version)
    let cardType = null;
    if (cardNumber) {
      if (cardNumber.startsWith('4')) {
        cardType = 'visa';
      } else if (cardNumber.startsWith('5')) {
        cardType = 'mastercard';
      } else if (cardNumber.startsWith('3')) {
        cardType = 'amex';
      } else {
        cardType = 'other';
      }
    }

    // If this is the first payment method or isDefault is true, set as default
    const existingMethods = await PaymentMethod.countDocuments({ userId: req.user._id });
    const shouldBeDefault = existingMethods === 0 || isDefault;

    // If setting as default, unset any existing default
    if (shouldBeDefault) {
      await PaymentMethod.updateMany(
        { userId: req.user._id, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    // Create payment method
    const paymentMethod = await PaymentMethod.create({
      userId: req.user._id,
      type,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${cardNumberLast4 ? `ending in ${cardNumberLast4}` : ''}`,
      cardNumber,
      cardNumberLast4,
      cardType,
      cardHolderName,
      expiryMonth,
      expiryYear,
      cvv,
      upiId,
      walletProvider,
      walletId,
      bankName,
      accountNumber,
      ifscCode,
      isDefault: shouldBeDefault
    });

    // Don't return sensitive data
    const sanitizedPaymentMethod = {
      _id: paymentMethod._id,
      userId: paymentMethod.userId,
      type: paymentMethod.type,
      name: paymentMethod.name,
      cardNumberLast4: paymentMethod.cardNumberLast4,
      cardType: paymentMethod.cardType,
      cardHolderName: paymentMethod.cardHolderName,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      upiId: paymentMethod.upiId,
      walletProvider: paymentMethod.walletProvider,
      bankName: paymentMethod.bankName,
      isDefault: paymentMethod.isDefault,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt
    };

    return res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: sanitizedPaymentMethod
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error adding payment method',
      error: error.message
    });
  }
};

// Get all payment methods for a user
const getUserPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({ userId: req.user._id })
      .select('-cardNumber -cvv -accountNumber');

    return res.status(200).json({
      success: true,
      count: paymentMethods.length,
      data: paymentMethods
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving payment methods',
      error: error.message
    });
  }
};

//  Get a payment method by ID
const getPaymentMethodById = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id)
      .select('-cardNumber -cvv -accountNumber');

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Check if payment method belongs to user
    if (paymentMethod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment method'
      });
    }

    return res.status(200).json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving payment method',
      error: error.message
    });
  }
};

// Update a payment method
const updatePaymentMethod = async (req, res) => {
  try {
    const {
      name,
      expiryMonth,
      expiryYear,
      upiId,
      walletId,
      isDefault
    } = req.body;

    // Find payment method
    const paymentMethod = await PaymentMethod.findById(req.params.id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Check if payment method belongs to user
    if (paymentMethod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this payment method'
      });
    }

    // Update fields
    if (name) paymentMethod.name = name;
    if (expiryMonth) paymentMethod.expiryMonth = expiryMonth;
    if (expiryYear) paymentMethod.expiryYear = expiryYear;
    if (upiId) paymentMethod.upiId = upiId;
    if (walletId) paymentMethod.walletId = walletId;

    // If setting as default, unset any existing default
    if (isDefault && !paymentMethod.isDefault) {
      await PaymentMethod.updateMany(
        { userId: req.user._id, isDefault: true },
        { $set: { isDefault: false } }
      );
      paymentMethod.isDefault = true;
    }

    await paymentMethod.save();

    return res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
      data: {
        _id: paymentMethod._id,
        userId: paymentMethod.userId,
        type: paymentMethod.type,
        name: paymentMethod.name,
        cardNumberLast4: paymentMethod.cardNumberLast4,
        cardType: paymentMethod.cardType,
        cardHolderName: paymentMethod.cardHolderName,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
        upiId: paymentMethod.upiId,
        walletProvider: paymentMethod.walletProvider,
        bankName: paymentMethod.bankName,
        isDefault: paymentMethod.isDefault,
        createdAt: paymentMethod.createdAt,
        updatedAt: paymentMethod.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating payment method',
      error: error.message
    });
  }
};

// Delete a payment method
const deletePaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Check if payment method belongs to user
    if (paymentMethod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this payment method'
      });
    }

    // If this is the default payment method and there are others, set another one as default
    if (paymentMethod.isDefault) {
      const anotherMethod = await PaymentMethod.findOne({
        userId: req.user._id,
        _id: { $ne: paymentMethod._id }
      });

      if (anotherMethod) {
        anotherMethod.isDefault = true;
        await anotherMethod.save();
      }
    }

    await PaymentMethod.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting payment method',
      error: error.message
    });
  }
};


//  Set a payment method as default
const setDefaultPaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Check if payment method belongs to user
    if (paymentMethod.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this payment method'
      });
    }

    // Already default
    if (paymentMethod.isDefault) {
      return res.status(200).json({
        success: true,
        message: 'Payment method is already set as default',
        data: paymentMethod
      });
    }

    // Unset any existing default
    await PaymentMethod.updateMany(
      { userId: req.user._id, isDefault: true },
      { $set: { isDefault: false } }
    );

    // Set this one as default
    paymentMethod.isDefault = true;
    await paymentMethod.save();

    return res.status(200).json({
      success: true,
      message: 'Payment method set as default successfully',
      data: paymentMethod
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error setting default payment method',
      error: error.message
    });
  }
};


module.exports = {
  addPaymentMethod,
  getUserPaymentMethods,
  getPaymentMethodById,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod
};
