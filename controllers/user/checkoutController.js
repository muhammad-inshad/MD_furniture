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
const PDFDocument = require("pdfkit");
const Razorpay=require("razorpay");
const { Cartversion } = require('./cartController');

const checkout = async (req, res) => {
    try {
   
        const userId = req.session.user.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid User ID");
        }

        // Fetch the user's address
        const findAddress = await Address.findOne({ userId });
         
        let couponValue=0
        if(req.session.coupon){
            couponValue=req.session.coupon.discountValue
        }
        if (!findAddress) {
            console.log("No address found for the given userId");
            return res.redirect("/user/add_address");
        }

        const address = findAddress.address;

        // Fetch the user's cart
        let detailedCart = null;
        const findproduct = await Cart.findOne({ userId });

        if (findproduct && findproduct.items.length > 0) {
            // Perform aggregation to get cart details with product information
            detailedCart = await Cart.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: "products",
                        localField: "items.productId",
                        foreignField: "_id",
                        as: "productDetails",
                    },
                },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$_id",
                        userId: { $first: "$userId" },
                        versionKey: { $first: "$versionKey" },
                        items: {
                            $push: {
                                product: "$productDetails",
                                quantity: "$items.quantity",
                            },
                        },
                        
                    },
                },
            ]);
        }

        // Initialize subtotal, tax, and total
        let subtotal = 0;
        let total = 0;
        let discountAmount = 0; // Default discountAmount is 0

        if (detailedCart && detailedCart.length > 0) {
            subtotal = detailedCart[0].items.reduce((sum, item) => {
                const price = item.product.salePrice || item.product.price;
                return sum + price * item.quantity;
            }, 0);

            const tax = 0.1 * subtotal; // 10% tax

            // Apply discount if a coupon is available in session
            if (req.session.coupon) {
                discountAmount = (req.session.coupon.discountValue / 100) * subtotal; // Assuming discountValue is a percentage
                total = subtotal - discountAmount + tax + 100;
            } else {
                total = subtotal + tax +100;
            }
        }

        const isLogin = req.session.user ? true : false;
