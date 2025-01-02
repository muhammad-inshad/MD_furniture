const User=require("../models/userSchema")

const isUser = (req, res, next) => {
    try {
        if (req.session.user) {
            return res.redirect("/user/home"); // Redirect to dashboard if already logged in
        }
        return next(); // Allow unauthenticated users to access the route
    } catch (error) {
        console.error("Error in isUser middleware:", error);
        res.status(500).send("Server error");
    }
};





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
    isUser
}