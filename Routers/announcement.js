const express = require('express');
const router = express.Router();

const {
    getAllAnnouncements,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} = require('../Controllers/announcement');

const { getOptionalAccessToRoute, getAccessToRoute } = require('../Middlewares/Authorization/auth');

// Public routes (with optional auth for read status)
router.get('/', getOptionalAccessToRoute, getAllAnnouncements);

// Protected routes (require authentication)
router.get('/unread-count', getAccessToRoute, getUnreadCount);
router.post('/:id/mark-read', getAccessToRoute, markAsRead);
router.post('/mark-all-read', getAccessToRoute, markAllAsRead);

module.exports = router;
