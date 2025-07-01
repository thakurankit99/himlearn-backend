const asyncErrorWrapper = require("express-async-handler")
const User = require("../Models/user");
const CustomError = require("../Helpers/error/CustomError");
const { sendToken } = require("../Helpers/auth/tokenHelpers");
const sendEmail = require("../Helpers/Libraries/sendEmail");
const { validateUserInput,comparePassword } = require("../Helpers/input/inputHelpers");

const getPrivateData = asyncErrorWrapper((req,res,next) =>{

    return res.status(200).json({
        success:true ,
        message : "You got access to the private data in this route ",
        user : req.user

    })

})

const register = asyncErrorWrapper (async  (req,res,next) => {

    const { username,email , password} = req.body  ;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        if (existingUser.isEmailVerified) {
            return next(new CustomError("An account with this email already exists. Please login instead.", 400));
        } else {
            // User exists but not verified - resend verification email
            const emailVerificationToken = existingUser.getEmailVerificationTokenFromUser();
            await existingUser.save();

            try {
                await sendVerificationEmail(existingUser, emailVerificationToken);
                return res.status(200).json({
                    success: true,
                    message: "Account already exists but not verified. A new verification email has been sent to your inbox."
                });
            } catch (error) {
                return next(new CustomError("Failed to send verification email. Please try again.", 500));
            }
        }
    }

    let newUser;
    try {
        newUser = await User.create({
            username,
            email,
            password
        });
    } catch (error) {
        if (error.code === 11000) {
            return next(new CustomError("An account with this email already exists.", 400));
        }
        throw error;
    }

    // Generate email verification token
    const emailVerificationToken = newUser.getEmailVerificationTokenFromUser();

    await newUser.save();

    // Send verification email with error handling
    try {
        await sendVerificationEmail(newUser, emailVerificationToken);

        return res.status(201).json({
            success: true,
            message: "Registration successful! Please check your email to verify your account before logging in."
        });
    } catch (error) {
        // If email fails, clean up the verification token but keep the user
        newUser.emailVerificationToken = undefined;
        newUser.emailVerificationExpire = undefined;
        await newUser.save();

        return next(new CustomError("Account created but verification email could not be sent. Please use the resend option on the login page.", 500));
    }

})

const login  = asyncErrorWrapper (async(req,res,next) => {

    const {email,password} = req.body

    if(!validateUserInput(email,password)) {

        return next(new CustomError("Please check your inputs",400))
    }

    const user = await User.findOne({email}).select("+password")

    if(!user) {

        return next(new CustomError("Invalid credentials",404))
    }

    if(!comparePassword(password,user.password)){
        return next(new CustomError("Please chech your credentails",404))
    }

    // Check if email is verified (bypass for admin)
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if(!user.isEmailVerified && !isAdmin) {
        return next(new CustomError("Please verify your email before logging in. Check your inbox for verification link.",401))
    }

    sendToken(user ,200,res)  ;

})




