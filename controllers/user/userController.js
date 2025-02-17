const User = require("../../models/userSchema")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const { json } = require("express")
const nodemailer = require("nodemailer")
const { session } = require("passport")
const Product = require("../../models/productSchema")
const Cart=require("../../models/cartSchema")
const Wishlist=require("../../models/wishlistSchema")

const login = async (req, res) => {
    try {
        if( req.session.user ){
            return res.redirect("/user/home")
        }
        return res.render('userLogin')
    }
    catch {
        console.log("log in error")
        res.redirect("/user/pageNotFound")
        res.status(500).send("srver error")
    }
}

const loginpost = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }
        const findemail = await User.findOne({ email });
        if (findemail.isBlocked === true) {
            return res.status(400).json({ success: false, message: "this user is blocked" })
        }
        if (!findemail) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        const isPasswordValid = await bcrypt.compare(password, findemail.password); // Compare plaintext password with hashed password
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        req.session.user = {
            id: findemail._id,
            email: findemail.email,
            isBlocked: findemail.isBlocked
        }
        return res.json({ success: true, message: "Login successful", isLogin: true });


    }
    catch (error) {
        console.error("Error during login process:", error);
        res.status(500).send("Server error");
    }
}
const loadHomepage = async (req, res) => {
    try {
        const isLogin = req.session.user ? true : false;
        let cartCount = 0;
        let countWishlist=0;
        const userId = req?.session?.user?.id;
        if (isLogin) {
            const userCart  =  await Cart.findOne({ userId});
            cartCount = userCart ? userCart.items.length : 0;
            const wishlist = await Wishlist.findOne({ userId })
            countWishlist= wishlist ? wishlist.products.length : 0;
        }
        return res.render('home', { isLogin, cartCount ,countWishlist}); // Pass cartCount to EJS
    } catch (error) {
        console.error("Error loading cart page:", error);
        res.status(500).send("Internal Server Error");
    }
};

const singup = async (req, res) => {
    try {
        if( req.session.user ){
            return res.redirect("/user/home")
        }
        return await res.render('userSingup')
    }
    catch {
        console.log("HOME NOT FOUNT")
        res.status(500).send("srver error")
    }
}


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sentVerificationEmail(email, otp) {
    try {
        const transpoter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transpoter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "veryfy your account",
            text: `your OTP is ${otp}`,
            html: `<b>your OTP is :${otp}</b>`
        })
        return info.accepted.length > 0
    } catch (error) {
        console.log("HOME NOT FOUNT", error)
        return false;
    }

}

const singupPOst = async (req, res) => {

    try {
        const { email, password, Cpassword, username, phone } = req.body
        const Checkit = await User.findOne({ email: email });
        if (Checkit) {
            return res.render('userSingup', { message: "user alredy existed try another one" })

        }

        if (password != Cpassword) {
            return res.render('userSingup', { message: "password not match" })
        }
        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render('userSingup', { message: "it already exist" })
        }
        const otp = generateOtp();
        const emailsent = await sentVerificationEmail(email, otp)

        if (!emailsent) {
            return res.json({ message: 'email-error' })
        }
        req.session.userOtp = otp,
            req.session.userData = { email, password, username, phone }
        res.render("otp")
        console.log("OTP is =", otp)
    }
    catch (error) {
        console.log("signup error", error)
        res.redirect("/user/pageNotFound")
    }
}

const pageNotFound = async (req, res) => {
    try {
        return await res.render('pageNotFound')
    }
    catch {
        console.log("HOME NOT FOUNT")
        res.status(500).send("srver error")
    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    }
    catch {

    }
}

const verifyotp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Received OTP:", otp);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;

            // Check if the email is already registered
            const existingUser = await User.findOne({ email: user.email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "This email is already registered. Please log in or use a different email.",
                });
            }

            // Hash the password
            const passwordHash = await securePassword(user.password);

            // Save new user data
            const saveUserData = new User({
                username: user.username,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            await saveUserData.save();


            req.session.user = saveUserData._id;
            const isLogin = true
            // Save the user ID in the session
            return res.json({ success: true, message: "User registered successfully!", isLogin });

            // res.redirect("/user/home")

        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ success: false, message: "An error occurred. Please try again later." });
    }
}

