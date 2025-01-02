const User=require("../../models/userSchema")
const env=require("dotenv").config()
const bcrypt=require("bcrypt")
const { json } = require("express")
const nodemailer=require("nodemailer")

const login=async(req,res)=>{
    try{
         return res.render('userLogin')
    }
    catch{
        console.log("log in error")
        res.redirect("/user/pageNotFound")
        res.status(500).send("srver error")
    }
}

const loginpost=async(req,res)=>{ 
    try{
       const {email,password}=req.body
       if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required." });
    }
       const findemail= await User.findOne({email});
       if(findemail.isBlocke==true){
        return res.status(400).json({success:false,message:"this user is blocked"})
       }       
       if (!findemail) {
        return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const isPasswordValid = await bcrypt.compare(password, findemail.password); // Compare plaintext password with hashed password
    if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    if(findemail.isBlocked===false){

       return  res.json({ success: false, message: "you are in block", isLogin: false });
    }
        req.session.user ={
            id: findemail._id, 
            email:findemail .email,
        }
        return res.json({ success: true, message: "Login successful", isLogin: true });
    
    
    }
 catch (error) {
    console.error("Error during login process:", error);
    res.status(500).send("Server error");
}
}

const loadHomepage=async (req,res)=>{
    try{
      
        
        const isLogin = req.session.user? true:false
     return await res.render('home',{isLogin})
    }
    catch{
        console.log("HOME NOT FOUNT")
        res.status(500).send("srver error")
    }
}

const singup=async(req,res)=>{
    try{
        return await res.render('userSingup')
    }
    catch{
        console.log("HOME NOT FOUNT")
        res.status(500).send("srver error")
    }
}


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sentVerificationEmail(email,otp) {
    try {
        const transpoter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info=await transpoter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"veryfy your account",
            text:`your OTP is ${otp}`,
            html:`<b>your OTP is :${otp}</b>`
        })
        return info.accepted.length>0
    } catch (error) {
        console.log("HOME NOT FOUNT",error)
        return false; 
    }
    
}

const singupPOst=async(req,res)=>{
    
    try{
      const {email,password,Cpassword,username,phone}=req.body
      const Checkit = await User.findOne({ email: email });
         if(Checkit){
            return res.render('userSingup',{message:"user alredy existed try another one"})
            
         }
      
      if(password!=Cpassword){
        return res.render('userSingup',{message:"password not match"})
      }
      const findUser=await User.findOne({email})
      if(findUser){
        return res.render('userSingup',{message:"it already exist"})
      }
      const otp=generateOtp();
      const emailsent=await sentVerificationEmail(email,otp)
      
      if(!emailsent){
        return res.json({message:'email-error'}) 
      }
      req.session.userOtp=otp,
      req.session.userData={email,password,username,phone}
      res.render("otp")
      console.log("OTP is =",otp)
    }
    catch(error){
        console.log("signup error",error)
        res.redirect("/user/pageNotFound")
    }
}

const pageNotFound=async (req,res)=>{
    try{
     return await res.render('pageNotFound')
    }
    catch{
        console.log("HOME NOT FOUNT")
        res.status(500).send("srver error")
    }
}

const securePassword=async(password)=>{
    try{
       const passwordHash=await bcrypt.hash(password,10)
       return passwordHash;
    }
    catch{

    }
}

const verifyotp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Received OTP:", otp);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;

            // Check if the email is already registered
            const existingUser = await User.findOne({ email: user.email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "This email is already registered. Please log in or use a different email.",
                });
            }

            // Hash the password
            const passwordHash = await securePassword(user.password);

            // Save new user data
            const saveUserData = new User({
                username: user.username,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });

            await saveUserData.save();
         
 
            req.session.user = saveUserData._id; 
            const isLogin=true
            // Save the user ID in the session
            return res.json({ success: true, message: "User registered successfully!" ,isLogin});
        
            // res.redirect("/user/home")
        
        } else {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return res.status(500).json({ success: false, message: "An error occurred. Please try again later." });
    }
}

const resendOTP=async (req,res)=>{
    try{
        const {email}=req.session.userData
        
        const findUser=await User.findOne({email})
        if(findUser){
          return res.render('userSingup',{message:"it already exist"})
        }
        const otp=generateOtp();
        const emailsent=await sentVerificationEmail(email,otp)
        
        if(!emailsent){
          return res.json({message:'email-error'}) 
        }
        req.session.userOtp=otp,
        req.session.userData={email}
        res.render("otp")
        console.log("resent OTP is =",otp)
      }
      catch(error){
          console.log("signup error",error)
          res.redirect("/user/pageNotFound")
      }
}

const logout=async(req,res)=>{
    req.session.destroy((err) =>{
        if (err) {
            return res.status(500).send('Unable to log out.');
        }
    else{
        res.redirect("/user/home")
    }})
}


module.exports={
    loadHomepage,
    pageNotFound,
    login,
    loginpost,
    singup,
    singupPOst,
    verifyotp,
    logout,
    resendOTP
}