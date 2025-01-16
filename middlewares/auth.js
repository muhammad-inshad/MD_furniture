
const User=require("../models/userSchema")

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


module.exports={
    isAdmin,
    isUser,
    isLoginORnot
}