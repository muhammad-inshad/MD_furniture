const express=require("express");
const router=express.Router();
const userContoller=require("../controllers/user/userController");
const sofaController=require("../controllers/user/sofaController")

router.get("/login",userContoller.login)
router.get("/home",userContoller.loadHomepage)
router.get("/pageNotFound",userContoller.pageNotFound)
router.post("/login",userContoller.loginpost)
router.get("/signup",userContoller.singup)
router.post("/signup",userContoller.singupPOst)
router.post("/verifyotp",userContoller.verifyotp)
router.get("/logout",userContoller.logout)
router.post("/resendOTP",userContoller.resendOTP)



router.get("/chair",sofaController.sofaTemp)

module.exports=router