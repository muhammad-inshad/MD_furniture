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
const Razorpay=require("razorpay")

const checkout = async (req, res) => {
    try {
   
        const userId = req.session.user.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid User ID");
        }

        // Fetch the user's address
        const findAddress = await Address.findOne({ userId });

     
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

     


        // Render the checkout page with calculated values
        return res.render("checkout", {
            isLogin,
            address,
            detailedCart,
            subtotal,
            discountAmount,
            total,
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
        
                const { paymentMethod, total } = req.body;
                const userId = req.session.user.id;
        
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
                const tax = 0.1 * subtotal;
        
                const findAddress = await Address.findOne({ userId });
                if (!findAddress) {
                    return res.status(404).send("No address found for the user.");
                }
        
                let finalAmount = total;
        
                // Apply coupon if available
                if (req.session.coupon) {
                    const coupon = await Coupon.findOne({ name: req.session.coupon.name });
                    if (coupon) {
                        finalAmount -= coupon.discountValue;
                    }
                }
        
                const newOrder = new Order({
                    orderedItems: detailedCart.items.map((item) => ({
                        product: item.product._id,
                        quantity: item.quantity,
                        price: item.product.salePrice || item.product.price,
                    })),
                    totalPrice: subtotal,
                    finalAmount,
                    address: findAddress._id,
                    invoiceDate: new Date(),
                    status: "pending",
                    couponApplied: !!req.session.coupon,
                    userId: userId,
                });
        
                // Check stock before placing order
                for (const item of newOrder.orderedItems) {
                    const currentProduct = await Product.findById(item.product);
                    if (!currentProduct || item.quantity > currentProduct.quantity) {
                        return res.status(400).send("One or more items are out of stock.");
                    }
                    currentProduct.quantity -= item.quantity;
                    currentProduct.salesCount += item.quantity;
                    await currentProduct.save();
                }
        
                // Set expected delivery date
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() + 5);
                newOrder.orderExpectedDate = expectedDate.toDateString();
                newOrder.paymentType = paymentMethod;
        
                // **Handle Payment Methods**
                if (paymentMethod === "onlinePayment") {
                    try {
                        const order = await razorpayInstance.orders.create({
                            amount: parseInt(finalAmount * 100),
                            currency: "INR",
                            receipt: newOrder._id.toString(),
                            notes: { info: "Test payment" },
                        });
                        await newOrder.save();
                        await Cart.deleteOne({ userId });
                        return res.json(order);
                    } catch (err) {
                        console.error("Order Creation Failed:", err);
                        return res.status(500).json({ error: err });
                    }
                } 
                
                else if (paymentMethod === "wallet") {
                    try {
                        let User = await User.findById(userId);
                        if (!User) {
                            return res.status(400).json({ success: false, message: "User not found" });
                        }
        
                        if (User.wallet < finalAmount) {
                            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
                        }
        
                        User.wallet -= finalAmount;
                        await User.save();
                        await newOrder.save();
                        await Cart.deleteOne({ userId });
        
                        return res.status(200).json({ success: true, message: "Payment successful" });
                    } catch (error) {
                        console.error("Error processing wallet payment:", error);
                        return res.status(500).json({ success: false, message: "Server error" });
                    }
                } 
                
                else {
                    if (finalAmount > 1000) {
                        return res.status(400).json({
                            success: false,
                            message: "You can't buy products worth more than 1000. Please use wallet or online payment.",
                        });
                    }
                    await newOrder.save();
                    await Cart.deleteOne({ userId });
        
                    return res.json({
                        success: true,
                        message: "Order placed successfully",
                        formattedExpectedDate: newOrder.orderExpectedDate,
                    });
                }
        
            } catch (error) {
                console.error("Error in postCheckout:", error);
                res.status(500).render("pageNotFound");
            }
        };
        

const myorders = async (req, res) => {
    try {
        let userId = req.session.user.id;
        if (userId) {
            const userObjectId = new mongoose.Types.ObjectId(userId)
            const orders = await Order.aggregate([
                {
                    $match: {
                        userId: userObjectId // Match orders belonging to the logged-in user
                    }
                },
                {
                    $sort: { createdAt: -1 }  // Sort by most recent orders
                },
                {
                    $unwind: "$orderedItems"  // Unwind orderedItems to separate each item
                },
                {
                    $lookup: {
                        from: "products",  // The collection name in MongoDB
                        localField: "orderedItems.product",  // Field from Order model (product ID)
                        foreignField: "_id",  // Field from Products collection (Product ID)
                        as: "productDetails"  // The field to store the lookup result
                    }
                },
            ]);
      
            res.render("myorders", { orders, isLogin: true });
        }
    } catch (error) {
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

        res.render("orderCancel", { id });
    } catch (error) {
        res.status(500).send("Error fetching orderCancel");
    }
}

const postorderCancel = async (req, res) => {
    try {
        let userId = req.session.user.id;
        const id = req.body.id
        const { orderDetails } = req.body
        const order = await Order.findById(id)
        if(order.paymentType=="onlinePayment"){
        const findUser=await user.findById(userId)
        findUser.wallet = (findUser.wallet || 0) + order.finalAmount;
        await findUser.save()
        }
        order.status = "Cancelled"
        order.cancelReson = orderDetails
        await order.save();
        return res.redirect("/user/myorders")
    } catch (error) {
        res.status(500).send("Error fetching post orderCancel");
    }
}



const Wallet=async (req,res)=>{
    try {
        let userId = req.session.user.id;
        let findUser= await user.findById(userId)
        res.render("wallet",{findUser})
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
    Wallet,
    addmoney,
    verifyPayment
}