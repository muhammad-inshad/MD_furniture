
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




const userManagement=async(req,res)=>{
    try {
        if( req.session.admin){
            const userfind = await User.find().sort({_id:-1});
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
        res.render("categoryM", {category})
        }
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
    const { id } = req.body; 
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        category.isDeleted = !category.isDeleted;
        await category.save();
        res.redirect("/admin/CategoryManagement");
    } catch (error) {
        console.error("Error deleting/restoring category:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




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
    

const ordermanagment = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1; // Get page number from query params (default to 1)
        let limit = 3; // Number of orders per page
        let skip = (page - 1) * limit; // Calculate the number of documents to skip

        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            {
                $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true },
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true },
            },
            { $sort: { _id: -1 } }, // Sorting by latest orders first
            { $skip: skip }, // Skip documents for pagination
            { $limit: limit }, // Limit the number of documents per page
        ]);

        // Count total orders to calculate total pages
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit); // Calculate total pages
        res.render('ordermanagement', { orders, currentPage: page, totalPages });
   
    } catch (error) {
        console.error('Error in order management:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};



const orderupdate=async (req,res)=>{
    try {
        const {id}=req.params
        const {status}=req.body
        const order=await Order.findById(id)
        order.status = status;
        await order.save();
  
        return res.redirect("/admin/ordermanagment")
       
    } catch (error) {
        console.error('Error in orderupdate:', error);
        res.status(500).json({ success: false, message: 'Failed to orderupdate' });
    }
}

const userAddress = async (req, res) => {
    try {
        const addressMainId = req.params.id1;
        const addressSecondId = req.params.id2;

        const addressData = await Address.findOne(
            { userId: addressMainId, "address._id": addressSecondId },
            { "address.$": 1 } // Projection to get only the matching address
        );

        if (!addressData || !addressData.address.length) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        const address = addressData.address[0]; // Extract first item from array
       

        res.render("userAddresspage", { address }); // Pass only the matched address

    } catch (error) {
        console.error("userAddress from admin side", error);
        res.status(500).json({ success: false, message: "Error fetching user address" });
    }
};

const showProduct=async (req,res)=>{
    try {
        const {id}=req.params
        const cancelReason=req.body.cancelReason
         const order=await Order.findById(cancelReason)
         
        const product = await Product.findById(id).populate("category"); ;
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
       
        res.render("showProduct", {product,order});
    } catch (error) {
        console.error("showProduct from admin side", error);
        res.status(500).json({ success: false, message: "showProduct product address" });
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
    DeleteProduct,
    viewOfProduct,
    updateProduct,
    postupdateProduct,
    deleteImage,
    ordermanagment,
    orderupdate,
    userAddress,
    showProduct
}