// pass currentCartVersion for validation

    const cartVersion= detailedCart[0].versionKey
     
        // Render the checkout page with calculated values
        return res.render("checkout", {
            isLogin,
            address,
            detailedCart,
            subtotal,
            discountAmount,
            total,
            cartVersion,
            couponValue,
            deliveryCharge: 100,
        });
    } catch (error) {
        console.error("Error in checkout:", error);
        res.status(500).render("pageNotFound");
    }
};


    // This razorpayInstance will be used to
        // access any resource from razorpay
        const razorpayInstance = new Razorpay({

            // Replace with your key_id
            key_id: 'rzp_test_dDhywmKqhJmLtU',

            // Replace with your key_secret
            key_secret: '9wZDRCYPwn0qXq3ze0GOFEq0'
        });

        const postCkeckout = async (req, res) => {
            try {
                if (!req.session || !req.session.user) {
                    return res.status(401).send("User not logged in");
                }
        
                const { paymentMethod, total, address } = req.body;
                const userId = req.session.user.id;
        
                // Fetch the user's cart
                const findCart = await Cart.aggregate([
                    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                    { $unwind: "$items" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "items.productId",
                            foreignField: "_id",
                            as: "productDetails",
                        },
                    },
                    { $unwind: "$productDetails" },
                    {
                        $group: {
                            _id: "$_id",
                            items: {
                                $push: {
                                    product: "$productDetails",
                                    quantity: "$items.quantity",
                                },
                            },
                        },
                    },
                ]);
        
                if (!findCart || findCart.length === 0) {
                    return res.status(404).send("Cart is empty. Please add items to the cart.");
                }
        
                const detailedCart = findCart[0];
                const subtotal = detailedCart.items.reduce((sum, item) => {
                    const price = item.product.salePrice || item.product.price;
                    return sum + price * item.quantity;
                }, 0);
                const tax = 0.1 * subtotal; // 10% tax on subtotal
        
                const findAddress = await Address.findOne({ userId });
                if (!findAddress) {
                    return res.status(404).send("No address found for the user.");
                }
        
                let discountAmount = 0;
                if (req.session.coupon) {
                    const coupon = await Coupon.findOne({ name: req.session.coupon.name });
                    if (coupon) {
                        discountAmount = coupon.discountValue; // Fixed discount amount
                    }
                }
        
                // Calculate total final amount once, including tax and discount
                const totalFinalAmount = total;
        
                // Array to store all created orders
                const orders = [];
        
                // Process each item as a separate order
                const totalItems = detailedCart.items.length;
                const discountPerItem = totalItems > 0 ? discountAmount / totalItems : 0;
        
                for (const item of detailedCart.items) {
                    const itemPrice = item.product.salePrice || item.product.price;
                    const itemSubtotal = itemPrice * item.quantity;
                    const itemTax = 0.1 * itemSubtotal;
                    const itemFinalAmount = itemSubtotal + itemTax - discountPerItem;
        
                    const newOrder = new Order({
                        orderedItems: [{
                            product: item.product._id,
                            quantity: item.quantity,
                            price: itemPrice,
                        }],
                        totalPrice: itemSubtotal,
                        finalAmount: total,
                        address: address,
                        invoiceDate: new Date(),
                        status: "pending",
                        couponApplied: !!req.session.coupon,
                        userId: userId,
                        paymentType: paymentMethod,
                    });
        
                    // Set expected delivery date
                    const expectedDate = new Date();
                    expectedDate.setDate(expectedDate.getDate() + 5);
                    newOrder.orderExpectedDate = expectedDate.toDateString();
        
                    // Check stock
                    const currentProduct = await Product.findById(item.product._id);
                    if (!currentProduct || item.quantity > currentProduct.quantity) {
                        return res.status(400).send(`Item ${item.product.name} is out of stock.`);
                    }
                    currentProduct.quantity -= item.quantity;
                    currentProduct.salesCount += item.quantity;
                    await currentProduct.save();
        
                    orders.push(newOrder);
                }
                let finalAmount = total;
                // Handle Payment Methods
                if (paymentMethod === "onlinePayment") {
                    try {
                        if (!orders?.length || !finalAmount) {
                            return res.status(400).json({ error: "Invalid order data" });
                        }
                
                        const razorpayOrder = await razorpayInstance.orders.create({
                            amount: Math.round(Number(finalAmount) * 100),
                            currency: "INR",
                            receipt: orders[0]._id.toString(),
                            notes: { info: "Multiple orders payment" },
                        });
                
                        await Promise.all(orders.map(order => order.save()));
                        await Cart.deleteOne({ userId });
                
                        return res.json(razorpayOrder);
                    } catch (err) {
                        console.error("Order Creation Failed:", err);
                        return res.status(500).json({ 
                            error: "Failed to create order",
                            details: err.message 
                        });
                    }
                }
                 else if (paymentMethod === "wallet") {
                    try {
                        let User = await user.findById(userId); // Assuming 'user' is your User model
                        if (!User) {
                            return res.status(400).json({ success: false, message: "User not found" });
                        }
        
                        if (User.wallet < total) {
                            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
                        }
                        User.Purchase = (Number(User.Purchase) || 0) + Number(total);

                        User.wallet -= total;
                        await User.save();
                        await Promise.all(orders.map(order => order.save()));
                        await Cart.deleteOne({ userId });
        
                        return res.status(200).json({ success: true, message: "Payment successful" });
                    } catch (error) {
                        console.error("Error processing wallet payment:", error);
                        return res.status(500).json({ success: false, message: "Server error" });
                    }
                } else { // Cash on Delivery (COD)
                    if (totalFinalAmount > 1000) {
                        return res.status(400).json({
                            success: false,
                            message: "You can't buy products worth more than 1000 with COD. Please use wallet or online payment.",
                        });
                    }
        
                    await Promise.all(orders.map(order => order.save()));
                    await Cart.deleteOne({ userId });
        
                    return res.json({
                        success: true,
                        message: "Orders placed successfully",
                        formattedExpectedDate: orders[0].orderExpectedDate,
                    });
                }
        
            } catch (error) {
                console.error("Error in postCheckout:", error);
                res.status(500).render("pageNotFound");
            }
        };
        
        const buyagain = async (req, res) => {
            try {
                // Validate user session
                if (!req.session.user) {
                    return res.redirect("/user/login");
                }
        const {orderId}=req.params
       
                const userId = req.session.user.id;
                if (!mongoose.Types.ObjectId.isValid(userId)) {
                    throw new Error("Invalid User ID");
                }
        
                // Check if address exists
                const findAddress = await Address.findOne({ userId });
                if (!findAddress) {
                    console.log("No address found for the given userId");
                    return res.redirect("/user/add_address");
                }
        
                const address = findAddress.address;
        
                // Get product ID from request
                const productId = req.params.productId || req.body.productId;
                if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                    throw new Error("Invalid Product ID");
                }
        
                // Fetch the product
                const product = await Product.findById(productId);
                if (!product) {
                    console.log("Product not found with ID:", productId);
                    throw new Error("Product not found");
                }
        
                // Constants for tax and shipping
                const TAX_RATE = 0.1;
                const SHIPPING_FEE = 100;
        
                // Prepare cart details
                const detailedCart = [{
                    _id: new mongoose.Types.ObjectId(),
                    userId: userId, // No need to wrap in ObjectId again
                    cartVersion: Date.now().toString(), // Rename from `versionKey`
                    items: [{
                        product,
                        quantity: 1
                    }]
                }];
        
                // Calculate pricing
                let subtotal = product.salePrice || product.price;
                const tax = TAX_RATE * subtotal;
                let discountAmount = 0;
                let total = subtotal + tax + SHIPPING_FEE;
        
                // Apply discount if a coupon is in session
                if (req.session.coupon) {
                    discountAmount = (req.session.coupon.discountValue / 100) * subtotal;
                    total -= discountAmount;
                }
        
                // Render checkout page
                return res.render("buyagaincheckout", {
                    isLogin: true,
                    address,
                    detailedCart,
                    subtotal,
                    discountAmount,
                    total,
                    orderId,
                    cartVersion: 1
                });
        
            } catch (error) {
                console.error("Error in buyagain:", error);
                res.status(500).render("pageNotFound");
            }
        };
        
 const buyagaincheckout = async (req, res) => {
            try {
                if (!req.session || !req.session.user) {
                    return res.status(401).send("User not logged in");
                }
        
            
                const { orderId, paymentMethod, total } = req.body; // Accept orderId from frontend
           
                const userId = req.session.user.id;

                // Find existing order
                const order = await Order.findById(orderId);
               
                if (!order) {
                    return res.status(404).send("Order not found");
                }
        
                // Update order payment type and reset status
                order.paymentType = paymentMethod;
                const currentDate = new Date();
order.orderExpectedDate = new Date(currentDate.setDate(currentDate.getDate() + 5));

                let finalAmount = total;
        
                // Handle Payment Methods
                if (paymentMethod === "onlinePayment") {
                    try {
                        const razorpayOrder = await razorpayInstance.orders.create({
                            amount: Math.round(Number(finalAmount) * 100),
                            currency: "INR",
                            receipt: order._id.toString(),
                            notes: { info: "Reattempting payment" },
                        });
                        order.status='paid'
                        await order.save();
                        return res.json(razorpayOrder);
                    } catch (err) {
                        console.error("Online Payment Error:", err);
                        return res.status(500).json({ error: err });
                    }
                } 
        
                else if (paymentMethod === "wallet") {
                    try {
                        let User = await user.findById(userId);
                        if (!User) {
                            return res.status(400).json({ success: false, message: "User not found" });
                        }
        
                        if (User.wallet < finalAmount) {
                            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
                        }
        
                        // Deduct from wallet and update order
                        User.Purchase+=finalAmount;
                        User.wallet -= finalAmount;
                        order.status = "paid"; // Update order status
                        await User.save();
                        await order.save();
        
                        return res.status(200).json({ success: true, message: "Payment successful via wallet" });
                    } catch (error) {
                        console.error("Wallet Payment Error:", error);
                        return res.status(500).json({ success: false, message: "Server error" });
                    }
                } 
        
                else {
                    // COD Payment
                    if (finalAmount > 1000) {
                        return res.status(400).json({
                            success: false,
                            message: "COD is not available for orders above 1000. Use wallet or online payment.",
                        });
                    }
        
                    order.status ="pending"; // Update order status for COD
                    await order.save();
        
                    return res.json({
                        success: true,
                        message: "Order placed successfully via COD",
                    });
                }
            } catch (error) {
                console.error("Error in buyagaincheckout:", error);
                res.status(500).render("pageNotFound");
            }
        };
        

      
        
        const myorders = async (req, res) => {
            try {
                const userId = req.session.user?.id || req.user?.id;
                if (!userId) {
                    return res.status(401).send("User not authenticated");
                }
        
                const userObjectId = new mongoose.Types.ObjectId(userId);
        
                const orders = await Order.aggregate([
                    { $match: { userId: userObjectId } },
                    { $sort: { createdAt: -1 } },
                    { $unwind: "$orderedItems" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "orderedItems.product",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    {
                        $lookup: {
                            from: "addresses",
                            localField: "address",
                            foreignField: "address._id", // Match sub-document _id in address array
                            as: "addressDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$addressDetails",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $project: {
                            // Flatten addressDetails to match expected structure
                            "addressDetails": {
                                $arrayElemAt: [
                                    "$addressDetails.address",
                                    { $indexOfArray: ["$addressDetails.address._id", "$address"] }
                                ]
                            },
                            // Include other fields
                            "userId": 1,
                            "orderedItems": 1,
                            "totalPrice": 1,
                            "discount": 1,
                            "finalAmount": 1,
                            "invoiceDate": 1,
                            "status": 1,
                            "couponApplied": 1,
                            "orderId": 1,
                            "orderExpectedDate": 1,
                            "paymentType": 1,
                            "createdAt": 1,
                            "productDetails": 1
                        }
                    }
                ]);
        
             
                res.render("myorders", { orders, isLogin: true });
            } catch (error) {
                console.error("Error fetching orders:", error);
                res.status(500).send("Error fetching orders");
            }
        };
        
    
        
const DownloadPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findOne({ _id: id }).populate("orderedItems.product");
        let userId = req.session.user.id;
        const User = await user.findOne({ _id: userId });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // **Fetch only ordered product details**
        const products = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
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
                $project: {
                    _id: 0,
                    "productDetails.productName": 1,
                    "productDetails.brand": 1,
                    "productDetails.rating": 1,
                    "productDetails.salePrice": 1,
                    "orderedItems.quantity": 1
                }
            }
        ]);


        const doc = new PDFDocument();
        const filename = `invoice-${order.orderId}.pdf`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        // **Company Info**
        doc.fontSize(20).text("MD_FURNITURE", { align: "center" });
        doc.fontSize(10).text("Furniture Street, Punnayuklam, India");
        doc.text("Email: mdfurniture@gmail.com | Phone: +1234567890");
        doc.moveDown();

        // **Invoice Details**
        doc.fontSize(16).text("Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice No: ${order.orderId}`);

        const invoiceDate = order.invoiceDate
            ? new Date(order.invoiceDate).toLocaleDateString("en-GB") // "02/03/2025"
            : new Date().toLocaleDateString("en-GB");

        doc.text(`Invoice Date: ${invoiceDate}`);
        doc.text(`Order Status: ${order.status}`);
        doc.moveDown();

        // **Customer Details**
        doc.fontSize(14).text("Customer Details:");
        doc.fontSize(12).text(`User ID: ${User.username}`);
        doc.fontSize(12).text(`Email: ${User.email}`);
        doc.fontSize(12).text(`Phone: ${User.phone}`);
        doc.moveDown();

        // **Order Items Table**
        doc.fontSize(14).text("Ordered Items:");
        products.forEach((item) => {
            doc.fontSize(12).text(`Product: ${item.productDetails.productName || "N/A"}`);
            doc.text(`Brand: ${item.productDetails.brand || "N/A"}`);
            doc.text(`Rating: ${item.productDetails.rating || "N/A"}`);
            doc.text(`Sale Price: $${item.productDetails.salePrice || "N/A"}`);
            doc.text(`Quantity: ${item.orderedItems.quantity}`);
            doc.moveDown();
        });

        // **Price Details**
        doc.fontSize(14).text("Price Summary:");
        doc.fontSize(12).text(`Total Price: $${order.totalPrice}`);
        doc.text(`Final Amount: $${order.finalAmount}`);
        doc.moveDown();

        // **Payment Details**
        doc.fontSize(14).text("Payment Information:");
        doc.fontSize(12).text(`Payment Type: ${order.paymentType || "N/A"}`);
        doc.text(`Coupon Applied: ${order.couponApplied === true ? "Yes" : "No"}`);
        doc.moveDown();

        // **Footer Note**
        doc.text("Thank you for shopping with us!", { align: "center" });

        doc.end();
    
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generating invoice" });
    }
};


