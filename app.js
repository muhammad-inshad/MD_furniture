const express=require("express");
const app=express()
const path=require("path")
const env=require("dotenv").config();
const db=require("./config/db");
const session=require("express-session")
const userRouter=require("./router/userRouter")
const adminRouter=require("./router/adminRouter")
const Swal = require('sweetalert2');

db()

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
    }
}))

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")))


app.use("/user",userRouter);
app.use('/admin',adminRouter);


app.listen(process.env.PORT,()=>{
    console.log("server running")
})

module.exports=app
