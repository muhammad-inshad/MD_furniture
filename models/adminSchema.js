const { name } = require("ejs");
const mongoose=require("mongoose");
const {Schema}=mongoose;

const adminSchema=new Schema({
    username:{
        type:String,
        require:true
    },
    password:{
        type:String,
        require:true
    }
       
})

const Admin=mongoose.model("admin",adminSchema)

module.exports=Admin