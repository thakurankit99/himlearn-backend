const express = require("express")

const { cloudinaryUpload } = require("../Helpers/Libraries/cloudinaryUpload");
const CustomError = require("../Helpers/error/CustomError");

// Multer error handling middleware for user routes
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.log('User profile multer error:', err);

        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError('Profile photo size too large. Maximum 10MB allowed.', 400));
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new CustomError('Unexpected file field. Please use the correct photo input.', 400));
        }

        return next(new CustomError('Photo upload error: ' + err.message, 400));
    }
    next();
};

const {profile,editProfile,changePassword,addStoryToReadList,readListPage} = require("../Controllers/user");
const { getAccessToRoute } = require("../Middlewares/Authorization/auth");


const router = express.Router() ;

router.get("/profile",getAccessToRoute ,profile)

router.post("/editProfile",[getAccessToRoute ,cloudinaryUpload.single("photo"), handleMulterError],editProfile)

router.put("/changePassword",getAccessToRoute,changePassword)

router.post("/:slug/addStoryToReadList",getAccessToRoute ,addStoryToReadList)

router.get("/readList",getAccessToRoute ,readListPage)



module.exports = router