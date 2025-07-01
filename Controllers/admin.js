const asyncErrorWrapper = require("express-async-handler");
const User = require("../Models/user");
const Story = require("../Models/story");
const Comment = require("../Models/comment");
const CustomError = require("../Helpers/error/CustomError");
const { searchHelper, paginateHelper } = require("../Helpers/query/queryHelpers");
const { getVideoThumbnail, isVideoUrl } = require("../Helpers/Libraries/cloudinaryUpload");

// Get all users with pagination and search
const getAllUsers = asyncErrorWrapper(async (req, res, next) => {
    let query = User.find().select("-password");

    // Search functionality
    query = searchHelper("username", query, req);

    // Pagination
    const paginationResult = await paginateHelper(User, query, req);
    query = paginationResult.query;

    // Sort by creation date (newest first)
    query = query.sort("-createdAt");

    const users = await query;

    return res.status(200).json({
        success: true,
        count: users.length,
        data: users,
        page: paginationResult.page,
        pages: paginationResult.pages
    });
});

// Get single user by ID
const getUserById = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
        return next(new CustomError("User not found", 404));
    }

    // Get user's stories count
    const storiesCount = await Story.countDocuments({ author: id });
    
    // Get user's comments count
    const commentsCount = await Comment.countDocuments({ author: id });

    return res.status(200).json({
        success: true,
        data: {
            ...user.toObject(),
            storiesCount,
            commentsCount
        }
    });
});

// Create new user (Admin only)
const createUser = asyncErrorWrapper(async (req, res, next) => {
    const { username, email, password, role = "user" } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new CustomError("User with this email already exists", 400));
    }

    const newUser = await User.create({
        username,
        email,
        password,
        role
    });

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: userResponse
    });
});

// Update user (Admin only)
const updateUser = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;
    const { username, email, role } = req.body;

    const user = await User.findById(id);

    if (!user) {
        return next(new CustomError("User not found", 404));
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new CustomError("User with this email already exists", 400));
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        id,
        { username, email, role },
        { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: updatedUser
    });
});

// Delete user (Admin only)
const deleteUser = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        return next(new CustomError("User not found", 404));
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
        return next(new CustomError("You cannot delete your own account", 400));
    }

    // Delete user's stories and comments
    await Story.deleteMany({ author: id });
    await Comment.deleteMany({ author: id });

    // Delete the user
    await User.findByIdAndDelete(id);

    return res.status(200).json({
        success: true,
        message: "User and associated content deleted successfully"
    });
});

// Get platform statistics
const getPlatformStats = asyncErrorWrapper(async (req, res, next) => {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalStories = await Story.countDocuments();
    const totalComments = await Comment.countDocuments();

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ 
        createdAt: { $gte: thirtyDaysAgo } 
    });

    // Get recent stories (last 30 days)
    const recentStories = await Story.countDocuments({ 
        createdAt: { $gte: thirtyDaysAgo } 
    });

    return res.status(200).json({
        success: true,
        data: {
            totalUsers,
            totalAdmins,
            totalStories,
            totalComments,
            recentUsers,
            recentStories
        }
    });
});

// Get all stories with pagination and search
const getAllStories = asyncErrorWrapper(async (req, res, next) => {
    let query = Story.find().populate('author', 'username email');

    // Search functionality
    query = searchHelper("title", query, req);

    // Pagination
    const paginationResult = await paginateHelper(Story, query, req);
    query = paginationResult.query;

    // Sort by creation date (newest first)
    query = query.sort("-createdAt");

    const stories = await query;

    return res.status(200).json({
        success: true,
        count: stories.length,
        data: stories,
        page: paginationResult.page,
        pages: paginationResult.pages
    });
});

// Get single story by ID
const getStoryById = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;

    const story = await Story.findById(id)
        .populate('author', 'username email photo')
        .populate('comments');

    if (!story) {
        return next(new CustomError("Story not found", 404));
    }

    return res.status(200).json({
        success: true,
        data: story
    });
});

// Delete story (Admin only)
const deleteStory = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;

    const story = await Story.findById(id);

    if (!story) {
        return next(new CustomError("Story not found", 404));
    }

    // Delete story's comments
    await Comment.deleteMany({ story: id });

    // Remove story from users' reading lists
    await User.updateMany(
        { readList: id },
        { $pull: { readList: id } }
    );

    // Delete the story
    await Story.findByIdAndDelete(id);

    return res.status(200).json({
        success: true,
        message: "Story and associated content deleted successfully"
    });
});

// Get story for editing (Admin only)
const getStoryForEdit = asyncErrorWrapper(async (req, res, next) => {
    const { slug } = req.params;

    const story = await Story.findOne({ slug: slug });

    if (!story) {
        return next(new CustomError("Story not found", 404));
    }

    return res.status(200).json({
        success: true,
        data: story
    });
});

// Update story (Admin only)
const updateStory = asyncErrorWrapper(async (req, res, next) => {
    const { slug } = req.params;
    const { title, content, image, previousImage, privacy } = req.body;

    const story = await Story.findOne({ slug: slug });

    if (!story) {
        return next(new CustomError("Story not found", 404));
    }

    story.title = title;
    story.content = content;
    story.image = req.savedStoryImage;

    // Update privacy if provided
    if (privacy && ["public", "user", "private"].includes(privacy)) {
        story.privacy = privacy;
    }

    // Handle media update
    if (req.file && req.file.path) {
        // New media uploaded to Cloudinary
        story.image = req.file.path;

        // Check if it's a video
        if (req.file.mimetype && req.file.mimetype.startsWith('video/')) {
            story.mediaType = 'video';

            // Generate video thumbnail
            const thumbnailUrl = getVideoThumbnail(req.file.path);
            if (thumbnailUrl) {
                story.videoThumbnail = thumbnailUrl;
            }

            story.videoDuration = 0; // Will be updated later
        } else {
            story.mediaType = 'image';
            story.videoThumbnail = null;
            story.videoDuration = null;
        }
    } else if (image) {
        // Keep existing media URL
        story.image = image;
    }

    await story.save();

    return res.status(200).json({
        success: true,
        data: story
    });
});

module.exports = {
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
};
