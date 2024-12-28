const mongoose=require("mongoose");
const product = require("./productSchema");
const {Schema}=mongoose;

const  wishlistSchema=new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"Uer",
        required:true,
    },
    products:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        addedOn:{
            type:Date,
            default:Date.now
        }
    }]
})

const wishlist=mongoose.model('Wishlist',wishlistSchema)
module.exports=wishlist;