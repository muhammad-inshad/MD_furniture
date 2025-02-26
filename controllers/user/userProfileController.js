const { render } = require('../../app');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');
const user = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const { session } = require('passport');
const bcrypt = require("bcrypt")
const Cart = require("../../models/cartSchema")
const Order = require("../../models/orderSchema")
const Wishlist = require("../../models/wishlistSchema")
const Coupon = require("../../models/coupnSchema")
const Razorpay=require("razorpay")



const profile = async (req, res) => {
    try {
        const id = req.session.user.id
        if (id) {


            const findUser = await user.findById(id)
            const userAddresses = await Address.findOne({ userId: id });
            const addresses = userAddresses ? userAddresses.address : [];
            if (req.session && req.session.user) {
                userId = req.session.user.id;
                isLogin = true;
        
                const userCart = await Cart.findOne({ userId });
                cartCount = userCart ? userCart.items.length : 0;
        
                const wishlist = await Wishlist.findOne({ userId });
                countWishlist = wishlist ? wishlist.products.length : 0;
        
                // Store wishlist product IDs for easy checking
                if (wishlist) {
                    wishlistProductIds = wishlist.products.map(p => p.productId.toString());
                }
            }
            return res.render("userProfile", { findUser, addresses, isLogin: true,cartCount })
        }
    } catch (error) {
        res.render("pageNotFound")
        console.log("form  profile get error---------------", error)
    }
}

const address = async (req, res) => {
    try {

        const id = req.session.user.id
        if (id) {
            const findUser = await user.findById(id)
            const userAddresses = await Address.findOne({ userId: id });
            const addresses = userAddresses ? userAddresses.address : [];
            return res.render("addres", { findUser, addresses, isLogin: true })
        }
    } catch (error) {
        res.render("pageNotFound")
        console.log("form  address get error---------------", error)
    }
}

const add_address = async (req, res) => {
    try {
        const id = req.session.user.id
        const findUser = await user.findById(id)
        return res.render("add_address", { findUser })
    }
    catch (error) {
        res.render("pageNotFound")
        console.log("form  add_address get error---------------", error)
    }
}



const post_add_address = async (req, res) => {
    try {

        // Extract user ID and address data from the request
        const userId = req.session.user.id;
        const { name, city, landmark, state, pincode, phone } = req.body;
        const newAddress = {
            addressType: "Home", // You can change this based on the context
            name: name,
            City: city, // Make sure to match schema field name exactly ("City")
            landMark: landmark,
            state: state,
            pincode: pincode,
            phone: phone,
        };

        // Find the user document and add the new address
        const userAddress = await Address.findOne({ userId });

        if (userAddress) {
            // If the user already has an address array, push the new address to it
            userAddress.address.push(newAddress);
            await userAddress.save();
        } else {
            // If the user doesn't have any addresses, create a new Address document
            const newAddressDoc = new Address({
                userId,
                address: [newAddress], // Wrap the new address in an array
            });
            await newAddressDoc.save();

        }

        // Send a success response
        return res.status(200).json({ success: true, message: 'Address added successfully' });

    } catch (error) {
        // Handle errors gracefully
        console.error("Error in post_add_address:", error);
        return res.status(500).json({ success: false, message: 'An error occurred while adding the address' });
    }
};
const editeprofile = async (req, res) => {
    try {
        const id = req.session.user.id
        const findUser = await user.findById(id)
        return res.render("editProfile", { findUser });
    } catch (error) {
        res.render("pageNotFound")
        console.log("form  editeprofile get error---------------", error)
    }
}

const edit_address = async (req, res) => {
    try {
        const userId = req.session.user?.id;
        const addressId = req.params.id;

        if (userId) {
            const userAddress = await Address.findOne({ userId });

            if (!userAddress) {
                return res.status(404).render("pageNotFound");
            }

            const address = userAddress.address.find(addr => addr._id.toString() === addressId);

            if (!address) {
                return res.status(404).render("pageNotFound");
            }
            res.render("edit_address", { address, addressId });
        } else {
            res.redirect("/user/home");
        }
    } catch (error) {
        res.render("pageNotFound");
        console.log("Error in edit_address handler:", error);
    }
};

const postedit_address = async (req, res) => {
    try {
        const { name, City, addressType, landmark, state, pincode, phone, addressId } = req.body;
        const userId = req.session.user.id;


        if (!City || !addressType) {
            return res.status(400).json({ success: false, message: "City and addressType are required." });
        }

        // Find the user and their addresses
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const addressIndex = userAddress.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        userAddress.address[addressIndex] = {
            ...userAddress.address[addressIndex], // Retain existing values
            name,
            City,
            addressType,
            landMark: landmark,
            state,
            pincode,
            phone,
        };

        // Save the updated address
        await userAddress.save();
        res.json({ success: true, message: "Address updated successfully" });
    } catch (error) {
        console.log("Error in postedit_address handler:", error);
        res.status(500).json({ success: false, message: "An error occurred while updating the address" });
    }
};





const PostEditeprofile = async (req, res) => {
    const userId = req.params.id
    const { username, email, phone, password } = req.body;

    try {
        if (!username || !email || !phone) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }
        const updatedUser = await user.findByIdAndUpdate(
            userId, {
                $set: {
                    username, // Update username
                    email,    // Update email
                    phone,    // Update phone
                    password: hashedPassword || undefined,
                }
        },
            { new: true, omitUndefined: true })
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({ success: true, message: 'Profile updated successfully.', updatedUser });
    }
    catch (error) {
        res.render("pageNotFound")
        console.log("form  postediteprofile get error---------------", error)
    }
}
const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.json({ success: false, message: 'User addresses not found.' });
        }

        const addressIndex = userAddress.address.findIndex(
            (addr) => addr._id.toString() === id
        );
        if (addressIndex === -1) {
            return res.json({ success: false, message: 'Address not found.' });
        }
        userAddress.address.splice(addressIndex, 1);

        await userAddress.save();

        return res.json({ success: true, message: 'Address deleted successfully.' });
    } catch (error) {
        console.error("Error in deleteAddress:", error);
        res.status(500).render("pageNotFound");
    }
};

module.exports={
    profile,
    address,
    add_address,
    post_add_address,
    editeprofile,
    edit_address,
    postedit_address,
    PostEditeprofile,
    deleteAddress
}