const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    resturentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required'],
    },
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    image: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
    },
    toObject: {
        virtuals: true,
    },
});

// Virtuals for menu items in this category
categorySchema.virtual('menuItems', {
    ref: 'MenuItem',
    localField: '_id',
    foreignField: 'categoryId',
    justOne: false,
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;