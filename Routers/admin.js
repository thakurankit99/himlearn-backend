const express = require("express");
const { getAccessToRoute } = require("../Middlewares/Authorization/auth");
const { getAdminAccess } = require("../Middlewares/Authorization/adminAuth");
const { cloudinaryUpload } = require("../Helpers/Libraries/cloudinaryUpload");
const CustomError = require("../Helpers/error/CustomError");

// Multer error handling middleware for admin routes
const handleMulterError = (err, req, res, next) => {
    if (err) {
        console.log('Admin multer error:', err);

        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError('File size too large. Maximum 200MB allowed for videos, 10MB for images.', 400));
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new CustomError('Unexpected file field. Please use the correct file input.', 400));
        }

        return next(new CustomError('File upload error: ' + err.message, 400));
    }
    next();
};
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getPlatformStats,
    getAllStories,
    getStoryById,
    deleteStory,
    getStoryForEdit,
    updateStory
} = require("../Controllers/admin");

const {
    adminGetAllAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementAnalytics
} = require("../Controllers/announcement");

const router = express.Router();

// All admin routes require authentication and admin access
router.use([getAccessToRoute, getAdminAccess]);

// Platform statistics
router.get("/stats", getPlatformStats);

// User management routes
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Story management routes
router.get("/stories", getAllStories);
router.get("/stories/:id", getStoryById);
router.delete("/stories/:id", deleteStory);

// Admin story editing routes
router.get("/editStory/:slug", getStoryForEdit);
router.put("/stories/:slug/edit", [cloudinaryUpload.single("image"), handleMulterError], updateStory);

// Announcement management routes
router.get("/announcements", adminGetAllAnnouncements);
router.post("/announcements", createAnnouncement);
router.put("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);
router.get("/announcements/:id/analytics", getAnnouncementAnalytics);

module.exports = router;