const resendOTP = async (req, res) => {
    try {
        const { email } = req.session.userData

        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render('userSingup', { message: "it already exist" })
        }
        const otp = generateOtp();
        const emailsent = await sentVerificationEmail(email, otp)

        if (!emailsent) {
            return res.json({ message: 'email-error' })
        }
        req.session.userOtp = otp,
            req.session.userData = { email }
        res.render("otp")
        console.log("resent OTP is =", otp)
    }
    catch (error) {
        console.log("signup error", error)
        res.redirect("/user/pageNotFound")
    }
}

const logout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Unable to log out.');
        }
        else {
            res.redirect("/user/home")
        }
    })
}

const forgetpassword=async (req,res)=>{
    try {
        res.render("forgetpassword")
        
    } catch (error) {
        console.log("forgetpassword error", error)
        res.redirect("/user/pageNotFound")
    }
}

const postforgetpassword = async (req, res) => {
    try {
        const email = req.body.email;
        req.session.email=email
        const userFind = await User.findOne({ email });
        req.session.userData=userFind
        // Check if user is found
        if (!userFind) {
            return res.render("forgetpassword", { message: "User not found" });
        }
        // Generate OTP
        const otp = generateOtp();


        // Send OTP to the user's email
        const emailsent = await sentVerificationEmail(email, otp);

        // Store OTP in session
        req.session.userOtp = otp;

        // If email wasn't sent, return an error
        if (!emailsent) {
            return res.json({ message: 'email-error' });
        }

        console.log("OTP is =", otp);
        
        // Render OTP page
        return res.render("OTPforgotpassword");
    } catch (error) {
        console.log("forgetpassword error", error);
        res.render("forgetpassword", { message: "An error occurred, please try again" });
    }
};

const resendForgotpasswordOTP=async (req,res)=>{

 try {
        const { email } = req.session.userData
        const otp = generateOtp();
        const emailsent = await sentVerificationEmail(email, otp)

        if (!emailsent) {
            return res.json({ message: 'email-error' })
        }
        req.session.userOtp = otp,
            req.session.userData = { email }
        res.render("OTPforgotpassword")
        console.log("resent OTP is =", otp)
    }
    catch (error) {
        console.log("resendForgotpasswordOTP", error)
        res.redirect("/user/pageNotFound")
    }
}

const verifyOtpForgotPassword=async (req,res)=>{
    const {otp}=req.body
    if(req.session.userOtp===otp){
       return res.json({success:true,message:"you can change the password"})
    }
    return res.json({success:false,message:"otp not match"})
}

const changepassword=async (req,res)=>{
    try {
        const email=req.session.email
        const findemail=await User.findOne({email})

        res.render("changepassword")
        
    } catch (error) {
        console.log("resendForgotpasswordOTP", error)
        res.redirect("/user/pageNotFound")
    }
}

const postChangepassword= async (req,res)=>{
    try {
        const email=req.session.email
        const findemail=await User.findOne({email})
        const {password,Cpassword}=req.body
        if(password==Cpassword){
            const email=req.session.email
            const findemail=await User.findOne({email})
            const id=findemail._id

            const hashedPassword = await bcrypt.hash(password, 10); 

            const updatePassword = await User.findByIdAndUpdate(
                id, // Replace this with the actual user's ID
                { $set: { password: hashedPassword } }, // Update the password field
                { new: true } // Optionally return the updated document
            );
            res.redirect("/user/login")
        }
        
    } catch (error) {
        console.log("resendForgotpasswordOTP", error)
        res.redirect("/user/pageNotFound")
    }
}
const PriceLowToHigh = async (req, res) => {
    try {
        const { name } = req.params; // 'name' will be the category name passed from the route
        const isLogin = !!req.session.user;
        const userId = req.session.user ? req.session.user._id : null; // Get userId safely

        let countWishlist = 0;
        let cartCount = 0;
        let wishlistProductIds = [];

        if (userId) {
            // Fetch wishlist data
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }

            // Fetch cart data
            const userCart = await Cart.findOne({ userId });
            cartCount = userCart ? userCart.items.length : 0;
        }

        if (name === "shop") {
            let page = parseInt(req.query.page) || 1; 
            let limit = 8; 
            let skip = (page - 1) * limit;
            let totalProducts = await Product.countDocuments(); 
            let totalPages = Math.ceil(totalProducts / limit); 

            let findProduct = await Product.find()
                .sort({ salePrice: 1 })
                .skip(skip)
                .limit(limit);

            res.render('shop', { 
                findProduct, 
                currentPage: page, 
                totalPages, 
                isLogin, 
                cartCount,  
                countWishlist, 
                wishlistProductIds 
            });
        } else {
            const findPrice = await Product.find().populate({
                path: 'category',
                match: { 
                    status: 'active', 
                    isDeleted: false 
                }
            }).sort({ salePrice: 1 });

            const chairProducts = findPrice.filter(product => product?.category?.name === name);

            res.render(name, { 
                findPrice: chairProducts, 
                isLogin, 
                cartCount,    
                countWishlist,  
                wishlistProductIds 
            });
        }
    } catch (error) {
        console.log("PriceLowToHigh Error:", error);
        res.redirect("/user/pageNotFound");
    }
};