const orderCancel = async (req, res) => {
    try {
        const id = req.params.id
        const {qty,pid}=req.params
        res.render("orderCancel", { id,qty,pid});
    } catch (error) {
        res.status(500).send("Error fetching orderCancel");
    }
}

const postorderCancel = async (req, res) => {
    try {
        let userId = req.session.user.id;
        const id = req.body.id;
        const { qty, pid, orderDetails } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).send("Order not found");
        }
        if (order.paymentType === "wallet") {
            const findUser = await user.findById(userId);
            if (findUser) {
                findUser.wallet = (findUser.wallet || 0) + order.finalAmount;
                findUser.RefundforCancelledOrder+=order.finalAmount
                await findUser.save();
            }
        }
        if (order.paymentType === "onlinePayment") {
            const findUser = await user.findById(userId);
            if (findUser) {
                findUser.wallet = (findUser.wallet || 0) + order.finalAmount;
                findUser.RefundforCancelledOrder+=order.finalAmount
                await findUser.save();
            }
        }

        order.status = "Cancelled";
        order.cancelReason = orderDetails;  // Fixed typo: 'cancelReson' ➝ 'cancelReason'

        const product = await Product.findById(pid);
        if (product) {
            product.quantity += Number(qty);  // Convert qty to a number before adding
            await product.save();
        }
        

        await order.save();
        return res.redirect("/user/myorders");

    } catch (error) {
        console.error(error);  // Log the error for debugging
        res.status(500).send("Error fetching post orderCancel");
    }
};



