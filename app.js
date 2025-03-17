const express=require("express");
const app=express()
const path=require("path")
const env=require("dotenv").config();
const db=require("./config/db");
const session=require("express-session")
const userRouter=require("./router/userRouter")
const adminRouter=require("./router/adminRouter")
const Swal = require('sweetalert2');
const nocache = require("nocache");
const passport=require("./config/passport")
const pymentRoute=require("./router/paymentRouter")
const MongoStore = require("connect-mongo");
const crypto = require("crypto");
const Order = require("./models/orderSchema");
const GoogleStrategy = require('passport-google-oauth20').Strategy;



db()

app.use(nocache());

app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*100
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI, 
        collectionName: "sessions", 
    }),
}))

passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://ec2-16-170-146-245.eu-north-1.compute.amazonaws.com/user/auth/google/callback", // Must match Google Console
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            return done(null, user);
          } else {
            user = new User({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
            });
            await user.save();
            return done(null, user);
          }
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  
app.use(passport.initialize());
app.use(passport.session());


app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")))


app.use("/user",userRouter);
app.use('/admin',adminRouter);


//Inside app.js
app.post('/verifyOrder', async (req, res)=>{ 
    
    // STEP 7: Receive Payment Data
    const {razorpay_order_id, razorpay_payment_id,orderId} = req.body;     
    const razorpay_signature =  req.body.razorpay_signature;

    // Pass yours key_secret here
    const key_secret = '9wZDRCYPwn0qXq3ze0GOFEq0';     
console.log(orderId,'orderId');

    // STEP 8: Verification & Send Response to User
    // Creating hmac object 
    let hmac = crypto.createHmac('sha256', key_secret); 

    // Passing the data to be hashed
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    
    // Creating the hmac in the required format
    const generated_signature = hmac.digest('hex');
    
    
    if(razorpay_signature===generated_signature){
    await Order.findByIdAndUpdate(orderId,{$set:{status:'paid'}})
        res.json({success:true, message:"Payment has been verified"})
    }
    else{
    await Order.findByIdAndUpdate(orderId,{$set:{status:'failed'}})
 
    res.json({success:false, message:"Payment verification failed"})
    }
});


// app.use('/razorpay',pymentRoute)

app.listen(process.env.PORT,()=>{
    console.log("server running")
})

module.exports=app
