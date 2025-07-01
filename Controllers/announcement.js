const Announcement = require('../Models/announcement');
const asyncErrorWrapper = require('express-async-handler');
const CustomError = require('../Helpers/error/CustomError');
const { searchHelper, paginateHelper } = require('../Helpers/query/queryHelpers');

// Get all announcements for users
const getAllAnnouncements = asyncErrorWrapper(async (req, res, next) => {
    const userId = req.user ? req.user._id : null;
    const isAuthenticated = !!userId;

    // Get active announcements
    let announcements = await Announcement.getActiveAnnouncements();

    // Filter announcements based on visibility and user authentication
    announcements = announcements.filter(announcement => {
        if (announcement.visibility === 'public') {
            return true; // Public announcements visible to everyone
        } else if (announcement.visibility === 'users') {
            return isAuthenticated; // User-only announcements visible only to logged-in users
        }
        return false;
    });

    // Add read status for authenticated users
    const announcementsWithReadStatus = announcements.map(announcement => {
        const announcementObj = announcement.toObject();
        if (userId) {
            announcementObj.isRead = announcement.isReadByUser(userId);
        } else {
            announcementObj.isRead = false;
        }
        return announcementObj;
    });

    return res.status(200).json({
        success: true,
        count: announcementsWithReadStatus.length,
        data: announcementsWithReadStatus
    });
});

// Get unread announcements count for user
const getUnreadCount = asyncErrorWrapper(async (req, res, next) => {
    if (!req.user) {
        return res.status(200).json({
            success: true,
            count: 0
        });
    }

    const announcements = await Announcement.getActiveAnnouncements();

    // Filter announcements based on visibility (user is authenticated, so they can see both public and user-only)
    const visibleAnnouncements = announcements.filter(announcement =>
        announcement.visibility === 'public' || announcement.visibility === 'users'
    );

    const unreadCount = visibleAnnouncements.filter(announcement =>
        !announcement.isReadByUser(req.user._id)
    ).length;

    return res.status(200).json({
        success: true,
        count: unreadCount
    });
});

// Mark announcement as read
const markAsRead = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    
    const announcement = await Announcement.findById(id);
    
    if (!announcement) {
        return next(new CustomError('Announcement not found', 404));
    }
    
    await announcement.markAsRead(userId);
    
    return res.status(200).json({
        success: true,
        message: 'Announcement marked as read'
    });
});

// Mark all announcements as read
const markAllAsRead = asyncErrorWrapper(async (req, res, next) => {
    const userId = req.user._id;
    
    const announcements = await Announcement.getActiveAnnouncements();
    
    for (const announcement of announcements) {
        if (!announcement.isReadByUser(userId)) {
            await announcement.markAsRead(userId);
        }
    }
    
    return res.status(200).json({
        success: true,
        message: 'All announcements marked as read'
    });
});

// Admin: Get all announcements with pagination
const adminGetAllAnnouncements = asyncErrorWrapper(async (req, res, next) => {
    let query = Announcement.find().populate('author', 'username email');
    
    // Search functionality
    if (req.query.search) {
        query = query.find({
            $or: [
                { title: { $regex: req.query.search, $options: 'i' } },
                { content: { $regex: req.query.search, $options: 'i' } }
            ]
        });
    }
    
    // Filter by status
    if (req.query.status) {
        if (req.query.status === 'active') {
            query = query.find({ isActive: true });
        } else if (req.query.status === 'inactive') {
            query = query.find({ isActive: false });
        }
    }
    
    // Pagination
    const paginationResult = await paginateHelper(Announcement, query, req);
    query = paginationResult.query;
    
    // Sort by creation date (newest first)
    query = query.sort('-createdAt');
    
    const announcements = await query;
    
    return res.status(200).json({
        success: true,
        count: announcements.length,
        data: announcements,
        page: paginationResult.page,
        pages: paginationResult.pages
    });
});

// Admin: Create announcement
const createAnnouncement = asyncErrorWrapper(async (req, res, next) => {
    const { title, content, visibility, expiresAt, expiresTime } = req.body;

    const announcement = await Announcement.create({
        title,
        content,
        visibility: visibility || 'public',
        expiresAt: expiresAt || null,
        expiresTime: expiresTime || "23:59",
        author: req.user._id
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
        .populate('author', 'username email');

    return res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: populatedAnnouncement
    });
});

// Admin: Update announcement
const updateAnnouncement = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;
    const { title, content, visibility, isActive, expiresAt, expiresTime } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
        id,
        { title, content, visibility, isActive, expiresAt, expiresTime },
        { new: true, runValidators: true }
    ).populate('author', 'username email');

    if (!announcement) {
        return next(new CustomError('Announcement not found', 404));
    }

    return res.status(200).json({
        success: true,
        message: 'Announcement updated successfully',
        data: announcement
    });
});

// Admin: Delete announcement
const deleteAnnouncement = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;
    
    const announcement = await Announcement.findByIdAndDelete(id);
    
    if (!announcement) {
        return next(new CustomError('Announcement not found', 404));
    }
    
    return res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully'
    });
});

// Admin: Get announcement analytics
const getAnnouncementAnalytics = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;
    
    const announcement = await Announcement.findById(id)
        .populate('author', 'username email')
        .populate('readBy.user', 'username email');
    
    if (!announcement) {
        return next(new CustomError('Announcement not found', 404));
    }
    
    return res.status(200).json({
        success: true,
        data: {
            announcement,
            analytics: {
                totalReads: announcement.totalReads,
                readByUsers: announcement.readBy
            }
        }
    });
});

module.exports = {
    getAllAnnouncements,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    adminGetAllAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementAnalytics
};
