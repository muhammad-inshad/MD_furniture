const { render } = require('../../app');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const user = require('../../models/userSchema');
const Address=require('../../models/addressSchema');
const { session } = require('passport');
const bcrypt = require("bcrypt")
const Cart=require("../../models/cartSchema")
const Order=require("../../models/orderSchema")

const chair=async(req,res)=>{
    try {
        const findProduct= await Product.find({isDeleted:false}).populate({
            path: 'category', 
            match: { status: 'active' },
            match:{isDeleted:false}
        });
         
        const isLogin = req.session.user? true:false
        const chairProducts = findProduct.filter(product => product?.category?.name === "chair");
        if(chairProducts.length>0){
        res.render("chair",{findProduct:chairProducts,isLogin})
        }
    } catch (error) {
        res.json({ "error": "form chair get error" });
           console.log("form chair get error",error)
    }
}

const showDetailProduct=async(req,res)=>{
     const {id}=req.params
     if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send("Invalid product ID.");
      }
     try {
        const findProduct= await Product.findById(id).populate("category")
        const isLogin = req.session.user? true:false
            res.render("showDetailProduct",{findProduct,isLogin})
     } catch (error) {
        console.error(error);
        res.status(500).send("Server error.");
     }
    
}


const sofa=async (req,res)=>{
    try {
        const findProduct= await Product.find({isDeleted:false}).populate({
            path: 'category', 
            match: { status: 'active' },
            match:{isDeleted:false}
        });
        const isLogin = req.session.user? true:false

        const sofaProducts = findProduct.filter(product => product?.category?.name === "sofa");
        res.render("sofa",{findProduct:sofaProducts,isLogin})
        
    } catch (error) {
        res.json({ "error": "form chair get error" });
           console.log("form chair get error",error)
    }
}

const shop=async (req,res)=>{
    try {
        let page = parseInt(req.query.page) || 1; 
        let limit = 8; 
        let skip = (page - 1) * limit;
        let totalProducts = await Product.countDocuments(); 
        let totalPages = Math.ceil(totalProducts / limit); 
        let findProduct = await Product.find()
        .skip(skip)
        .limit(limit);
        res.render('shop', { 
            findProduct, 
            currentPage: page, 
            totalPages 
        });
        
    } catch (error) {
        res.json({ "error": "form chair get error" });
           console.log("form chair get error",error)
    }
}

const profile=async (req,res)=>{
    try {
        const id= req.session.user.id
        if(id){

        
        const findUser=await user.findById(id)
        const userAddresses = await Address.findOne({userId: id });
        const addresses = userAddresses ? userAddresses.address : [];
        return res.render("userProfile",{findUser,addresses,isLogin:true})
        }
    } catch (error) {
        res.render("pageNotFound")
        console.log("form  profile get error---------------",error)
    }
}

const address=async (req,res)=>{
    try {
        
        const id= req.session.user.id
        if(id){
        const findUser=await user.findById(id)
        const userAddresses = await Address.findOne({userId: id });
        const addresses = userAddresses ? userAddresses.address : [];
        return res.render("addres",{findUser,addresses,isLogin:true})}
    } catch (error) {
        res.render("pageNotFound")
        console.log("form  address get error---------------",error)
    }
}

const add_address=async (req,res)=>{
    try{
        const id=req.session.user.id
        const findUser=await user.findById(id)
        return res.render("add_address",{findUser})
    }
    catch (error) {
        res.render("pageNotFound")
        console.log("form  add_address get error---------------",error)
    }
}



const post_add_address = async (req, res) => {
    try {

        // Extract user ID and address data from the request
        const userId = req.session.user.id;
        const { name, city, landmark, state, pincode, phone } = req.body;
        const newAddress = {
            addressType: "Home", // You can change this based on the context
            name: name,
            City: city, // Make sure to match schema field name exactly ("City")
            landMark: landmark,
            state: state,
            pincode: pincode,
            phone: phone,
        };

        // Find the user document and add the new address
        const userAddress = await Address.findOne({ userId });

        if (userAddress) {
            // If the user already has an address array, push the new address to it
            userAddress.address.push(newAddress);
            await userAddress.save();
        } else {
            // If the user doesn't have any addresses, create a new Address document
            const newAddressDoc = new Address({
                userId,
                address: [newAddress], // Wrap the new address in an array
            });
            await newAddressDoc.save();

        }

        // Send a success response
        return res.status(200).json({ success: true, message: 'Address added successfully' });

    } catch (error) {
        // Handle errors gracefully
        console.error("Error in post_add_address:", error);
        return res.status(500).json({ success: false, message: 'An error occurred while adding the address' });
    }
};
const editeprofile=async (req,res)=>{
      try {
        const id=req.session.user.id
        const findUser=await user.findById(id)
       return res.render("editProfile",{findUser});
      } catch (error) {
        res.render("pageNotFound")
        console.log("form  editeprofile get error---------------",error)
      }
}

