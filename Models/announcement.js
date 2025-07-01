const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide announcement title'],
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Please provide announcement content'],
        maxlength: [2000, 'Content cannot be more than 2000 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    visibility: {
        type: String,
        enum: ['public', 'users'], // public = everyone can see, users = only registered users can see
        default: 'public'
    },
    expiresAt: {
        type: Date,
        default: null // null means no expiration
    },
    expiresTime: {
        type: String, // Format: "HH:MM" (24-hour format)
        default: "23:59"
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    readBy: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    totalReads: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for better query performance
AnnouncementSchema.index({ isActive: 1, createdAt: -1 });
AnnouncementSchema.index({ expiresAt: 1 });

// Virtual for checking if announcement is expired
AnnouncementSchema.virtual('isExpired').get(function() {
    if (!this.expiresAt) return false;

    const now = new Date();
    const expirationDate = new Date(this.expiresAt);

    // If expiration time is set, combine date and time
    if (this.expiresTime) {
        const [hours, minutes] = this.expiresTime.split(':');
        expirationDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
        // Default to end of day
        expirationDate.setHours(23, 59, 59, 999);
    }

    return now > expirationDate;
});

// Method to mark announcement as read by user
AnnouncementSchema.methods.markAsRead = function(userId) {
    const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
    
    if (!alreadyRead) {
        this.readBy.push({ user: userId });
        this.totalReads += 1;
    }
    
    return this.save();
};

// Method to check if user has read the announcement
AnnouncementSchema.methods.isReadByUser = function(userId) {
    return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Static method to get active announcements
AnnouncementSchema.statics.getActiveAnnouncements = function() {
    const now = new Date();

    return this.find({
        isActive: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gte: now.toISOString().split('T')[0] } } // Check only date, time handled in virtual
        ]
    }).populate('author', 'username email').sort('-createdAt');
};

module.exports = mongoose.model('Announcement', AnnouncementSchema);
