  const mongoose = require("mongoose");
  const { Schema } = mongoose;

  const productSchema = new Schema(
    {
      productName: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      brand: {
        type: String,
        required: true,
      },
      category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true, // Fixed typo
      },
    
      salePrice: {
        type: Number,
        required: true,
      },
      productOffer: {
        type: Number,
        default: 0,
      },
      quantity: {
        type: Number,
        default: 0,
      },
      productImages: {
        type: [String],
        required: true,
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ["Available", "out of stock", "Discontinued"],
        required: true, // Fixed typo
        default: "Available",
      },
      rating: {
        type:Number,
        default: 1
      },
      salesCount: 
      { type: Number, 
        default: 0 },
    },
    { timestamps: true }
  );

  const Product = mongoose.model("Product", productSchema); // Fixed `Model` to `model`

  module.exports = Product;
