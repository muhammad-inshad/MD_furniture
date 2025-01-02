const { render } = require('../../app');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');


const chair=async(req,res)=>{
    try {
        const findProduct= await Product.find({isDeleted:true}).populate({
            path: 'category', 
            match: { status: 'active' },
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
        const findProduct= await Product.find({isDeleted:true}).populate({
            path: 'category', 
            match: { status: 'active' },
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
        const find= await Product.find({isDeleted:true}).populate({
            path: 'category', 
            match: { status: 'active' },
        });
        const isLogin = req.session.user? true:false
       const findProduct=find.filter(product=>product?.category?.status==='active')
        res.render("shop",{findProduct,isLogin})
        
    } catch (error) {
        res.json({ "error": "form chair get error" });
           console.log("form chair get error",error)
    }
}

module.exports={
    chair,
    showDetailProduct,
    sofa,
    shop
}