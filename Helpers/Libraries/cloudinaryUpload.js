// Load environment variables first
require("dotenv").config({ path: "./Config/config.env" });

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const CustomError = require('../error/CustomError');

// Configure Cloudinary

// Configure Cloudinary using CLOUDINARY_URL (recommended method)
if (process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
} else {
    // Fallback to individual environment variables
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

// Verify configuration
const config = cloudinary.config();
if (!config.cloud_name || !config.api_key || !config.api_secret) {
    console.error('❌ Cloudinary configuration is incomplete. File uploads will fail.');
    console.error('Please check your environment variables.');
}

// Helper function to sanitize filename
const sanitizeFilename = (filename) => {
    if (!filename) return 'unnamed_file';

    return filename
        // Remove emojis and special Unicode characters
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        // Remove special characters except letters, numbers, dots, hyphens, underscores
        .replace(/[^a-zA-Z0-9.\-_\s]/g, '')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ')
        // Replace spaces with underscores
        .replace(/\s/g, '_')
        // Remove multiple consecutive underscores
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, '')
        // Limit length to 50 characters (excluding extension)
        .substring(0, 50)
        // Ensure it's not empty
        || 'unnamed_file';
};

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        let folder, publicId, transformation, isVideo = false;

        // Sanitize the original filename
        const sanitizedName = sanitizeFilename(file.originalname.replace(/\.[^/.]+$/, "")); // Remove extension
        console.log(`Original filename: "${file.originalname}" -> Sanitized: "${sanitizedName}"`);

        if (file.fieldname === 'photo') {
            // User profile photo configuration
            folder = 'himlearning/users';
            publicId = `user_${req.user.id}`;
            transformation = [
                { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ];
        } else if (file.fieldname === 'image') {
            // Story media configuration (images and videos)
            folder = 'himlearning/stories';
            publicId = `story_${Date.now()}_${sanitizedName}`;

            // Check if it's a video or image
            isVideo = file.mimetype.startsWith('video/');

            if (isVideo) {
                transformation = [
                    { width: 1280, height: 720, crop: 'limit' },
                    { quality: 'auto' },
                    { duration: '600' }, // Max 10 minutes
                    { bit_rate: '1m' } // Optimize bitrate for web
                ];
            } else {
                transformation = [
                    { width: 1200, height: 800, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ];
            }
        } else {
            throw new CustomError('Invalid file field', 400);
        }

        const config = {
            folder: folder,
            public_id: publicId,
            transformation: transformation,
            allowed_formats: isVideo ? ['mp4', 'mov', 'avi', 'webm'] : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            resource_type: isVideo ? 'video' : 'image'
        };

        console.log('Cloudinary upload config:', config);
        return config;
    }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'video/mov',
        'video/avi'
    ];

    const isImage = allowedImageTypes.includes(file.mimetype);
    const isVideo = allowedVideoTypes.includes(file.mimetype);

    console.log(`File upload attempt: ${file.originalname}, Type: ${file.mimetype}, Size: ${file.size || 'unknown'} bytes`);

    if (!isImage && !isVideo) {
        console.log(`Rejected file type: ${file.mimetype}`);
        return cb(new CustomError('Please provide a valid image (JPEG, PNG, GIF, WebP) or video file (MP4, MOV, AVI, WebM)', 400), false);
    }

    // Check file size limits (only if size is available)
    if (file.size) {
        if (isImage && file.size > 10 * 1024 * 1024) { // 10MB for images
            return cb(new CustomError('Image file size too large. Maximum 10MB allowed', 400), false);
        }

        if (isVideo && file.size > 200 * 1024 * 1024) { // 200MB for videos
            return cb(new CustomError('Video file size too large. Maximum 200MB allowed', 400), false);
        }
    }

    cb(null, true);
};

// Create multer upload instance
const cloudinaryUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit (for videos)
        fieldSize: 200 * 1024 * 1024, // 200MB field size
        fields: 10, // Max number of fields
        files: 1 // Max number of files per request
    }
});

// Helper function to delete image from Cloudinary
const deleteCloudinaryImage = async (publicId) => {
    try {
        if (publicId) {
            const result = await cloudinary.uploader.destroy(publicId);
            console.log('Image deleted from Cloudinary:', result);
            return result;
        }
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw new CustomError('Failed to delete image', 500);
    }
};

// Helper function to get optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
    const defaultOptions = {
        quality: 'auto',
        fetch_format: 'auto'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    return cloudinary.url(publicId, finalOptions);
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (cloudinaryUrl) => {
    if (!cloudinaryUrl) return null;

    try {
        // Extract public ID from Cloudinary URL
        const parts = cloudinaryUrl.split('/');
        const filename = parts[parts.length - 1];
        const publicId = filename.split('.')[0];

        // Include folder path if present
        const folderIndex = parts.indexOf('himlearning');
        if (folderIndex !== -1) {
            const folderPath = parts.slice(folderIndex, -1).join('/');
            return `${folderPath}/${publicId}`;
        }

        return publicId;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};

// Helper function to generate video thumbnail URL
const getVideoThumbnail = (videoUrl, options = {}) => {
    if (!videoUrl || !videoUrl.includes('cloudinary')) return null;

    try {
        const publicId = extractPublicId(videoUrl);
        if (!publicId) return null;

        const defaultOptions = {
            width: 400,
            height: 300,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto'
        };

        const finalOptions = { ...defaultOptions, ...options };

        return cloudinary.url(publicId, {
            ...finalOptions,
            resource_type: 'video',
            format: 'jpg' // Generate thumbnail as JPEG
        });
    } catch (error) {
        console.error('Error generating video thumbnail:', error);
        return null;
    }
};

// Helper function to check if URL is a video
const isVideoUrl = (url) => {
    if (!url) return false;
    return url.includes('/video/upload/') || url.includes('resource_type=video');
};

// Helper function to get video duration (requires additional API call)
const getVideoDuration = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId, { resource_type: 'video' });
        return result.duration || 0;
    } catch (error) {
        console.error('Error getting video duration:', error);
        return 0;
    }
};

module.exports = {
    cloudinaryUpload,
    deleteCloudinaryImage,
    getOptimizedImageUrl,
    extractPublicId,
    getVideoThumbnail,
    isVideoUrl,
    getVideoDuration,
    cloudinary
};
