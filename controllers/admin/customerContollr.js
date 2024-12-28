
const User=require('../../models/userSchema')
const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const { search } = require('../../app');


const userManagement=async(req,res)=>{
    try {
        const userfind=await User.find()

        res.render("userManagement",{userfind})
    } catch (error) {
        console.log("userManagement error", error)
        res.status(500).send("Error in user management");

    }
}

const blockUser=async (req,res)=>{
      try {
            const {id}=req.params
            const user= await User.findById(id)
            user.isBlocked = !user.isBlocked;
            await user.save();
            res.redirect("/admin/userManagement")
      } catch (error) {
        console.log(error);
      }
}

const searchUSer = async (req, res) => {
    try {
        const { searchKey } = req.body;
    
        const result = await User.find({
            username: { $regex: searchKey, $options: "i" }
        });
        res.json({ success: true, result });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const CategoryManagement=async(req,res)=>{
    try {
        const category = await Category.find({});
        res.render("categoryM", {category})
    } catch (error) {
        console.log("errror from CategoryManagement", errror)
    }
}

const updatecategory=async (req,res)=>{
    try {
        const id= req.params.id;
        const categoryData = await Category.findById(id)
        
        res.render("updatecategory",{categoryData})
        
    } catch (error) {
        console.log("error from update category",error);
    }
} 

const addcategory=async (req,res)=>{
    try {
        res.render("addcategory")
    } catch (error) {
        console.log("error from addcategory",error)
    }
}

const addPost=async (req,res)=>{
    try {
        const {name,description,offerPrice,status}=req.body
        const findCategory = await Category.findOne({ name });
        if (findCategory) {
          return res.status(400).json({ message: "Category already exists" });
        }
        const obj ={...req.body}
        if(status==="active")
            {
                obj.status="active"
            }
            else{
                obj.status="inactive"
            }
       
        const newCatagory=new Category({...obj})
        await newCatagory.save()
        return res.status(200).json({success:true, message: 'Category not found' });
        
       
    } catch (error) {
        console.log("error from post add category",error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const updateFormcategory = async (req, res) => {
    try {
        const { id,name, description, offerPrice, status } = req.body; // Extract fields from the request body
        // Update the category in the database
        const updatedCategory = await Category.findByIdAndUpdate(
            id, // ID of the category to update
            {
                $set: { name, description, offerPrice, status },
            },
            { new: true, omitUndefined: true } // Return the updated document and ignore undefined fields
        );

        // Check if the category exists
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
res.status(200).json({ success:true, message: 'Category updated successfully'});
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
const deleteCategory = async (req, res) => {
    const { id } = req.body; // Retrieve ID from the request body

    try {
        const deletedItem = await Category.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



const productManagement=async (req,res)=>{
    try {
        const ProductDetiles = await Product.find();
        res.render("prodectmenagement",{ProductDetiles})
    } catch (error) {
        console.log("error from productManagement",error)
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const addproduct=async (req,res)=>{
           try {
            res.render('addProduct')
           } catch (error) {
            console.log("error from add product get ",error)
            res.status(500).json({ message: 'Internal Server Error' });
           }
}

const addproductPOst=async(req,res)=>{
    try {
        const {name,description,brand,category,salePrice,productOffer,stock,status}=req.body
             const findProduct=await Product.findOne({ productName:name})
             if(findProduct){
                return res.status(400).json({ message: "product is alredy there" });
             }
           const passtoSchema={
            productName:name,
            description:description,
            brand:brand,
            category:category,
            salePrice:salePrice,
            productOffer:productOffer,
            quantity:stock,
            status:status
           }
           const ProductData=new Product({...passtoSchema})
           await ProductData.save()
           return res.json({success:true,message:"save successfully",ProductData})
    } catch (error) {
        console.log("error from add product post ",error)
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const searchProduct = async (req, res) => {
    try {
        const { searchKey } = req.body;
        if (!searchKey || searchKey.trim() === '') {
            return res.status(400).json({ success: false, message: "Search key is required." });
        }

        const result = await Product.find({
             productName: { $regex: searchKey, $options: "i"  },
        });

        res.json({ success: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const DeleteProduct=async(req,res)=>{
   try {
    const {id}=req.params
    const deletedItem=await Product.findByIdAndDelete(id)
    if(deletedItem){
        res.redirect("/admin/productManagement")
    }
   } catch (error) {
    console.error('Error from  delete product:', error);
   }

}




module.exports={
    userManagement,
    blockUser,
    searchUSer,
    CategoryManagement,
    updatecategory,
    addcategory,
    addPost,
    updateFormcategory,
    deleteCategory,
    productManagement,
    addproduct,
    addproductPOst,
    searchProduct,
    DeleteProduct
}