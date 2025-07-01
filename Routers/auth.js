const express = require("express")

const {register,login,forgotpassword,resetpassword,getPrivateData,verifyEmail,resendVerificationEmail} = require("../Controllers/auth");

const { getAccessToRoute } = require("../Middlewares/Authorization/auth");

const router = express.Router() ;


router.post("/register",register)

router.post("/login",login)

router.post("/forgotpassword",forgotpassword)

router.put("/resetpassword",resetpassword)

router.get("/verify-email",verifyEmail)

router.post("/resend-verification",resendVerificationEmail)

router.get("/private",getAccessToRoute,getPrivateData)


module.exports = router