const PriceHighToLow = async (req, res) => {
    try {
        const { name } = req.params;
        const isLogin = !!req.session.user;
        const userId = req.session.user ? req.session.user._id : null; // Ensure userId is defined

        let countWishlist = 0;
        let wishlistProductIds = [];

        // Fetch wishlist count if user is logged in
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }

        if (name === "shop") {
            let page = parseInt(req.query.page) || 1; 
            let limit = 8; 
            let skip = (page - 1) * limit;
            let totalProducts = await Product.countDocuments(); 
            let totalPages = Math.ceil(totalProducts / limit); 

            let findProduct = await Product.find()
                .sort({ salePrice: -1 }) // Sorting from High to Low
                .skip(skip)
                .limit(limit);

            res.render('shop', { 
                findProduct, 
                currentPage: page, 
                totalPages, 
                isLogin, 
                countWishlist,  // ✅ Make sure to pass wishlist count
                wishlistProductIds 
            });
        } else {
            const findPrice = await Product.find().populate({
                path: 'category',
                match: { 
                    status: 'active', 
                    isDeleted: false 
                }
            }).sort({ salePrice: -1 });

            const chairProducts = findPrice.filter(product => product?.category?.name === name);

            res.render(name, { 
                findPrice: chairProducts, 
                isLogin, 
                countWishlist,  // ✅ Ensure wishlist count is passed
                wishlistProductIds 
            });
        }
    } catch (error) {
        console.log("PriceHighToLow Error:", error);
        res.redirect("/user/pageNotFound");
    }
};



const newArivels = async (req, res) => {
    try {
        const { name } = req.params;
        const isLogin = !!req.session.user;
        const userId = req.session.user ? req.session.user._id : null; // Ensure userId is defined

        let countWishlist = 0;
        let wishlistProductIds = [];

        // Fetch wishlist count if user is logged in
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }

        if (name === "shop") {
            let page = parseInt(req.query.page) || 1; 
            let limit = 4; 
            let skip = (page - 1) * limit;
            let totalProducts = await Product.countDocuments(); 
            let totalPages = Math.ceil(totalProducts / limit); 

            let findProduct = await Product.find()
                .sort({ _id: -1 }) // Sorting by newest arrivals
                .skip(skip)
                .limit(limit);

            res.render('shop', { 
                findProduct, 
                currentPage: page, 
                totalPages, 
                isLogin, 
                wishlistProductIds
            });
        } else {
            const findPrice = await Product.find().populate({
                path: 'category',
                match: { 
                    status: 'active', 
                    isDeleted: false 
                }
            }).sort({ _id: -1 }).limit(4);

            const chairProducts = findPrice.filter(product => product?.category?.name === name);

            res.render(name, { 
                findPrice: chairProducts, 
                isLogin, 
                wishlistProductIds
            }); 
        }
    } catch (error) {
        console.log("newArrivals Error:", error);
        res.redirect("/user/pageNotFound");
    }
};


