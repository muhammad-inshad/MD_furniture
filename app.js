const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const db = require("./config/db");
const session = require("express-session");
const userRouter = require("./router/userRouter");
const adminRouter = require("./router/adminRouter");
const Swal = require('sweetalert2');
const nocache = require("nocache");
const passport = require("./config/passport");
const MongoStore = require("connect-mongo");
const crypto = require("crypto");
const Order = require("./models/orderSchema");
const User = require("./models/userSchema");

db();

app.use(nocache());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 72 * 60 * 60 * 100 },
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: "sessions" }),
}));

app.use(passport.initialize());
app.use(passport.session());

app.get("/test", (req, res) => {
    res.send("Test route working");
});
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, "public")));
app.use("/user", userRouter);
app.use("/admin", adminRouter);

app.post('/verifyOrder', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, orderId } = req.body;
    const razorpay_signature = req.body.razorpay_signature;
    const key_secret = '9wZDRCYPwn0qXq3ze0GOFEq0';
    console.log(orderId, 'orderId');

    let hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (razorpay_signature === generated_signature) {
        await Order.findByIdAndUpdate(orderId, { $set: { status: 'paid' } });
        res.json({ success: true, message: "Payment has been verified" });
    } else {
        await Order.findByIdAndUpdate(orderId, { $set: { status: 'failed' } });
        res.json({ success: false, message: "Payment verification failed" });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

module.exports = app;