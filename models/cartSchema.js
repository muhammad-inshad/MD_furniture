const mongoose=require("mongoose");
const product = require("./productSchema");
const {Schema}=mongoose;

const cartSchema=new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    items:[{
      _id:false,
     productId:{
        type:Schema.Types.ObjectId,
        ref:'product',
        required:true
     },
     quantity:{
        type:Number,
        default:1
     },
    }]
,versionKey:{
    type:Number,
    default:1 }
});
const Cart=mongoose.model("Cart",cartSchema)
module.exports=Cart