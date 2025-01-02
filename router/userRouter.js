const express=require("express");
const router=express.Router();
const userContoller=require("../controllers/user/userController");
const sofaController=require("../controllers/user/sofaController")
const {uploadFields}=require("../middlewares/multer")
const {isUser}=require("../middlewares/auth");
const passport = require("passport");


router.get("/login",isUser,userContoller.login)
router.get("/home",userContoller.loadHomepage)
router.get("/pageNotFound",userContoller.pageNotFound)
router.post("/login",userContoller.loginpost)
router.get("/signup",isUser,userContoller.singup)
router.post("/signup",userContoller.singupPOst)
router.post("/verifyotp",userContoller.verifyotp)
router.get("/logout",userContoller.logout)
router.post("/resendOTP",userContoller.resendOTP)


router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}))
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:'/user/signup'}),(req,res)=>{
    req.session.user=passport
    res.redirect('/user/home')
})


router.get("/chair",uploadFields,sofaController.chair)
router.get("/showDetailProduct/:id",uploadFields,sofaController.showDetailProduct)

router.get("/sofa",uploadFields,sofaController.sofa)

router.get("/shop",uploadFields,sofaController.shop)

module.exports=router