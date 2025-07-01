const express = require("express")
const { cloudinaryUpload } = require("../Helpers/Libraries/cloudinaryUpload");
const CustomError = require("../Helpers/error/CustomError");

const { getAccessToRoute, getOptionalAccessToRoute } = require("../Middlewares/Authorization/auth");
const {addStory,getAllStories,detailStory,likeStory, editStory, deleteStory, editStoryPage } = require("../Controllers/story")
const { checkStoryExist, checkUserAndStoryExist } = require("../Middlewares/database/databaseErrorhandler");

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.log('Multer error:', err);

        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError('File size too large. Maximum 200MB allowed for videos, 10MB for images.', 400));
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new CustomError('Unexpected file field. Please use the correct file input.', 400));
        }

        if (err.message && err.message.includes('File size too large')) {
            return next(new CustomError(err.message, 400));
        }

        return next(new CustomError('File upload error: ' + err.message, 400));
    }
    next();
};

const router = express.Router() ;

router.post("/addstory" ,[getAccessToRoute, cloudinaryUpload.single("image"), handleMulterError],addStory)


router.post("/:slug", getOptionalAccessToRoute, checkStoryExist, detailStory)

router.post("/:slug/like",[getAccessToRoute,checkStoryExist] ,likeStory)

router.get("/editStory/:slug",[getAccessToRoute,checkStoryExist,checkUserAndStoryExist] , editStoryPage)

router.put("/:slug/edit",[getAccessToRoute,checkStoryExist,checkUserAndStoryExist, cloudinaryUpload.single("image"), handleMulterError] ,editStory)

router.delete("/:slug/delete",[getAccessToRoute,checkStoryExist,checkUserAndStoryExist] ,deleteStory)

router.get("/getAllStories", getOptionalAccessToRoute, getAllStories)


module.exports = router