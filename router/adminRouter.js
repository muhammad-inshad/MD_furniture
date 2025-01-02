const express=require("express");
const router=express.Router()
const adminController=require('../controllers/admin/adminController')
const customerController=require('../controllers/admin/customerContollr')
const {uploadFields}=require("../middlewares/multer")
const {isAdmin}=require("../middlewares/auth")

router.get("/login",adminController.login)
router.post("/login",adminController.loginpost)
router.get("/dashboard",isAdmin,adminController.dashboard)
router.get("/logout",adminController.logoutPOst)

router.get("/userManagement",customerController.userManagement)
router.post("/blockUser/:id",customerController.blockUser)
router.post("/search",customerController.searchUSer)

router.get("/CategoryManagement",customerController.CategoryManagement)
router.post("/updateCategory/:id",customerController.updatecategory)
router.put("/updateForm",customerController.updateFormcategory)
router.get("/addcategory",customerController.addcategory)
router.post("/addPost",customerController.addPost)
router.delete("/deleteCategory",customerController.deleteCategory)

router.get("/productManagement",customerController.productManagement)
router.get("/addproduct",customerController.addproduct)
router.post("/addproduct",uploadFields,customerController.addproductPOst)
router.post("/search-product",customerController.searchProduct)
router.post("/deleteProduct/:id",customerController.DeleteProduct)
router.get("/viewOfProduct/:id",customerController.viewOfProduct)
router.get("/updateProduct/:id",customerController.updateProduct)
router.post("/updateProduct/:id",uploadFields,customerController.postupdateProduct)


module.exports=router