const allsearch = async (req, res) => {
    try {
        const searchValue = req.body.search; 
        const { id } = req.params;
        const isLogin = !!req.session.user;
        const userId = req.session.user ? req.session.user._id : null; // Ensure userId is defined

        if (!searchValue || searchValue.trim() === "") {
            console.log("Search query is empty. Redirecting to default page.");
            return res.redirect("/user/shop"); 
        }

        let countWishlist = 0;
        let wishlistProductIds = [];

        // Fetch wishlist count if user is logged in
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }

        let products = await Product.find({ productName: { $regex: searchValue, $options: "i" } });

        if (id === "shop") {
            return res.render(id, { 
                results: products, 
                message: null, 
                isLogin, 
                wishlistProductIds 
            });    
        }

        products = await Product.find({ productName: { $regex: searchValue, $options: "i" } })
            .populate('category');

        if (products.length === 0) {
            return res.redirect("/user/shop"); 
        }

        const filteredProducts = id 
            ? products.filter(product => product?.category?.name === id) 
            : products;

        res.render(id, { 
            results: filteredProducts, 
            message: null, 
            isLogin, 
            wishlistProductIds 
        });
    } catch (error) {
        console.error("Error in allsearch:", error);
        res.redirect("/user/pageNotFound");
    }
};


const popularity = async (req, res) => {
    try {
      const name = req.params.id;
      const isLogin = !!req.session.user;
      const userId = req.session.user ? req.session.user._id : null; // Ensure userId is defined
  
      let countWishlist = 0;
      let wishlistProductIds = [];
  
      // Fetch wishlist count if user is logged in
      if (userId) {
        const wishlist = await Wishlist.findOne({ userId });
        if (wishlist) {
          countWishlist = wishlist.products.length;
          wishlistProductIds = wishlist.products.map(item => item.productId.toString());
        }
      }
  
      if (name === "shop") {
        let page = parseInt(req.query.page) || 1;
        let limit = 4;
        let skip = (page - 1) * limit;
        let totalProducts = await Product.countDocuments();
        let totalPages = Math.ceil(totalProducts / limit);
  
        let findProduct = await Product.find()
          .sort({ salesCount: -1 }) // Sorting by popularity (salesCount)
          .skip(skip)
          .limit(limit);
  
        return res.render('shop', { 
          findProduct, 
          currentPage: page, 
          totalPages, 
          isLogin, 
          wishlistProductIds 
        });
      }
  
      const findPrice = await Product.find().populate({
        path: 'category',
        match: { 
          status: 'active', 
          isDeleted: false 
        }
      }).sort({ salesCount: -1 });
  
      const chairProducts = findPrice.filter(product => product?.category?.name === name);
  
      res.render(name, { 
        findPrice: chairProducts, 
        isLogin, 
        wishlistProductIds 
      });
    } catch (error) {
      console.error("popularity:", error);
      res.redirect("/user/pageNotFound");
    }
  };
  

  const AtoZ = async (req, res) => {
    try {
        const name = req.params.id;
        const isLogin = !!req.session.user;
        const userId = req.session.user ? req.session.user._id : null; // Ensure userId is defined

        let countWishlist = 0;
        let wishlistProductIds = [];

        // Fetch wishlist count if user is logged in
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }

        if (name === "shop") {
            let page = parseInt(req.query.page) || 1;
            let limit = 4;
            let skip = (page - 1) * limit;
            let totalProducts = await Product.countDocuments();
            let totalPages = Math.ceil(totalProducts / limit);

            let findProduct = await Product.find()
                .sort({ productName: 1 }) // Sorting A-Z
                .skip(skip)
                .limit(limit);

            return res.render('shop', { 
                findProduct, 
                currentPage: page, 
                totalPages, 
                isLogin, 
                wishlistProductIds 
            });
        }

        const products = await Product.find()
            .populate({
                path: 'category',
                match: { status: 'active', isDeleted: false }
            })
            .sort({ productName: 1 });

        const chairProducts = products.filter(product => product?.category?.name === name);

        res.render(name, { 
            findPrice: chairProducts, 
            isLogin, 
            wishlistProductIds 
        });
    } catch (error) {
        console.error("Error in AtoZ:", error);
        res.redirect("/user/pageNotFound");
    }
};

