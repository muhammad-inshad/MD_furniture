
const User=require("../../models/userSchema")
const Admin=require("../../models/adminSchema")
const mongoose=require("mongoose")
const bcrypt=require("bcrypt")
const session = require("express-session")
const Coupon=require("../../models/coupnSchema")
const Order=require("../../models/orderSchema")

const login=async(req,res)=>{
    try {
        if(req.session.admin){
            return res.redirect("/admin/dashboard")
        }
        return await res.render('adminLogin')
    } catch (error) {
        console.log("HOME NOT FOUNT")
        res.status(500).sent("srver error")
    }
}
const loginpost = async (req, res) => {
    try {
        const { username, password } = req.body;
        

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        req.session.admin = {
            id: admin._id,
            username: admin.username,
        };
        return res.json({ success: true, message: "Admin successfully logged in" });
    } catch (error) {
        console.error("Error during admin login:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



const logoutPOst=async(req,res)=>{
    try {
        req.session.destroy((error)=>{
            if (error) {
            return res.redirect("/admin/dashboard")
            }
              res.redirect("/admin/login")
        })
        
    } catch (error) {
        console.log("error from logout ",error)
    }
}
const coupenMenagement=async (req,res)=>{
    try {
        const coupon= await Coupon.find()
        res.render("CouponManagemen",{coupon})
    } catch (error) {
        console.log("coupenMenagement get",error)
    }
}

const addcoupon=async (req,res)=>{
    try {
        res.render("addcoupon")
    } catch (error) {
        console.log("addcoupon get",error)
    }
}

const addcouponPost = async (req, res) => {
    try {
        const { name, discountType, discountValue, minPurchase, maxDiscount, usageLimit, expiryDate } = req.body;

        // Check if the coupon already exists
        const existingCoupon = await Coupon.findOne({ name });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon already exists" });
        }

        // Create a new coupon instance
        const newCoupon = new Coupon({
            name,
            discountType,
            discountValue,  // Matches the schema
            minPurchase,     // Matches the schema
            maxDiscount: maxDiscount || null, // Optional field
            usageLimit,
            expiredOn: new Date(expiryDate),
        });

        // Save the coupon to the database
        await newCoupon.save();

        res.status(201).json({ message: "Coupon created successfully", coupon: newCoupon });
    } catch (error) {
        console.error("Error in addcouponPost:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const deletecoupon=async (req,res)=>{
    try {
        const { id } = req.params;
        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const SalesReport=async (req,res)=>{
    try {
        res.render("SalesReport")
    } catch (error) {
        console.error("Error deleting SalesReport:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


const ShowTheSalesReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required." });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Ensure the full day is included


        const report = await Order.find({
            createdAt: { $gte: start, $lte: end }
        });


        const salesCount = report.length;
        const totalOrderAmount = report.reduce((sum, sale) => sum + (sale.finalAmount|| 0), 0);
        const totalDiscount = report.reduce((sum, sale) => sum + (sale.discount || 0), 0);

        res.status(200).json({
            salesCount,
            orderAmount: totalOrderAmount,
            discount: totalDiscount
        });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

const ReturnRequest=async(req,res)=>{
    try {
        const returnRequests = await Order.aggregate([
            {
                $match: {
                    status: { $in: ["ReturnRequst", "Rejected", "Returned"] }
                }
            },
            {
                $lookup: {
                    from: "products", // Collection name of Product model
                    localField: "orderedItems.product", // Field in Order model
                    foreignField: "_id", // Field in Product model
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails" // Unwind because lookup returns an array
            },
            {
                $project: {
                    _id: 1,
                    ReturnReson: 1,
                    status: 1,
                    userId: 1,
                    "productDetails.productName": 1 // Fetch only productImages
                }
            },
            {
                $sort: { _id: -1 } // Sorting in descending order (-1)
            }
        ]);
               
        res.render("AdminReturnRequst", { returnRequests });
        
    } catch (error) {
        console.error("Error ReturnRequest:", error);
        res.status(500).json({ message: "Internal server error." });
    }
}

const acceptReturn = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; 
    
    try {
        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
    
        order.status = "Returned"; 
        await order.save(); 
    
        const amount = order.finalAmount;
   
  
        const findUser = await User.findById(userId);
        
        if (!findUser) {
            return res.status(404).json({ message: "User not found" });
        }
       
        findUser.wallet += amount;
     
        await findUser.save();
      
    
        res.json({ success: true });
    } catch (error) {
        console.error("Error acceptReturn:", error);
        res.status(500).json({ message: "Internal server error." });
    }
    
};
  
const rejectReturn=async (req,res)=>{
     try {
        const { id } = req.params;
    
        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = "Rejected";
        await order.save();
        console.log(order)
        res.json({ success: true });
     } catch (error) {
        console.error("Error rejectReturn:", error);
        res.status(500).json({ message: "Internal server error." });
     }
}
  
module.exports={
    login,
    loginpost,
    logoutPOst,
    coupenMenagement,
    addcoupon,
    addcouponPost,
    deletecoupon,
    SalesReport,
    ShowTheSalesReport,
    ReturnRequest,
    acceptReturn,
    rejectReturn
}