const forgotpassword  = asyncErrorWrapper( async (req,res,next) => {
    const {URI,EMAIL_USERNAME} = process.env ;

    const resetEmail = req.body.email  ;

    if (!resetEmail) {
        return next(new CustomError("Please provide an email address", 400));
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
        return next(new CustomError("Please provide a valid email address", 400));
    }

    const user = await User.findOne({email : resetEmail})

    if(!user ) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
        });
    }

    // Check if user's email is verified (bypass for admin)
    const isAdmin = user.email === process.env.ADMIN_EMAIL;
    if (!user.isEmailVerified && !isAdmin) {
        return next(new CustomError("Please verify your email address first before resetting password", 400));
    }

    // Rate limiting: Check if a reset email was sent recently (within 5 minutes)
    if (user.resetPasswordExpire && user.resetPasswordExpire > Date.now() - (5 * 60 * 1000)) {
        const timeLeft = Math.ceil((user.resetPasswordExpire - (Date.now() - (5 * 60 * 1000))) / 60000);
        return next(new CustomError(`Please wait ${timeLeft} minute(s) before requesting another password reset`, 429));
    }

    const resetPasswordToken = user.getResetPasswordTokenFromUser();

    await user.save()  ;

    const resetPasswordUrl = `${URI}/resetpassword?resetPasswordToken=${resetPasswordToken}`

    const emailTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header with Logo and Branding -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
            <div style="background-color: white; width: 60px; height: 60px; border-radius: 15px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">HimLearning</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0; font-size: 14px;">Your Learning Platform</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">Hello <strong>${user.username}</strong>,</p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;">We received a request to reset your password for your <strong>HimLearning</strong> account. No worries, it happens to the best of us!</p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="${resetPasswordUrl}"
                   style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); transition: all 0.3s ease;">
                   🔐 Reset My Password
                </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 25px 0 15px 0;">Or copy and paste this link in your browser:</p>
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 0 0 25px 0;">
                <p style="word-break: break-all; color: #6b7280; margin: 0; font-size: 13px; font-family: monospace;">${resetPasswordUrl}</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 500;">⏰ This link will expire in 1 hour for security reasons.</p>
            </div>

            <p style="color: #6b7280; line-height: 1.6; margin: 25px 0 0 0; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">HimLearning Team</p>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">Making learning accessible for everyone</p>
            </div>
        </div>
    </div>
    `;

    try {

        await sendEmail({
            from: EMAIL_USERNAME,
            to: resetEmail,
            subject: "🔐 Reset Your Password - Him Learning",
            html: emailTemplate
        })

        return res.status(200)
        .json({
            success: true,
            message: "Password reset email sent successfully! Please check your inbox."
        })

    }

    catch(error ) {

        user.resetPasswordToken = undefined ;
        user.resetPasswordExpire = undefined  ;

        await user.save();

        return next(new CustomError('Password reset email could not be sent. Please try again later.', 500))
    }

})


const resetpassword  =asyncErrorWrapper(  async (req,res,next) => {

    const newPassword = req.body.newPassword || req.body.password
    const confirmPassword = req.body.confirmPassword

    const {resetPasswordToken} = req.query

    if(!resetPasswordToken) {
        return next(new CustomError("Please provide a valid reset token", 400))
    }

    if (!newPassword) {
        return next(new CustomError("Please provide a new password", 400))
    }

    if (newPassword.length < 6) {
        return next(new CustomError("Password must be at least 6 characters long", 400))
    }

    if (confirmPassword && newPassword !== confirmPassword) {
        return next(new CustomError("Passwords do not match", 400))
    }

    // First check if token exists (regardless of expiration)
    const tokenUser = await User.findOne({ resetPasswordToken: resetPasswordToken });

    if (!tokenUser) {
        return next(new CustomError("Invalid reset token. Please request a new password reset.", 400))
    }

    // Check for valid, non-expired token
    const user = await User.findOne({
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    })

    if(!user) {
        // Token exists but is expired
        return next(new CustomError("Reset token has expired. Please request a new password reset.", 400))
    }

    // Update password
    user.password = newPassword ;
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save() ;

    return res.status(200).json({
        success: true,
        message: "Password reset successful! You can now log in with your new password."
    })

})

// Helper function to send verification email
const sendVerificationEmail = async (user, emailVerificationToken) => {
    const { URI, EMAIL_USERNAME } = process.env;

    const verificationUrl = `${URI}/verify-email?token=${emailVerificationToken}`;

    const emailTemplate = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header with Logo and Branding -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
            <div style="background-color: white; width: 60px; height: 60px; border-radius: 15px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">HimLearning</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 5px 0 0 0; font-size: 14px;">Your Learning Platform</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Welcome to HimLearning! 🎉</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">Hello <strong>${user.username}</strong>,</p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;">Thank you for joining <strong>HimLearning</strong>! We're excited to have you as part of our community of writers and learners. To complete your registration and start sharing your stories, please verify your email address.</p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationUrl}"
                   style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
                   ✅ Verify My Email Address
                </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 25px 0 15px 0;">Or copy and paste this link in your browser:</p>
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 0 0 25px 0;">
                <p style="word-break: break-all; color: #6b7280; margin: 0; font-size: 13px; font-family: monospace;">${verificationUrl}</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 500;">⏰ This verification link will expire in 24 hours.</p>
            </div>

            <!-- What's Next Section -->
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">What's next after verification?</h3>
                <ul style="color: #0369a1; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                    <li>Start writing and sharing your stories</li>
                    <li>Discover amazing content from other writers</li>
                    <li>Build your audience and connect with readers</li>
                    <li>Join our growing community of learners</li>
                </ul>
            </div>

            <p style="color: #6b7280; line-height: 1.6; margin: 25px 0 0 0; font-size: 14px;">If you didn't create an account with HimLearning, please ignore this email and no account will be created.</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">Welcome to the HimLearning Team! 🚀</p>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">Making learning accessible for everyone</p>
            </div>
        </div>
    </div>
    `;

    await sendEmail({
        from: EMAIL_USERNAME,
        to: user.email,
        subject: "✔ Verify Your Email Address - Him Learning",
        html: emailTemplate
    });
};

const verifyEmail = asyncErrorWrapper(async (req, res, next) => {
    const { token } = req.query;

    if (!token) {
        return next(new CustomError("Please provide a valid verification token", 400));
    }

    // First check if user exists with this token (regardless of expiration)
    const userWithToken = await User.findOne({ emailVerificationToken: token });

    if (userWithToken && userWithToken.isEmailVerified) {
        return res.status(200).json({
            success: true,
            message: "Email is already verified! You can log in to your account."
        });
    }

    // Check for valid, non-expired token
    const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
        // Check if token exists but is expired
        const expiredUser = await User.findOne({ emailVerificationToken: token });
        if (expiredUser) {
            return next(new CustomError("Verification link has expired. Please request a new verification email.", 400));
        }
        return next(new CustomError("Invalid verification token. Please check your email for the correct link.", 400));
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Email verified successfully! You can now log in to your account."
    });
});

const resendVerificationEmail = asyncErrorWrapper(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new CustomError("Please provide an email address", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new CustomError("No user found with this email address", 404));
    }

    if (user.isEmailVerified) {
        return next(new CustomError("Email is already verified", 400));
    }

    // Rate limiting: Check if a verification email was sent recently (within 2 minutes)
    if (user.emailVerificationExpire && user.emailVerificationExpire > Date.now() - (2 * 60 * 1000)) {
        const timeLeft = Math.ceil((user.emailVerificationExpire - (Date.now() - (2 * 60 * 1000))) / 60000);
        return next(new CustomError(`Please wait ${timeLeft} minute(s) before requesting another verification email`, 429));
    }

    // Generate new verification token
    const emailVerificationToken = user.getEmailVerificationTokenFromUser();
    await user.save();

    // Send verification email
    try {
        await sendVerificationEmail(user, emailVerificationToken);

        return res.status(200).json({
            success: true,
            message: "Verification email sent successfully! Please check your inbox."
        });
    } catch (error) {
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();

        return next(new CustomError("Email could not be sent", 500));
    }
});


module.exports ={
    register,
    login,
    resetpassword,
    forgotpassword,
    getPrivateData,
    verifyEmail,
    resendVerificationEmail
}