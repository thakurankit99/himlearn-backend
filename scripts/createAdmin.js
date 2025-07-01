const mongoose = require("mongoose");
const User = require("../Models/user");
require("dotenv").config({ path: "./Config/config.env" });

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log("Connected to MongoDB");

        // Check if admin already exists
        const adminEmail = process.env.ADMIN_EMAIL;
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log("Admin user already exists!");
            console.log("Email:", adminEmail);
            console.log("Username:", existingAdmin.username);
            console.log("Role:", existingAdmin.role);
            console.log("Email Verified:", existingAdmin.isEmailVerified);

            // Update admin to be email verified if not already
            if (!existingAdmin.isEmailVerified) {
                existingAdmin.isEmailVerified = true;
                await existingAdmin.save();
                console.log("✅ Updated admin email verification status to true");
            }

            process.exit(0);
        }

        // Create admin user
        const adminUser = await User.create({
            username: process.env.ADMIN_USERNAME,
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            role: "admin",
            isEmailVerified: true  // Admin doesn't need email verification
        });

        console.log("Admin user created successfully!");
        console.log("Email:", process.env.ADMIN_EMAIL);
        console.log("Password:", process.env.ADMIN_PASSWORD);
        console.log("Username:", adminUser.username);
        console.log("Role:", adminUser.role);

        process.exit(0);
    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exit(1);
    }
};

createAdminUser();
