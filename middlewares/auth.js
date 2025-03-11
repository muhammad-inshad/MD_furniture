
const User=require("../models/userSchema")
const Cart= require('../models/cartSchema')

const isUser = async (req, res, next) => {
    try {
        if (req.session.user) {
            const userId = req.session.user.id;

            const user = await User.findById(userId);

            if (!user) {
                return res.render("userLogin"); 
            }

            if (user.isBlocked) {
                return res.render("userLogin"); // Redirect if user is blocked
            }
        }
        return next(); // Allow access to the route
    } catch (error) {
        console.error("Error in isUser middleware:", error);
        res.status(500).send("Server error");
    }
};

const isLoginORnot=async (req,res,next)=>{
   try{ 
    if(!req.session.user){
        res.render("home")
    }
    else
    {
        next()
    }}
    catch (error) {
        console.error("Error in isLoginORnot middleware:", error);
        res.status(500).send("Server error");
    }
}





const isAdmin = (req, res, next) => {
    try {
        if (req.session.admin) {
            next(); // If admin, proceed to next middleware or route
        } else {
            res.redirect("/user/home"); // Redirect if not admin
        }
    } catch (error) {
        console.error(error);
        res.redirect("/user/home"); // Redirect on error as fallback
    }
};
const cartValidation = async (req, res, next) => {
    try {
      const { cartVersion } = req.body;
      if (!cartVersion) {
        return next();
      }
  
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "User not logged in" });
      }
      
      const cart = await Cart.findOne({ userId: req.session.user.id });
      
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      if (cart.versionKey !== parseInt(cartVersion)) {
        return res.status(409).json({ 
          message: "Cart has been updated",
          currentVersion: cart.cartVersion
        });
      }
      
      next();
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Server error during cart validation" });
    }
};

module.exports={
    isAdmin,
    isUser,
    isLoginORnot,
    cartValidation
}