const User=require('../../models/userSchema')
const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const Order=require("../../models/orderSchema")
const { search } = require('../../app');
const fs=require("fs")
const path=require("path")
const Sharp=require("sharp");
const { constants } = require('perf_hooks');
const Address = require('../../models/addressSchema');
const mongoose = require("mongoose");

const productManagement = async (req, res) => {
    try {
        if (req.session.admin) {
            const itemsPerPage = 5; 
            const page = parseInt(req.query.page) || 1; 
            const totalItems = await Product.countDocuments(); 
            const totalPages = Math.ceil(totalItems / itemsPerPage); 

            const ProductDetiles = await Product.find()
                .populate('category')
                .skip((page - 1) * itemsPerPage)
                .limit(itemsPerPage);

            res.render("prodectmenagement", {
                ProductDetiles,
                currentPage: page,
                totalPages,
            });
        } else {
            res.redirect("/user/home");
        }
    } catch (error) {
        console.error("Error from productManagement", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


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
        const { name, description, brand, category, salePrice, productOffer, stock, status } = req.body;

        // Check if all required fields are provided
        if (!name || !description || !brand || !category || !salePrice) {
            return res.status(400).json({ message: "All required fields are required" });
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ productName: name });
        if (existingProduct) {
            return res.status(400).json({ message: "Product already exists" });
        }

        const findcategory = await Category.findOne({ name: category });
        if (!findcategory) {
            return res.status(400).json({ message: "Category not found" });
        }

        // Handle image cropping: expect cropped image files in req.files
        const productImages = req.files.productImages.map(file => file.filename); 

        // Check if cropped image files are provided
        if (req.files.croppedImages) {
            // Process cropped images here, if needed
            const croppedImages = req.files.croppedImages.map(file => file.filename);
            productImages.push(...croppedImages); // Combine original and cropped images
        }

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
            productImages: productImages // Include all images (original + cropped)
        };

        // Create a new product instance
        const newProduct = new Product(productData);

        // Save product to database
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
            const { id } = req.params; // Get product ID from URL params
            const newImages = req.files?.productImages?.map(file => file.filename); // Extract new image filenames
            const { name, description, brand, category, salePrice, productOffer, stock, status } = req.body;
    
            // Find the category by name
            const findCategory = await Category.findOne({ name: category }); // Fetch category by name
            if (!findCategory) {
                return res.status(400).json({ message: "Category not found" });
            }
    
            // Find the existing product
            const oldProduct = await Product.findById(id);
            if (!oldProduct) {
                return res.status(404).json({ message: "Product not found" });
            }
    
            // Append new images to existing productImages array
            const updatedImages = oldProduct.productImages;
            if (newImages && newImages.length > 0) {
                updatedImages.push(...newImages); // Append new images
            }
    
            // Product data to update
            const productData = {
                productName: name,
                description: description,
                brand: brand,
                category: findCategory._id, // Use the found category ID
                salePrice: parseFloat(salePrice), // Ensure salePrice is a number
                productOffer: productOffer,
                quantity: parseInt(stock), // Ensure stock is an integer
                status: status,
                productImages: updatedImages, // Use the updated images array
            };
    
            // Update the product in the database
            const updatedProduct = await Product.findByIdAndUpdate(
                id,
                { $set: productData }, // Apply the updates
                { new: true, runValidators: true, omitUndefined: true } // Return the updated product, run validation
            );
    
            if (!updatedProduct) {
                return res.status(404).json({ message: "Product not found" });
            }
    
            res.status(200).json({
                message: "Product updated successfully!",
                product: updatedProduct,
                updatedImages: updatedImages, // Return updated images to the frontend
            });
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).send("An error occurred while updating the product.");
        }
    };
    

const deleteImage= async (req, res) => {
    try { 
        const { productId, imageName } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Remove image from the productImages array
        product.productImages = product.productImages.filter(img => img !== imageName);
        await product.save();

        // Delete the image file from the server
        const imagePath = path.join(__dirname, "../uploads", imageName);
        fs.unlink(imagePath, (err) => {
            if (err) console.error("Error deleting file:", err);
        });

        res.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
    
module.exports={
    productManagement,
    addproduct,
    addproductPOst,
    searchProduct,
    DeleteProduct,
    viewOfProduct,
    updateProduct,
    postupdateProduct,
    deleteImage
}