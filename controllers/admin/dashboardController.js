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


const dashboard=async (req,res)=>{
    try{
       return await res.render("dashboard")
    }
    catch(error){
        console.log("error form dashboard ",error)
        res.status(500).json({success:true,message:"internal server error"})
    }
}
const postDashboard = async (req, res) => {
    try {
       
        const { filter } = req.body;
       

        let salesData = [];

        if (filter === "yearly") {
            salesData = await Order.aggregate([
                { $group: { _id: { $year: "$createdAt" }, total: { $sum: "$finalAmount" } } },
                { $sort: { _id: 1 } }
            ]);
        } else if (filter === "monthly") {
            const currentYear = new Date().getFullYear();
            salesData = await Order.aggregate([
                { $match: { createdAt: { $gte: new Date(`${currentYear}-01-01`), $lt: new Date(`${currentYear + 1}-01-01`) } } },
                { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$finalAmount" } } },
                { $sort: { _id: 1 } }
            ]);

            // Convert numeric months to month names
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            salesData = salesData.map(s => ({
                _id: monthNames[s._id - 1], // Convert 1-based month to name
                total: s.total
            }));
        } else if (filter === "weekly") {
            salesData = await Order.aggregate([
                { $match: { createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 28)) } } },
                { $group: { _id: { $week: "$createdAt" }, total: { $sum: "$finalAmount" } } },
                { $sort: { _id: 1 } }
            ]);
        }

        res.json({
            labels: salesData.map(s => s._id.toString()),
            data: salesData.map(s => s.total)
        });

    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
const getBestSellingData = async (req, res) => {
    try {
       
    
        // Best-selling products
        const bestSellingProducts = await Order.aggregate([
            { $unwind: "$orderedItems" }, 
            {
                $group: { 
                    _id: "$orderedItems.product", 
                    totalSales: { $sum: "$orderedItems.quantity" } 
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",  // Name of the Product collection in MongoDB
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" }, // Convert array to object
            {
                $project: {
                    _id: 1,
                    totalSales: 1,
                    productName: "$productDetails.productName"  // Extract the product name
                }
            }
        ]);
        
        // Best-selling categories
        const bestSellingCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories", // Lookup category details
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            { 
                $group: { 
                    _id: "$productDetails.category", 
                    name: { $first: "$categoryDetails.name" }, // Fetch category name
                    totalSales: { $sum: "$orderedItems.quantity" } 
                } 
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);
        
     

        // Best-selling brands
        const bestSellingBrands = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",  // Fix incorrect field name
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { 
                $group: { 
                    _id: "$productDetails.brand", 
                    totalSales: { $sum: "$orderedItems.quantity" } 
                } 
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

       

        res.json({
            bestSellingProducts: {
                labels: bestSellingProducts.map(p => p.productName || "Unknown"),
                data: bestSellingProducts.map(p => p.totalSales)
            },
            bestSellingCategories: {
                labels: bestSellingCategories.map(c => c.name || "Unknown"), // Use category name instead of ID
                data: bestSellingCategories.map(c => c.totalSales)
            },
            bestSellingBrands: {
                labels: bestSellingBrands.map(b => b._id?.toString() || "Unknown"),
                data: bestSellingBrands.map(b => b.totalSales)
            }
        });
        

    } catch (err) {
        console.error("Error fetching best-selling data:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};



module.exports={
    dashboard,
    postDashboard,
    getBestSellingData
}