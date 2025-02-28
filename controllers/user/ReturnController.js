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



const ReturnRequest=async (req,res)=>{
    try {
        const {id}=req.params
        res.render("ReturnRequst",{id})
    } catch (error) {
        console.error("Error ReturnRequest:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

const ReturnRequestApOrRe=async (req,res)=>{
    try {
        const {id,orderDetails}=req.body
        const order= await Order.findOne({_id:id})
        order.status='ReturnRequst'
        order.ReturnReson=orderDetails
        order.save()
        res.redirect("/user/myorders")
    } catch (error) {
        console.error("Error ReturnRequestApOrRe:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

module.exports={
    ReturnRequest,
    ReturnRequestApOrRe
}