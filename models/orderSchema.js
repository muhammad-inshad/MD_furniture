const mongoose=require("mongoose")
const {Schema}=mongoose;
const{v4:uuidv4}=require('uuid');
const product = require("./productSchema");
const { text } = require("express");

const orderSchema=new Schema({
    orderId: {
        type: String,
        default: uuidv4,
        unique: true
    },

    userId: {
        type:mongoose.Types.ObjectId,
        required:true,
    },

    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'Processing', 'shipped', "Delivered", "Cancelled", "Returned","paid","failed","ReturnRequst","Rejected"]
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    paymentType:{
       type:String,
    },
    orderExpectedDate:{
        type:Date
    },
    cancelReson:{
        type:String
    },
   ReturnReson:{
    type:String
   },
   couponRemoved:{
    type:Boolean,
    default:false
   }
})

const Order=mongoose.model("Order",orderSchema);
module.exports=Order