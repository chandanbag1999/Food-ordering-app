const mongoose = require('mongoose');
const crypto = require('crypto');

const PaymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    required: [true, 'Payment method type is required'],
    enum: ['credit_card', 'debit_card', 'upi', 'wallet', 'net_banking', 'other']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: [true, 'Payment method name is required'],
    trim: true
  },
  // Credit/Debit Card specific fields
  cardNumber: {
    type: String,
    trim: true,
    select: false // Don't include in query results by default
  },
  cardNumberLast4: {
    type: String,
    trim: true
  },
  cardType: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'rupay', 'other', null],
    default: null
  },
  expiryMonth: {
    type: String,
    trim: true,
    select: false
  },
  expiryYear: {
    type: String,
    trim: true,
    select: false
  },
  cvv: {
    type: String,
    trim: true,
    select: false
  },
  cardHolderName: {
    type: String,
    trim: true
  },
  // UPI specific fields
  upiId: {
    type: String,
    trim: true
  },
  // Wallet specific fields
  walletProvider: {
    type: String,
    trim: true,
    enum: ['paytm', 'phonepe', 'googlepay', 'amazonpay', 'mobikwik', 'other', null],
    default: null
  },
  walletPhoneNumber: {
    type: String,
    trim: true
  },
  // Net Banking specific fields
  bankName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true,
    select: false
  },
  accountHolderName: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true
  },
  // Common fields
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Gateway specific fields
  gatewayCustomerId: {
    type: String,
    trim: true
  },
  gatewayPaymentMethodId: {
    type: String,
    trim: true
  },
  gatewayType: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'paytm', 'other', null],
    default: null
  },
  // Status and metadata
  isActive: {
    type: Boolean,
    default: true
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
PaymentMethodSchema.index({ userId: 1 });
PaymentMethodSchema.index({ userId: 1, isDefault: 1 });

// Encrypt sensitive data before saving
PaymentMethodSchema.pre('save', function(next) {
  // Only encrypt if the fields are modified
  if (this.isModified('cardNumber') && this.cardNumber) {
    // Save last 4 digits
    this.cardNumberLast4 = this.cardNumber.slice(-4);
    
    // Encrypt card number
    try {
      const algorithm = 'aes-256-ctr';
      // Ensure the secret key is exactly 32 bytes (256 bits) for AES-256
      let secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-bytes-long!';
      // If the key is not 32 bytes, hash it to get a consistent 32-byte key
      if (Buffer.from(secretKey).length !== 32) {
        secretKey = crypto.createHash('sha256').update(String(secretKey)).digest();
      }
      
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
      const encrypted = Buffer.concat([cipher.update(this.cardNumber), cipher.final()]);
      
      this.cardNumber = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error('Error encrypting card number:', error);
      return next(error);
    }
  }
  
  if (this.isModified('cvv') && this.cvv) {
    // Encrypt CVV
    try {
      const algorithm = 'aes-256-ctr';
      // Ensure the secret key is exactly 32 bytes (256 bits) for AES-256
      let secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-bytes-long!';
      // If the key is not 32 bytes, hash it to get a consistent 32-byte key
      if (Buffer.from(secretKey).length !== 32) {
        secretKey = crypto.createHash('sha256').update(String(secretKey)).digest();
      }
      
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
      const encrypted = Buffer.concat([cipher.update(this.cvv), cipher.final()]);
      
      this.cvv = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error('Error encrypting CVV:', error);
      return next(error);
    }
  }
  
  // Encrypt account number if it's modified and exists
  if (this.isModified('accountNumber') && this.accountNumber) {
    try {
      const algorithm = 'aes-256-ctr';
      // Ensure the secret key is exactly 32 bytes (256 bits) for AES-256
      let secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-bytes-long!';
      // If the key is not 32 bytes, hash it to get a consistent 32-byte key
      if (Buffer.from(secretKey).length !== 32) {
        secretKey = crypto.createHash('sha256').update(String(secretKey)).digest();
      }
      
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
      const encrypted = Buffer.concat([cipher.update(this.accountNumber), cipher.final()]);
      
      this.accountNumber = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error('Error encrypting account number:', error);
      return next(error);
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

// Method to decrypt card number
PaymentMethodSchema.methods.decryptCardNumber = function() {
  if (!this.cardNumber) return null;
  
  try {
    const [ivHex, encryptedHex] = this.cardNumber.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    // Ensure the secret key is exactly 32 bytes (256 bits) for AES-256
    let secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-bytes-long!';
    // If the key is not 32 bytes, hash it to get a consistent 32-byte key
    if (Buffer.from(secretKey).length !== 32) {
      secretKey = crypto.createHash('sha256').update(String(secretKey)).digest();
    }
    
    const decipher = crypto.createDecipheriv('aes-256-ctr', secretKey, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting card number:', error);
    return null;
  }
};

// Method to decrypt account number
PaymentMethodSchema.methods.decryptAccountNumber = function() {
  if (!this.accountNumber) return null;
  
  try {
    const [ivHex, encryptedHex] = this.accountNumber.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    // Ensure the secret key is exactly 32 bytes (256 bits) for AES-256
    let secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-bytes-long!';
    // If the key is not 32 bytes, hash it to get a consistent 32-byte key
    if (Buffer.from(secretKey).length !== 32) {
      secretKey = crypto.createHash('sha256').update(String(secretKey)).digest();
    }
    
    const decipher = crypto.createDecipheriv('aes-256-ctr', secretKey, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting account number:', error);
    return null;
  }
};

// Method to set as default payment method
PaymentMethodSchema.methods.setAsDefault = async function() {
  // First, unset default for all other payment methods of this user
  await this.constructor.updateMany(
    { userId: this.userId, _id: { $ne: this._id } },
    { isDefault: false }
  );
  
  // Set this one as default
  this.isDefault = true;
  return this;
};

const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);

module.exports = PaymentMethod;