const edit_address = async (req, res) => {
    try {
      const userId = req.session.user?.id; 
      const addressId = req.params.id; 
  
      if (userId) {
        const userAddress = await Address.findOne({ userId });
  
        if (!userAddress) {
          return res.status(404).render("pageNotFound");
        }
  
        const address = userAddress.address.find(addr => addr._id.toString() === addressId);
  
        if (!address) {
          return res.status(404).render("pageNotFound");
        }
        res.render("edit_address", { address, addressId });
      } else {
        res.redirect("/user/home");
      }
    } catch (error) {
      res.render("pageNotFound");
      console.log("Error in edit_address handler:", error);
    }
  };
  
  const postedit_address = async (req, res) => {
    try {
      const { name,City, addressType, landmark, state, pincode, phone, addressId } = req.body;
      const userId = req.session.user.id;
  
      
      if (!City || !addressType) {
        return res.status(400).json({ success: false, message: "City and addressType are required." });
      }
  
      // Find the user and their addresses
      const userAddress = await Address.findOne({ userId });
      if (!userAddress) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      const addressIndex = userAddress.address.findIndex(addr => addr._id.toString() === addressId);
      if (addressIndex === -1) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }
  
      userAddress.address[addressIndex] = {
        ...userAddress.address[addressIndex], // Retain existing values
        name,
        City,
        addressType,
        landMark: landmark,
        state,
        pincode,
        phone,
      };
  
      // Save the updated address
      await userAddress.save();
      res.json({ success: true, message: "Address updated successfully" });
    } catch (error) {
      console.log("Error in postedit_address handler:", error);
      res.status(500).json({ success: false, message: "An error occurred while updating the address" });
    }
  };
  
  



const PostEditeprofile=async(req,res)=>{
    const userId= req.params.id
    const { username, email, phone, password } = req.body;
    
  try {
    if (!username || !email || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    const updatedUser = await user.findByIdAndUpdate(
        userId,{$set:{
            username, // Update username
            email,    // Update email
            phone,    // Update phone
            password: hashedPassword || undefined, 
        }},
         { new: true, omitUndefined: true  })
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found.' });
          }
         return res.status(200).json({ success: true, message: 'Profile updated successfully.', updatedUser });
}
catch(error){
    res.render("pageNotFound")
    console.log("form  postediteprofile get error---------------",error)
}
}
const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params; 
        const userId = req.session.user.id; 

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.json({ success: false, message: 'User addresses not found.' });
        }

        const addressIndex = userAddress.address.findIndex(
            (addr) => addr._id.toString() === id
        );
        if (addressIndex === -1) {
            return res.json({ success: false, message: 'Address not found.' });
        }
        userAddress.address.splice(addressIndex, 1);

        await userAddress.save();

        return res.json({ success: true, message: 'Address deleted successfully.' });
    } catch (error) {
        console.error("Error in deleteAddress:", error);
        res.status(500).render("pageNotFound");
    }
};

