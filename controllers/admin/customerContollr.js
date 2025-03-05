
const User=require('../../models/userSchema')
const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const Order=require("../../models/orderSchema")
const { search } = require('../../app');
const fs=require("fs")
const path=require("path")
const Sharp=require("sharp");
const { constants } = require('perf_hooks');
const Address = require('../../models/addressSchema');
const mongoose = require("mongoose");



const userManagement=async(req,res)=>{
    try {
        if( req.session.admin){
            const userfind = await User.find().sort({_id:-1});
        res.render("userManagement",{userfind})}
        else{
            res.redirect("/user/home")
        }
    } catch (error) {
        console.log("userManagement error", error)
        res.status(500).send("Error in user management");

    }
}

const blockUser=async (req,res)=>{
      try {
            const {id}=req.params
            const user= await User.findById(id)
            user.isBlocked = !user.isBlocked;
            await user.save();
            res.json({success:true})
      } catch (error) {
        console.log(error);
      }
}

const searchUSer = async (req, res) => {
    try {
        const { searchKey } = req.body;
    
        const result = await User.find({
            username: { $regex: searchKey, $options: "i" }
        });
        res.json({ success: true, result });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const ordermanagment = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1; // Get page number from query params (default to 1)
        let limit = 5; // Number of orders per page
        let skip = (page - 1) * limit; // Calculate the number of documents to skip

        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            {
                $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true },
            },
            { $sort: { _id: -1 } }, // Sorting by latest orders first
            { $skip: skip }, // Skip documents for pagination
            { $limit: limit }, // Limit the number of documents per page
        ]);
        let username=''
        if (orders.length > 0 && orders[0].userDetails) {
            const findusername = await Address.findOne({ userId: orders[0]?.userDetails?._id });
            const name = findusername?.address[0]?.name;
            username=name
        }
        
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit); // Calculate total pages
        res.render('ordermanagement', { orders, currentPage: page, totalPages,username});
   
    } catch (error) {
        console.error('Error in order management:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};


const orderupdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        await order.save();

        return res.status(200).json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error in orderupdate:', error);
        return res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};

const userAddress = async (req, res) => {
    try {
        const addressMainId = new mongoose.Types.ObjectId(req.params.id1);

        // Fetch user document with the first address only
        const addressData = await Address.findOne(
            { userId: addressMainId },
            { "address": { $slice: 1 } } // Retrieve only the first address
        );


        if (!addressData || !addressData.address.length) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const address = addressData.address[0]; // Take the first address

        res.render("userAddresspage", { address });

    } catch (error) {
        console.error("Error fetching user address:", error);
        res.status(500).json({ success: false, message: "Error fetching user address" });
    }
};


const showProduct=async (req,res)=>{
    try {
        const {id}=req.params
        const cancelReason=req.body.cancelReason
         const order=await Order.findById(cancelReason)
         
        const product = await Product.findById(id).populate("category"); ;
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
       
        res.render("showProduct", {product,order});
    } catch (error) {
        console.error("showProduct from admin side", error);
        res.status(500).json({ success: false, message: "showProduct product address" });
    }
}


module.exports={
    userManagement,
    blockUser,
    searchUSer,
    ordermanagment,
    orderupdate,
    userAddress,
    showProduct
}