
const User=require('../../models/userSchema')
const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const { search } = require('../../app');
const fs=require("fs")
const path=require("path")
const Sharp=require("sharp")




const userManagement=async(req,res)=>{
    try {
        if( req.session.admin){
        const userfind=await User.find()
       
        res.render("userManagement",{userfind})}
        else{
            res.redirect("/user/home")
        }
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
        if( req.session.admin){
        const category = await Category.find({});
        res.render("categoryM", {category})}
        else{
            res.redirect("/user/home")
        }
    } catch (error) {
        console.log("errror from CategoryManagement", errror)
    }
}

const updatecategory=async (req,res)=>{
    try {
        if( req.session.admin){
        const id= req.params.id;
        const categoryData = await Category.findById(id)
        
        res.render("updatecategory",{categoryData})
        }
        else{
            res.redirect("/user/home")
        }
    } catch (error) {
        console.log("error from update category",error);
    }
} 

const addcategory=async (req,res)=>{
    try {
        if( req.session.admin){
        res.render("addcategory")
        }
        else{
            res.redirect("/user/home")
        }
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
        const { id,name, description, offerPrice, status } = req.body; 
        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            {
                $set: { name, description, offerPrice, status },
            },
            { new: true, omitUndefined: true } 
        );

 
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
        if(req.session.admin){
        const ProductDetiles = await Product.find().populate('category');
        res.render("prodectmenagement",{ProductDetiles})
        }
        else{
            res.redirect("/user/home")
        }
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

const addproductPOst = async (req, res) => {
    try {
        const { name, description, brand, category, salePrice, productOffer, stock, status} = req.body;


        // Check if all required fields are provided
        if (!name || !description || !brand || !category || !salePrice) {
            return res.status(400).json({ message: "All required fields are required" });
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ productName: name });
        if (existingProduct) {
            return res.status(400).json({ message: "Product already exists" });
        }
        const findcategory = await Category.findOne({name:category})
        if(!findcategory){
            return res.status(400).json({ message: "category not found" });

        }

        const productImages = req.files.productImages.map(file => file.filename); 
        // Prepare the product data to be passed to the schema
        const productData = {
            productName: name,
            description: description,
            brand: brand,
            category: findcategory,
            salePrice: salePrice,
            productOffer: productOffer,
            quantity: stock,
            status: status,
            productImages: productImages // Make sure imageFiles is handled correctly
        };

        // Create a new product instance
        const newProduct = new Product(productData)

        await newProduct.save();
        return res.json({ success: true, message: "Product saved successfully", newProduct });

    } catch (error) {
        console.error("Error from add product post:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


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
    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).send('Product not found');
      }
      product.isDeleted = !product.isDeleted;
    
      
    await product.save();
        res.redirect("/admin/productManagement")
    
   } catch (error) {
    console.error('Error from  delete product:', error);
   }

}

const viewOfProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const findProduct = await Product.findById(id).populate("category");
        if (!findProduct) {
            return res.status(404).send("Product not found");
        }
        res.render("viewProduct", { product: findProduct });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).send("An error occurred while fetching the product.");
    }
};


const updateProduct=async (req,res)=>{
    try {
        const {id}=req.params
    const findUPproduct=await Product.findById(id).populate("category")
    
    
    res.render("updateProduct",{findUPproduct})
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).send("An error occurred while fetching the product.");
    }
} 

const postupdateProduct = async (req, res) => {
    try {
        const { id } = req.params;  // Get product ID from URL params
        const productImages = req.files?.productImages?.map(file => file.filename); // Extract image filenames
        const { name, description, brand, category, salePrice, productOffer, stock, status } = req.body;
        // Find the category by ID
        const findCategory = await Category.find({category}); // Fetch category by ID
        if (!findCategory) {
            return res.status(400).json({ message: "Category not found" });
        }

        const oldProducts = await Product.findById(id);


        // Product data to update
        const productData = {
            productName: name,
            description: description,
            brand: brand,
            category: findCategory._id, // Use the found category
            salePrice: parseFloat(salePrice), // Ensure salePrice is a number
            productOffer: productOffer,
            quantity: parseInt(stock), // Ensure stock is an integer
            status: status,
            productImages: productImages || oldProducts?.productImages // Include image filenames
        };

    
        // Update the product in the database
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: productData }, // Apply the updates
            { new: true, runValidators: true, omitUndefined: true } // Return the updated product, run validation
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated successfully!', product: updatedProduct });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('An error occurred while updating the product.');
    }
};





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
    DeleteProduct,
    viewOfProduct,
    updateProduct,
    postupdateProduct
}