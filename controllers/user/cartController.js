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




const cart = async (req, res) => {
    try {
        const id = req.body.productId;
        const userId = req.session.user.id;
        if (!userId) {
            return res.redirect('/user/login');
        }
        const trimmedId = id.trim(); // Ensure ID is properly trimmed
        const product = await Product.findById(trimmedId); // Find the product

        if (!product) {
            console.log("Product not found");
            return res.status(404).render("pageNotFound");
        }
        if (product.quantity < 1) {
            return res.redirect("/user/shop?error=outOfStock");
        }


        // Check if a cart already exists for the user
        let userCart = await Cart.findOne({ userId });

        if (!userCart) {
            // If no cart exists, create a new one
            userCart = new Cart({
                userId,
                items: [],
            });
        }

        // Check if the product is already in the cart
        const existingItem = userCart.items.find((item) =>
            item.productId.equals(trimmedId)
        );


        if (existingItem) {
            
            existingItem.quantity += 1;
            if (existingItem.quantity > 5) {
                return res.json({ success: false, message: "You cannot add more than 5 items of this product." });
            }
            
            existingItem.totalPrice = existingItem.quantity * product.salePrice;
        } else {
            // If the product does not exist, add it to the cart
            userCart.items.push({
                productId: product._id,
                quantity: 1,
                price: product.salePrice,
                totalPrice: product.salePrice,
            });
        }

        // Save the cart
        await userCart.save();

        // Render the cart page with updated data
        res.redirect("/user/cart");
    } catch (error) {
        console.error("Error in cart:", error);
        return res.redirect("/user/login?error=loginRequired");
    }
};
const getCartData = async (req, res) => {
    const userId = req?.session?.user?.id;
    const isLogin = req.session.user ? true : false;

    if (!userId) {
        return res.redirect('/user/login');
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        return res.render('cart', { cartData: [], subtotal: 0, total: 0, isLogin, discountAmount: 0, couponRemoved: false, couponName: '' });
    }

    const userCart = await Cart.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } }
    ]);

    const subtotal = userCart.reduce((sum, item) => {
        return sum + item.items.quantity * item.productDetails.salePrice;
    }, 0);

    const tax = 0.1 * subtotal;
    let discountAmount = 0;
    let couponRemoved = false;
    let couponName = '';

    if (req.session.coupon) {
        discountAmount = req.session.coupon.discountValue;
        couponRemoved = true;
        couponName = req.session.coupon.name;
    }
  

    const total = subtotal - discountAmount + tax + 100;
    req.session.cartTotal=total
    
    let cartCount=0


    res.render('cart', {
        cartData: userCart,
        subtotal,
        discountAmount,
        total,
        isLogin,
        couponRemoved,
        couponName,
        cartCount,
    });
};






const remove = async (req, res) => {
    try {
        const userId = req.session.user.id; // User ID from the session
        const productId = req.body.productId; // Product ID from the form
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            console.error("Cart not found");
            return res.status(404).send("Cart not found");
        }
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item => !item.productId.equals(productId));
        if (cart.items.length === initialLength) {
            console.error("Product ID not found in the cart");
            return res.status(400).send("Product ID not found in the cart");
        }
        await cart.save();
        res.redirect('/user/cart');
    } catch (error) {
        console.error("Error in cart remove:", error);
        res.status(500).render("pageNotFound");
    }
};

const incORdec = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user.id; // Assuming userId is in the session or request
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const AvailableQuantity = product.quantity;
        let userCart = await Cart.findOne({ userId });

        if (!userCart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const existingItem = userCart.items.find((item) =>
            item.productId.equals(productId)
        );

        if (!existingItem) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }
        if (action == "1" && existingItem.quantity + 1 > AvailableQuantity) {
            return res.status(400).json({
                success: false,
                message: `We only have ${AvailableQuantity} units in stock. Please buy fewer.`
            });
        }
        if (action == "1") {
            // Increment quantity
            existingItem.quantity += 1;
        } else if (action == "-1") {
            if (existingItem.quantity > 1) {
                existingItem.quantity -= 1;
            } else {
                userCart.items = userCart.items.filter(
                    (item) => !item.productId.equals(productId)
                );
            }
        }

        existingItem.totalPrice = existingItem.quantity * product.salePrice;

        // Save updated cart
        await userCart.save();

        // Send updated data to frontend
        res.json({
            success: true,
            newQuantity: existingItem.quantity,
            newTotalPrice: existingItem.totalPrice.toFixed(2),
            salePrice: product.salePrice.toFixed(2),
        });
    } catch (error) {
        console.error("Error in incORdec:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports={
    cart,
    getCartData,
    remove,
    incORdec
}