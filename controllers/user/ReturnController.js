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

const pymentfaield=async (req,res)=>{
    try {
        const { order, error } = req.body;

    if (!order || !order.receipt) {
      return res.status(400).json({ success: false, message: "Invalid order data received." });
    }
        const findorder= await Order.findOne({_id:order.receipt})
        findorder.status="failed"
        findorder.orderExpectedDate=null
        findorder.save()
        res.status(200).json({ success: true, message: "Payment failure recorded.", order: findorder });
    } catch (error) {
        console.error("Error pymentfaield:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

module.exports={
    ReturnRequest,
    ReturnRequestApOrRe,
    pymentfaield
}