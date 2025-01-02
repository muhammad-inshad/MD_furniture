
const User=require("../../models/userSchema")
const Admin=require("../../models/adminSchema")
const mongoose=require("mongoose")
const bcrypt=require("bcrypt")
const session = require("express-session")


const login=async(req,res)=>{
    try {
        if(req.session.admin){
            return res.redirect("/admin/dashboard")
        }
        return await res.render('adminLogin')
    } catch (error) {
        console.log("HOME NOT FOUNT")
        res.status(500).sent("srver error")
    }
}
const loginpost = async (req, res) => {
    try {
        const { username, password } = req.body;
        

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        req.session.admin = {
            id: admin._id,
            username: admin.username,
        };
        return res.json({ success: true, message: "Admin successfully logged in" });
    } catch (error) {
        console.error("Error during admin login:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const dashboard=async (req,res)=>{
        try{
           return await res.render("dashboard")
        }
        catch(error){
            console.log("error form dashboard ",error)
            res.status(500).json({success:true,message:"internal server error"})
        }
}

const logoutPOst=async(req,res)=>{
    try {
        req.session.destroy((error)=>{
            if (error) {
            return res.redirect("/admin/dashboard")
            }
              res.redirect("/admin/login")
        })
        
    } catch (error) {
        console.log("error from logout ",error)
    }
}

module.exports={
    login,
    loginpost,
    dashboard,
    logoutPOst
}