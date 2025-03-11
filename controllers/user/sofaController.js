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



const showDetailProduct = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send("Invalid product ID.");
    }

    try {
        const findProduct = await Product.aggregate([
            { 
                $match: { 
                    _id: new mongoose.Types.ObjectId(id) 
                } 
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: "_id",
                    as: 'categoryDetails'
                }
            },
            {
                $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true }
            }
        ]);

        if (findProduct.length === 0 || findProduct[0].isDeleted) {
            return res.redirect("/user/shop"); // Redirect if product is not found or deleted
        }

        const categoryId = findProduct[0].category; // Get the category ID of the current product
        
        // Fetch related products from the same category (excluding the current product)
        const relatedProducts = await Product.find({
            category: categoryId,
            _id: { $ne: id },  // Exclude the currently viewed product
            isDeleted: false   // Ensure only active products are fetched
        }).limit(4); // Limit the number of related products displayed

        const isLogin = req.session.user ? true : false;
        
        res.render("showDetailProduct", { 
            findProduct: findProduct[0], 
            relatedProducts, 
            isLogin 
        });

    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).send("Server error.");
    }
};




const sofa = async (req, res) => {
    try {
        const findProduct = await Product.find({ isDeleted: false }).populate({
            path: 'category',
            match: { status: 'active', isDeleted: false }
        });

        let userId = null;
        let isLogin = false;
        let cartCount = 0;
        let countWishlist = 0;
        let wishlistProductIds = []; 

        if (req.session && req.session.user) {
            userId = req.session.user.id;
            isLogin = true;

            // Get Cart Count
            const userCart = await Cart.findOne({ userId });
            cartCount = userCart ? userCart.items.length : 0;

            // Get Wishlist Products
            const wishlist = await Wishlist.findOne({ userId });

            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString()); 
            }
        }

        // Filter products for "sofa" category
        const sofaProducts = findProduct.filter(product => product?.category?.name === "sofa");

        // Render the page with wishlistProductIds
        res.render("sofa", {
            findProduct: sofaProducts,
            isLogin,
            cartCount,
            countWishlist,
            wishlistProductIds
        });

    } catch (error) {
        console.error("Error fetching sofa products:", error);
        res.status(500).json({ error: "Error fetching sofa products" });
    }
};


const shop = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = 8;
        let skip = (page - 1) * limit;

        let totalProducts = await Product.countDocuments();
        let totalPages = Math.ceil(totalProducts / limit);

        let findProduct = await Product.find()
            .skip(skip)
            .limit(limit);

        let userId = null;
        let isLogin = false;
        let countWishlist = 0;
        let cartCount = 0;
        let wishlistProductIds = [];

        // Check if user is logged in
        if (req.session && req.session.user) {
            userId = req.session.user.id;
            isLogin = true;

            // Fetch Cart Count
            const userCart = await Cart.findOne({ userId });
            cartCount = userCart ? userCart.items.length : 0;

            // Fetch Wishlist Items
            const wishlist = await Wishlist.findOne({ userId });

            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }

        res.render("shop", {
            findProduct,
            currentPage: page,
            totalPages,
            isLogin,
            cartCount,
            countWishlist,
            wishlistProductIds
        });

    } catch (error) {
        console.error("Error fetching shop products:", error);
        res.status(500).json({ error: "Error fetching shop products" });
    }
};


const rating = async (req, res) => {
    try {
        const { rating, orderId } = req.body
        const product = await Product.findById(orderId)
        product.rating = rating
        await product.save();

        return res.json({ success: true });
    } catch (error) {
        res.status(500).send("Error rating");
    }
}

const applycoupon = async (req, res) => {
    try {
        const { coupon, totalPrice } = req.body;

        if (req.session.coupon) {
            delete req.session.coupon;
            return res.json({ message: "Coupon removed successfully", couponRemoved: true, finalPrice:req.session.cartTotal});
        }

        if (!coupon) {
            return res.status(400).json({ message: "Coupon code is required" });
        }

        const foundCoupon = await Coupon.findOne({ name: coupon });
        if (!foundCoupon) {
            return res.status(400).json({ message: "Invalid coupon code" });
        }

        if (new Date() > new Date(foundCoupon.expiredOn)) {
            return res.status(400).json({ message: "Coupon has expired" });
        }

        if (foundCoupon.usageLimit <= 0) {
            return res.status(400).json({ message: "Coupon has been fully used" });
        }

        if (totalPrice < foundCoupon.minPurchase) {
            return res.status(400).json({ message: `Minimum purchase of ${foundCoupon.minPurchase} is required to apply this coupon` });
        }

        let discountAmount = 0;

        if (foundCoupon.discountType === "percentage") {
            discountAmount = (totalPrice * foundCoupon.discountValue) / 100;

            if (foundCoupon.maxDiscount && discountAmount > foundCoupon.maxDiscount) {
                discountAmount = foundCoupon.maxDiscount;
            }
        } else if (foundCoupon.discountType === "fixed") {
            discountAmount = foundCoupon.discountValue;
        }

        foundCoupon.usageLimit -= 1;
        await foundCoupon.save();

        req.session.coupon = {
            name: foundCoupon.name,
            discountValue: discountAmount,
        };
        res.json({
            message: "Coupon applied successfully!",
            discountAmount,
            finalPrice: totalPrice - discountAmount,
            couponRemoved: false,
        });
    } catch (error) {
        console.error("Error in applyCoupon:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



module.exports = {
    showDetailProduct,
    sofa,
    shop,
    rating,
    applycoupon,
}