const ZtoA = async (req, res) => {
    try {
        const name = req.params.id;
        const isLogin = !!req.session.user;
        const userId = req.session.user ? req.session.user._id : null; // Ensure userId is defined

        let countWishlist = 0;
        let wishlistProductIds = [];

        // Fetch wishlist count if user is logged in
        if (userId) {
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist) {
                countWishlist = wishlist.products.length;
                wishlistProductIds = wishlist.products.map(item => item.productId.toString());
            }
        }

        if (name === "shop") {
            let page = parseInt(req.query.page) || 1;
            let limit = 4;
            let skip = (page - 1) * limit;
            let totalProducts = await Product.countDocuments();
            let totalPages = Math.ceil(totalProducts / limit);

            let findProduct = await Product.find()
                .sort({ productName: -1 }) // Sorting Z-A
                .skip(skip)
                .limit(limit);

            return res.render('shop', { 
                findProduct, 
                currentPage: page, 
                totalPages, 
                isLogin, 
                wishlistProductIds 
            });
        }

        const products = await Product.find()
            .populate({
                path: 'category',
                match: { status: 'active', isDeleted: false }
            })
            .sort({ productName: -1 });

        const chairProducts = products.filter(product => product?.category?.name === name);

        res.render(name, { 
            findPrice: chairProducts, 
            isLogin, 
            wishlistProductIds 
        });
    } catch (error) {
        console.error("Error in ZtoA:", error);
        res.redirect("/user/pageNotFound");
    }
};

const wishlist=async (req,res)=>{
    const { productId } = req.body;
    const userId = req.session.user.id; // Assuming session stores user ID

    if (!productId) {
        return res.status(400).json({ success: false, message: "Product ID is required." });
    }

    try {
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [{ productId }] });
        } else {
            const productIndex = wishlist.products.findIndex(p => p.productId.toString() === productId)
            if (productIndex !== -1) {
                wishlist.products.splice(productIndex, 1);
            } else {
                wishlist.products.push({ productId });
            }
        }

        await wishlist.save();
        res.json({ success: true, message: "Wishlist updated successfully." });
    } catch (error) {
        console.error("Wishlist Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
const showWishlist = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
        }

        const userId = req.session.user.id;
        const isLogin = true;

        // Fetch wishlist & populate product details
        const wishlist = await Wishlist.findOne({ userId }).populate("products.productId");

        // Ensure wishlist count is always a valid number
        let countWishlist = wishlist?.products?.length || 0;

        // Fetch cart count
        let cartCount = 0;
        const userCart = await Cart.findOne({ userId });
        cartCount = userCart ? userCart.items.length : 0;

        res.render("wishlist", { 
            wishlist: wishlist ? wishlist.products : [], 
            countWishlist, 
            cartCount, 
            isLogin 
        });

    } catch (error) {
        console.error("Wishlist Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const WishlistToggle = async (req, res) => {
    try {
        const userId = req.session?.user?.id; 
        const { productId } = req.body; 

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
        }

        console.log("Wishlist toggle request received for product:", productId);

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found." });
        }
        const productIndex = wishlist.products.findIndex(item => item.productId.toString() === productId);

        if (productIndex !== -1) {
            wishlist.products.splice(productIndex, 1);
            console.log("Product removed from wishlist:", productId);
        } else {
            return res.status(404).json({ success: false, message: "Product not found in wishlist." });
        }
        await wishlist.save();

        return res.json({ success: true, message: "Product removed from wishlist successfully." });

    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};




module.exports = {
    loadHomepage,
    pageNotFound,
    login,
    loginpost,
    singup,
    singupPOst,
    verifyotp,
    logout,
    resendOTP,
    forgetpassword,
    postforgetpassword,
    resendForgotpasswordOTP,
    verifyOtpForgotPassword,
    changepassword,
    postChangepassword,
    PriceLowToHigh,
    PriceHighToLow,
    newArivels,
    allsearch,
    popularity,
    AtoZ,
    ZtoA,
    wishlist,
    showWishlist,
    WishlistToggle
}