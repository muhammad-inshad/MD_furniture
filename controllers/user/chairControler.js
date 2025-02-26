const { render } = require('../../app');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const user = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const { session } = require('passport');
const bcrypt = require("bcrypt")
const Cart = require("../../models/cartSchema")
const Order = require("../../models/orderSchema")
const Wishlist = require("../../models/wishlistSchema")
const Coupon = require("../../models/coupnSchema")
const Razorpay=require("razorpay")



const chair = async (req, res) => {
    try {
        const findProduct = await Product.find({ isDeleted: false }).populate({
            path: 'category',
            match: { status: 'active', isDeleted: false }
        });

        let userId = null;
        let isLogin = false;
        let countWishlist = 0;
        let cartCount = 0;
        let wishlistProductIds = [];

        if (req.session && req.session.user) {
            userId = req.session.user.id;
            isLogin = true;

            const userCart = await Cart.findOne({ userId });
            cartCount = userCart ? userCart.items.length : 0;

            const wishlist = await Wishlist.findOne({ userId });
            countWishlist = wishlist ? wishlist.products.length : 0;

            // Store wishlist product IDs for easy checking
            if (wishlist) {
                wishlistProductIds = wishlist.products.map(p => p.productId.toString());
            }
        }

        // Filter products for the "chair" category
        const chairProducts = findProduct.filter(product => product?.category?.name === "chair");

        // Render the page with wishlist information
        res.render("chair", {
            findProduct: chairProducts,
            isLogin,
            cartCount,
            countWishlist,
            wishlistProductIds // Pass wishlist product IDs
        });

    } catch (error) {
        console.error("Error fetching chair products:", error);
        res.status(500).json({ error: "Error fetching chair products" });
    }
};


module.exports={chair}