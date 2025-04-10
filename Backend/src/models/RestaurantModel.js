const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Restaurant name is required'],
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, 'Owner ID is required'],
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
    },
    cuisineType: {
        type: [String],
        required: [true, 'Cuisine type is required'],
    },
    address: {
        street: {
            type: String,
            required: [true, 'Street address is required'],
        },
        state: {
            type: String,
            required: [true, 'State is required'],
        },
        zipCode: {
            type: String,
            required: [true, 'ZIP code is required'],
        },
        coordinates: {
            latitude: {
                type: Number,
                required: [true, 'Latitude is required'],
            },
            longitude: {
                type: Number,
                required: [true, 'Longitude is required'],
            },
        },
    },
    contactPhone: {
        type: String,
        required: [true, 'Contact phone is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    openingHours: {
        monday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
        tuesday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
        wednesday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
        thursday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
        friday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
        saturday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
        sunday: {
            open: { type: String, required: true },
            close: { type: String, required: true },
            isClosed: { type: Boolean, default: false },
        },
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    images: {
        cover: {
            type: String,
            default: 'default_cover.jpg',
        },
    },
    logo: {
        type: String,
        default: 'default_logo.jpg',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvalRemarks: {
        type: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    approvedAt: {
        type: Date,
    },
    features: {
        hasDelivery: {
            type: Boolean,
            default: false,
        },
        hasTakeaway: {
            type: Boolean,
            default: false,
        },
        hasDineIn: {
            type: Boolean,
            default: false,
        },
        hasParking: {
            type: Boolean,
            default: false,
        },
        hasWifi: {
            type: Boolean,
            default: false,
        },
        isVegetarian: {
            type: Boolean,
            default: false,
        },
        isVegan: {
            type: Boolean,
            default: false,
        },
    },
    deliverySettings: {
        minOrderAmount: {
            type: Number,
            default: 0,
        },
        deliveryFee: {
            type: Number,
            default: 0,
        },
        freeDeliveryMinAmount: {
            type: Number,
            default: 0,
        },
        deliveryRadius: {
            type: Number,
            default: 5,
        },
        estimatedDeliveryTime: {
            type: Number,
            default: 30,
        },
    },
    paymentMethods: {
        acceptCash: {
            type: Boolean,
            default: true,
        },
        acceptsCard: {
            type: Boolean,
            default: true,
        },
        acceptsUPI: {
            type: Boolean,
            default: false,
        },
        acceptsWallet: {
            type: Boolean,
            default: false,
        },
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Virtual for menu items
RestaurantSchema.virtual('menuItems', {
    ref: 'MenuItem',
    localField: '_id',
    foreignField: 'restaurantId',
    justOne: false,
});

// Method to check if restaurant is open now
RestaurantSchema.methods.isOpenNow = function () {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];

    const todayHours = this.openingHours[today];

    // check if today is closed
    if (todayHours.isClosed) {
        return false;
    }

    // Parse opening and closing hours
    const openTime = todayHours.open.split(":");
    const closeTime = todayHours.close.split(":");

    const openHour = parseInt(openTime[0]);
    const openMinute = parseInt(openTime[1]);
    const closeHour = parseInt(closeTime[0]);
    const closeMinute = parseInt(closeTime[1]);

    // Create Date objects for opening and closing times
    const openDate = new Date(now);
    openDate.setHours(openHour, openMinute, 0, 0);

    const closeDate = new Date(now);
    closeDate.setHours(closeHour, closeMinute, 0, 0);

    // Check if current time is within opening hours and closing hours
    return now >= openDate && now <= closeDate;
};

const Restaurant = mongoose.model('Restaurant', RestaurantSchema);
module.exports = Restaurant;
