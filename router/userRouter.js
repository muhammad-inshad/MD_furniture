const express=require("express");
const router=express.Router();
const userContoller=require("../controllers/user/userController");
const sofaController=require("../controllers/user/sofaController")
const {uploadFields}=require("../middlewares/multer")
const {isUser,isLoginORnot}=require("../middlewares/auth");
const passport = require("passport");
const User=require("../models/userSchema")


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
 

router.get("/chair",isUser,uploadFields,sofaController.chair)
router.get("/showDetailProduct/:id",isUser,uploadFields,sofaController.showDetailProduct)

router.get("/sofa",isUser,uploadFields,sofaController.sofa)

router.get("/shop",isUser,uploadFields,sofaController.shop)

router.get("/profile",isLoginORnot,isUser,sofaController.profile)
router.get("/address",isLoginORnot,isUser,sofaController.address)
router.get("/add_address",isLoginORnot,isUser,sofaController.add_address)
router.post("/add_address",sofaController.post_add_address)
router.get("/editeprofile",isLoginORnot,sofaController.editeprofile)
router.post("/editeprofile/:id",sofaController.PostEditeprofile)
router.post("/deleteAddress/:id",sofaController.deleteAddress)
router.post("/cart",uploadFields,sofaController.cart)
router.get('/cart' ,sofaController.getCartData);
router.post('/cartremove',sofaController.remove)
router.post('/incORdec',sofaController.incORdec)
router.get('/checkout',isLoginORnot,isUser,sofaController.checkout)
router.post("/checkout",sofaController.postCkeckout)
router.get("/myorders",isLoginORnot,uploadFields,sofaController.myorders)
router.get("/orderCancel/:id",isLoginORnot,sofaController.orderCancel)
router.post("/orderCancel",sofaController.postorderCancel)

module.exports=router