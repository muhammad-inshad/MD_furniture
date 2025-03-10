const express=require("express");
const router=express.Router();
const userContoller=require("../controllers/user/userController");
const sofaController=require("../controllers/user/sofaController")
const chairControler=require("../controllers/user/chairControler")
const profileControler=require("../controllers/user/userProfileController")
const checkoutController=require("../controllers/user/checkoutController")
const cartController=require("../controllers/user/cartController")
const ReturnController=require("../controllers/user/ReturnController")
const {uploadFields}=require("../middlewares/multer")
const {isUser,isLoginORnot,cartValidation}=require("../middlewares/auth");
const passport = require("passport");
const User=require("../models/userSchema");
const { route } = require("./adminRouter");


router.get("/login",isUser,userContoller.login)
router.get("/home",isUser,userContoller.loadHomepage)
router.get("/pageNotFound",userContoller.pageNotFound)
router.post("/login",userContoller.loginpost)
router.get("/signup",isUser,userContoller.singup)
router.post("/signup",userContoller.singupPOst)
router.post("/verifyotp",userContoller.verifyotp)
router.get("/logout",userContoller.logout)
router.post("/resendOTP",userContoller.resendOTP)

router.get("/forgetpassword",userContoller.forgetpassword)
router.post("/forgetpassword",userContoller.postforgetpassword)
router.post("/resendForgotpasswordOTP",userContoller.resendForgotpasswordOTP)
router.post('/verifyOtpForgotPassword',userContoller.verifyOtpForgotPassword)
router.get("/changepassword",userContoller.changepassword)
router.post("/changepassword",userContoller.postChangepassword)
router.post("/allsearch/:id",userContoller.allsearch)
router.get("/aboutus",userContoller.aboutus)

router.get("/PriceLowToHigh/:name",userContoller.PriceLowToHigh)
router.get("/PriceHighToLow/:name",userContoller.PriceHighToLow)
router.get("/newArivels/:name",userContoller.newArivels)
router.get("/popularity/:id",userContoller.popularity)
router.get("/AtoZ/:id",userContoller.AtoZ)
router.get("/ZtoA/:id",userContoller.ZtoA)

router.post("/wishlist",userContoller.wishlist)
router.get("/showWishlist",isLoginORnot,userContoller.showWishlist)
router.post("/WishlistToggle",userContoller.WishlistToggle)

router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}))
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:'/user/signup'}),async(req,res)=>{
    const findemail = await User.findOne({ email:req.user.email });
    if (findemail.isBlocked === true) {
        return res.status(400).json({ success: false, message: "this user is blocked" })
    }
    if (!findemail) {
        return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    req.session.user = {
        id: findemail._id,
        email: findemail.email,
        isBlocked: findemail.isBlocked
    }
    return res.render("home",{ success: true, message: "Login successful", isLogin: true });


})


router.get("/chair",isUser,uploadFields,chairControler.chair)
router.get("/showDetailProduct/:id",isUser,uploadFields,sofaController.showDetailProduct)

router.get("/sofa",isUser,uploadFields,sofaController.sofa)

router.get("/shop",isUser,uploadFields,sofaController.shop)

router.get("/profile",isUser,isLoginORnot,profileControler.profile)
router.get("/address",isLoginORnot,isUser,profileControler.address)
router.get("/add_address",isLoginORnot,isUser,profileControler.add_address)
router.post("/add_address",profileControler.post_add_address)
router.get("/edit_address/:id",profileControler.edit_address)
router.post("/edit_address",profileControler.postedit_address)
router.get("/editeprofile",isLoginORnot,profileControler.editeprofile)
router.post("/editeprofile/:id",profileControler.PostEditeprofile)
router.post("/deleteAddress/:id",profileControler.deleteAddress)


router.post("/cart",uploadFields,cartController.cart)
router.get('/cart' ,cartController.getCartData);
router.post('/cartremove',cartController.remove)
router.post('/incORdec',cartController.incORdec)
router.get('/Cartversion',cartController.Cartversion)

router.get('/checkout',isLoginORnot,isUser,checkoutController.checkout)
router.post("/checkout",checkoutController.postCkeckout)
router.get("/myorders",isLoginORnot,uploadFields,checkoutController.myorders)
router.post("/DownloadPdf/:id",checkoutController.DownloadPdf)
router.get("/orderCancel/:id",isLoginORnot,checkoutController.orderCancel)
router.post("/orderCancel",checkoutController.postorderCancel)


router.post("/rating",sofaController.rating)
router.post("/applycoupon",sofaController.applycoupon)

router.get("/Wallet",checkoutController.Wallet)
router.post("/addmoney",checkoutController.addmoney)
router.post("/verifyPayment",checkoutController.verifyPayment)

router.get("/ReturnRequest/:id",isLoginORnot,ReturnController.ReturnRequest)
router.post("/ReturnRequestApOrRe",ReturnController.ReturnRequestApOrRe)
router.post("/pymentfaield",ReturnController.pymentfaield)
module.exports=router