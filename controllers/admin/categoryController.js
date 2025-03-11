
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



const CategoryManagement = async (req, res) => {
    try {
        if (req.session.admin) {
            let page = parseInt(req.query.page) || 1; 
            let limit = 5; 
            let skip = (page - 1) * limit;

            const totalCategories = await Category.countDocuments(); // Corrected variable name
            const totalPages = Math.ceil(totalCategories / limit);

            // Apply pagination and sorting
            const category = await Category.find()
                .skip(skip)
                .limit(limit)
                

            res.render("categoryM", { category, page, totalPages });
        } else {
            res.redirect("/user/home");
        }
    } catch (error) {
        console.log("Error from CategoryManagement:", error); // Fixed variable name
        res.status(500).send("Internal Server Error");
    }
};


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
        res.json({success:true})
    } catch (error) {
        console.error("Error deleting/restoring category:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports={
    CategoryManagement,
    updatecategory, 
    addcategory,
    addPost,
    updateFormcategory,
    deleteCategory,
}