const mongoose = require("mongoose");
require("dotenv").config(); // No need to assign it to a variable

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            tlsAllowInvalidCertificates: true // Helps with SSL issues
        });
        console.log("✅ DB connected successfully");
    } catch (error) {
        console.error("❌ DB connection failed:", error);
        process.exit(1);
    }
};

module.exports = connectDb;