const Wallet=async (req,res)=>{
    try {
        let userId = req.session.user.id;
        let findUser= await user.findById(userId)
        res.render("wallet",{findUser,isLogin:true})
    } catch (error) {
        console.error("Error in Wallet:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const addmoney = async (req, res) => {
    try {
        if (!req.session || !req.session.user || !req.session.user.id) {
            return res.status(401).json({ message: "User not logged in" });
        }

        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const paymentDetails = {
            amount: amount * 100, // Convert to paisa
            currency: "INR",
        };

        res.json(paymentDetails);
    } catch (error) {
        console.error("Error in addmoney:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: "User not logged in" });
        }

        // Secure Razorpay secret key from .env

        const secret = process.env.RAZORPAY_SECRET_KEY;
        if (!secret) {
            return res.status(500).json({ message: "Razorpay secret key missing!" });
        }
    
        const userId = req.session.user.id;
        const User = await user.findById(userId);

        if (!User) {
            console.error(" User not found:", userId);
            return res.status(404).json({ message: "User not found" });
        }

      

        User.wallet += amount / 100; // Convert paise to rupees
        await User.save();

        res.json({ success: true, message: "Wallet updated successfully" });

    } catch (error) {
        console.error(" Error in verifyPayment:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports={checkout,
    postCkeckout,
    myorders,
    DownloadPdf,
    postorderCancel,
    orderCancel,
    buyagain,
    Wallet,
    addmoney,
    buyagaincheckout,
    verifyPayment
}