const cart = async (req, res) => {
    try {
        const id = req.body.productId;
        const userId = req.session.user.id; 
        if(!userId) {
            return res.redirect('/user/login');
        }
        const trimmedId = id.trim(); // Ensure ID is properly trimmed
        const product = await Product.findById(trimmedId); // Find the product

        if (!product) {
            console.log("Product not found");
            return res.status(404).render("pageNotFound");
        }

        if(product.quantity<1){
            return res.redirect("/user/shop")
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
            // If the product exists, update the quantity and total price
            existingItem.quantity += 1;
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
        res.status(500).render("pageNotFound");
    }
};



const getCartData = async(req,res) => {
    const userId = req?.session?.user?.id;
      const isLogin = req.session.user? true:false
    if(!userId) {
        return res.redirect('/user/login');
    }

    const cart = await Cart.find({userId})
    if(!cart) {
        const newCart = await Cart.create({
            userId,
            items:[],
        })
       
        return res.render('cart', { cartData: newCart });

    }

    const userCart = await Cart.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $unwind: '$items' },
        { $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'productDetails'
        }},
        { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } }  // Unwind the productDetails array if there is only one product
    ]);
  
    const subtotal = userCart.reduce((sum, item) => {
        return sum + item.items.quantity * item.productDetails.salePrice;
    }, 0);
    
    const tax = 0.1 * subtotal; 
    const total = subtotal + tax;

    res.render('cart', { cartData: userCart ,subtotal,total,isLogin});
  
    }

    
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
                // Decrement quantity
                if (existingItem.quantity > 1) {
                    existingItem.quantity -= 1;
                } else {
                    // Remove item if quantity reaches 0
                    userCart.items = userCart.items.filter(
                        (item) => !item.productId.equals(productId)
                    );
                }
            }
    
            // Update total price for the item
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
    

    
    const checkout = async (req, res) => {
        try {
            const userId = req.session.user.id;
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid User ID');
            }
    
            const findAddress = await Address.findOne({ userId });
            if (!findAddress) {
                console.log('No address found for the given userId');
                return res.render("checkout", { isLogin: true, address: null, detailedCart: null });
            }
    
            const address = findAddress.address;
    
            let detailedCart = null;  // Ensure detailedCart is initialized
    
            const findproduct = await Cart.findOne({ userId });
            if (findproduct && findproduct.items.length > 0) {
                // Only perform the aggregation if the cart has items
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
    
            let subtotal = 0;
            let total = 0;
    
            if (detailedCart && detailedCart.length > 0) {
                subtotal = detailedCart[0].items.reduce((sum, item) => {
                    const price = item.product.salePrice || item.product.price;
                    return sum + price * item.quantity;
                }, 0);
                const tax = 0.1 * subtotal;
                total = subtotal + tax;
            }
    
            const isLogin = req.session.user ? true : false;
            return res.render("checkout", { isLogin, address, detailedCart, subtotal, total });
    
        } catch (error) {
            console.error("Error in checkout:", error);
            res.status(500).render("pageNotFound");
        }
    };
    
    
     
    const postCkeckout = async (req, res) => {
        try {
            
            if (!req.session || !req.session.user) {
                return res.status(401).send("User not logged in");
            }
    
            const { paymentMethod } = req.body;
           
            const userWantAddress=req.body.address
           
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
            const total = subtotal + tax;
    
            const findAddress = await Address.findOne({ userId,  });
            if (!findAddress) {
                return res.status(404).send("No address found for the user.");
            }

            const newOrder = new Order({
                orderedItems: detailedCart.items.map((item) => ({
                    product: item.product._id,
                    quantity: item.quantity,
                    price: item.product.salePrice || item.product.price,
                })),
                totalPrice: subtotal,
                finalAmount: total,
                address: findAddress._id,
                invoiceDate: new Date(),
                status: "pending",
                couponApplied: false,
                userId: userId,
            });
    
            for (const item of newOrder.orderedItems) {
                const productId = item.product;
                const quantity = item.quantity;
                const currentProduct = await Product.findById(productId);
               let op=  await Product.findByIdAndUpdate(productId)
               op.salesCount=quantity  
                 await op.save()
    
                if (quantity > currentProduct.quantity || currentProduct.quantity === 0) {
                    return res.status(400).send("One or more items are out of stock.");
                }
    
                currentProduct.quantity -= quantity;
                await currentProduct.save();
            }
    
            await newOrder.save();
    
            const orderDate = newOrder.invoiceDate;
            const expectedDate = new Date(orderDate);
            expectedDate.setDate(expectedDate.getDate() + 5);
            const formattedExpectedDate = expectedDate.toDateString();
    
            newOrder.orderExpectedDate = formattedExpectedDate;
            newOrder.paymentType = paymentMethod;
            newOrder.address=userWantAddress;
            await newOrder.save();
    
            await Cart.deleteOne({ userId });
    
            res.render("placeOrder", { paymentMethod, formattedExpectedDate });
        } catch (error) {
            console.error("Error in postCheckout:", error);
            res.status(500).render("pageNotFound");
        }
    };
    


    const myorders = async (req, res) => {
        try {
            let userId=req.session.user.id; 
            if(userId){
            const userObjectId = new mongoose.Types.ObjectId(userId)
            const orders = await Order.aggregate([
                {
                    $match: { 
                       userId : userObjectId // Match orders belonging to the logged-in user
                    }
                },
                {
                    $unwind: "$orderedItems"  // Unwind orderedItems to separate each item
                },
                {
                    $lookup: { 
                        from: "products",  // The collection name in MongoDB (make sure this is correct)
                        localField: "orderedItems.product",  // Field from Order model (product ID)
                        foreignField: "_id",  // Field from Products collection (Product ID)
                        as: "productDetails"  // The field to store the lookup result
                    }
                },
            ]);
            res.render("myorders", { orders ,isLogin:true});}
        } catch (error) {
            res.status(500).send("Error fetching orders");
        }
    };
    
    const orderCancel=async (req,res)=>{
           try {
            const id=req.params.id
           
            res.render("orderCancel",{id});
           } catch (error) {
            res.status(500).send("Error fetching orderCancel");
           }
    }
    
    const postorderCancel=async (req,res)=>{
        try {
           
            const id=req.body.id
            const {orderDetails}=req.body
            const order=await Order.findById(id)
            order.status="Cancelled"
            order.cancelReson=orderDetails
            await order.save();
            return res.redirect("/user/myorders")
        } catch (error) {
            res.status(500).send("Error fetching post orderCancel");
        }
    }

    const rating=async (req,res)=>{
      try {
         const {rating ,orderId}=req.body
        const product=await Product.findById(orderId)
         product.rating=rating
         await product.save();

         return res.json({success:true});
      } catch (error) {
        res.status(500).send("Error rating");
      }
    }

module.exports={
    chair,
    showDetailProduct,
    sofa,
    shop,
    profile,
    address,
    add_address,
    post_add_address,
    editeprofile,
    PostEditeprofile,
    deleteAddress,
    cart,
    getCartData,
    remove,
    incORdec,
    checkout,
    postCkeckout,
    myorders,
    orderCancel,
    postorderCancel,
    rating,
    edit_address,
    postedit_address,
   
}