const mongoose=require("mongoose")
const env=require("dotenv").config();


const connectDb=()=>{
    try {
        mongoose.connect(process.env.MONGODB_URI)
        console.log("DB connected")
    } catch (error) {
        console.log("DB not connected ",error)
        process.exit(1)
    }
}
module.exports=connectDb;