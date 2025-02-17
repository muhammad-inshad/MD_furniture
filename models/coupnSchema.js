const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true // Removes extra spaces
    },
    discountType: {
        type: String,
        required: true,
        enum: ["percentage", "fixed"] // Restrict values to "percentage" or "fixed"
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0 // Ensures non-negative value
    },
    minPurchase: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscount: {
        type: Number,
        default: null // Optional field
    },
    usageLimit: {
        type: Number,
        required: true,
        min: 1 // Ensures at least 1 use
    },
    expiredOn: {
        type: Date,
        required: true
    },
    createdOn: {
        type: Date,
        default: Date.now // Automatically sets creation date
    }
});

// Indexing for better search performance
couponSchema.index({ name: 1, expiredOn: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
