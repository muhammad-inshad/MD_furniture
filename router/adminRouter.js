const express=require("express");
const router=express.Router()
const adminController=require('../controllers/admin/adminController')
const customerController=require('../controllers/admin/customerContollr')
const productController=require('../controllers/admin/productController')
const categoryController=require('../controllers/admin/categoryController')
const dashboardController=require('../controllers/admin/dashboardController')
const {uploadFields}=require("../middlewares/multer")
const {isAdmin}=require("../middlewares/auth")



router.get("/login",adminController.login)
router.post("/login",adminController.loginpost)
router.get("/dashboard",isAdmin,dashboardController.dashboard)
router.post("/dashboard",dashboardController.postDashboard)
router.post("/bestsellers", dashboardController.getBestSellingData);

router.get("/logout",adminController.logoutPOst)

router.get("/userManagement",customerController.userManagement)
router.post("/blockUser/:id",customerController.blockUser)
router.post("/search",customerController.searchUSer)

router.get("/CategoryManagement",categoryController.CategoryManagement)
router.post("/updateCategory/:id",categoryController.updatecategory)
router.put("/updateForm",categoryController.updateFormcategory)
router.get("/addcategory",categoryController.addcategory)
router.post("/addPost",categoryController.addPost)
router.post("/deleteCategory",categoryController.deleteCategory)

router.get("/productManagement",productController.productManagement)
router.get("/addproduct",productController.addproduct)
router.post("/addproduct",uploadFields,productController.addproductPOst)
router.post("/search-product",productController.searchProduct)
router.post("/deleteProduct/:id",productController.DeleteProduct)
router.get("/viewOfProduct/:id",productController.viewOfProduct)
router.get("/updateProduct/:id",productController.updateProduct)
router.post("/updateProduct/:id",uploadFields,productController.postupdateProduct)
router.post("/deleteProductImage/:productId/:imageName", productController.deleteImage);


router.get("/ordermanagment",isAdmin,customerController.ordermanagment)
router.post("/order/update/:id",customerController.orderupdate)

router.post("/showProduct/:id",isAdmin,customerController.showProduct)

router.get("/userAddress/:id1/:id2",isAdmin,customerController.userAddress)

router.get("/coupenMenagement",isAdmin,adminController.coupenMenagement)
router.get("/addcoupon",adminController.addcoupon)
router.post("/addcouponPost",adminController.addcouponPost)
router.post("/deletecoupon/:id",adminController.deletecoupon)

router.get("/SalesReport",isAdmin,adminController.SalesReport)
router.post("/ShowTheSalesReport",adminController.ShowTheSalesReport)

router.get("/AdminReturnRequest",isAdmin,adminController.ReturnRequest)
router.post("/acceptReturn/:id",adminController.acceptReturn)
router.post("/rejectReturn/:id",adminController.rejectReturn)



module.exports=router
