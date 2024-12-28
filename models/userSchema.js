const { name } = require("ejs");
const mongoose=require("mongoose");
const {Schema}=mongoose;

const userSchema=new Schema({
    username:{
        type:String,
        require:true
    },
        email:{
            type:String,
            required:true,
            unique:true
        },
        phone:{
            type:String,
            required:false,
            unique:false,
            sparse:true,
            default:null
        },
        googleId:{
            type:String,
            unique:true,
            sparse:true,
            default:undefined
        },
        password:{
            type:String,
            required:false
        },
        isBlocked:{
            type:Boolean,
            default:false
        },
        isAdmin:{
            type:Boolean,
            default:false
        },
        cart:[{
            type:Schema.Types.ObjectId,
             ref:"cart"
        }],
        wallet:{
            type:Number,
            default:0
        },
        wishlist:[{
            type:Schema.Types.ObjectId,
            ref:"wishlist"
        }],
        orderHistory:[{
            type:Schema.Types.ObjectId,
            ref:"order"
        }],
        createdOn:{
            type:Date,
            default:Date.now
        },
        referalCode:{
            type:String,
           // required:true
        },
        redeemed:{
            type:Boolean,
           // default:false
        },
        redeemedUsers:[{
            type:Schema.Types.ObjectId,
            ref:"user",
            //required:true
        }],
        searchHistory:[{
            category:{
                type:Schema.Types.ObjectId,
                ref:"category"
            },
            brand:{
                type:String
            },
            searchOn:{
                type:Date,
                default:Date.now
            }
        }]
    
})

const user=mongoose.model("User",userSchema)

module.exports=user