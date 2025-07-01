const asyncErrorWrapper = require("express-async-handler")
const Story = require("../Models/story");
const CustomError = require("../Helpers/error/CustomError");
const {searchHelper, paginateHelper} =require("../Helpers/query/queryHelpers")

const addStory = asyncErrorWrapper(async  (req,res,next)=> {

    const {title,content,privacy,isPaid,price} = req.body
    const { getVideoThumbnail, isVideoUrl, getVideoDuration } = require("../Helpers/Libraries/cloudinaryUpload");

    var wordCount = content.trim().split(/\s+/).length ;

    let readtime = Math.floor(wordCount /200)   ;

    // Default image URL for stories without uploaded images
    const defaultImageUrl = "https://res.cloudinary.com/dmrwcy4v1/image/upload/v1751222753/himlearning/stories/default.jpg";

    try {
        // Validate paid story data
        if (isPaid === 'true' || isPaid === true) {
            const priceNum = parseFloat(price);
            if (!price || priceNum <= 0) {
                return next(new CustomError("Paid stories must have a price greater than 0", 400));
            }
            if (priceNum > 10000) {
                return next(new CustomError("Story price cannot exceed ₹10,000", 400));
            }
        }

        console.log('Creating story with data:', {
            title,
            hasFile: !!req.file,
            fileType: req.file?.mimetype,
            fileSize: req.file?.size,
            privacy,
            isPaid,
            price
        });

        let storyData = {
            title,
            content,
            author: req.user._id,
            image: req.file ? req.file.path : defaultImageUrl,
            readtime,
            privacy: privacy || "public",
            isPaid: isPaid === 'true' || isPaid === true,
            price: (isPaid === 'true' || isPaid === true) ? parseFloat(price) : 0
        };

        // Check if uploaded file is a video
        if (req.file && req.file.mimetype && req.file.mimetype.startsWith('video/')) {
            console.log('Processing video upload:', req.file.path);
            storyData.mediaType = 'video';

            // Generate video thumbnail
            try {
                const thumbnailUrl = getVideoThumbnail(req.file.path);
                if (thumbnailUrl) {
                    storyData.videoThumbnail = thumbnailUrl;
                    console.log('Generated video thumbnail:', thumbnailUrl);
                }
            } catch (thumbnailError) {
                console.error('Error generating video thumbnail:', thumbnailError);
                // Continue without thumbnail - not critical
            }

            // Note: Video duration will be updated after creation via webhook or separate call
            // For now, we'll set a default duration
            storyData.videoDuration = 0;
        } else {
            storyData.mediaType = 'image';
        }

        console.log('Creating story with final data:', storyData);
        const newStory = await Story.create(storyData);
        console.log('Story created successfully:', newStory._id);

        return res.status(200).json({
            success: true,
            message: "Story added successfully",
            data: newStory
        })
    }

    catch(error) {
        console.error('Error creating story:', error);

        // Handle specific error types
        if (error.name === 'ValidationError') {
            return next(new CustomError('Story validation failed: ' + error.message, 400));
        }

        if (error.code === 11000) {
            return next(new CustomError('A story with this title already exists', 400));
        }

        return next(error)
    }

})

const getAllStories = asyncErrorWrapper( async (req,res,next) =>{

    // Build privacy filter based on user authentication status
    let privacyFilter = {};

    if (!req.user) {
        // Not authenticated - only show public stories
        privacyFilter = { privacy: "public" };
    } else if (req.user.role === "admin") {
        // Admin - show all stories regardless of privacy
        privacyFilter = {};
    } else {
        // Authenticated user - show public and user stories, plus their own private stories
        privacyFilter = {
            $or: [
                { privacy: "public" },
                { privacy: "user" },
                { privacy: "private", author: req.user._id }
            ]
        };
    }

    let query = Story.find(privacyFilter);

    query =searchHelper("title",query,req)

    const paginationResult =await paginateHelper(Story , query ,req)

    query = paginationResult.query  ;

    query = query.sort("-likeCount -commentCount -createdAt")

    // Only populate author info if user is logged in
    if (req.user) {
        query = query.populate("author", "username photo")
    }

    const stories = await query

    return res.status(200).json(
        {
            success:true,
            count : stories.length,
            data : stories ,
            page : paginationResult.page ,
            pages : paginationResult.pages
        })

})

const detailStory =asyncErrorWrapper(async(req,res,next)=>{

    const {slug}=req.params ;
    const {activeUser} =req.body

    const story = await Story.findOne({
        slug: slug
    }).populate("author likes")

    if (!story) {
        return next(new CustomError("Story not found", 404));
    }

    // Check privacy permissions
    const user = req.user || activeUser;

    if (story.privacy === "private") {
        // Private stories: only author and admin can access
        if (!user || (user._id.toString() !== story.author._id.toString() && user.role !== "admin")) {
            return next(new CustomError("You don't have permission to access this story", 403));
        }
    } else if (story.privacy === "user") {
        // User stories: only registered users can access
        if (!user) {
            return next(new CustomError("You need to be logged in to access this story", 401));
        }
    }
    // Public stories: accessible to everyone (no additional check needed)



    const storyLikeUserIds = story.likes.map(json => json.id)
    const likeStatus = user ? storyLikeUserIds.includes(user._id) : false;

    return res.status(200).json({
        success: true,
        data: story,
        likeStatus: likeStatus
    })

})

const likeStory =asyncErrorWrapper(async(req,res,next)=>{

    const {activeUser} =req.body 
    const {slug} = req.params ;

    const story = await Story.findOne({
        slug: slug 
    }).populate("author likes")
   
    const storyLikeUserIds = story.likes.map(json => json._id.toString())
   
    if (! storyLikeUserIds.includes(activeUser._id)){

        story.likes.push(activeUser)
        story.likeCount = story.likes.length
        await story.save() ; 
    }
    else {

        const index = storyLikeUserIds.indexOf(activeUser._id)
        story.likes.splice(index,1)
        story.likeCount = story.likes.length

        await story.save() ; 
    }
 
    return res.status(200).
    json({
        success:true,
        data : story
    })

})

const editStoryPage  =asyncErrorWrapper(async(req,res,next)=>{
    const {slug } = req.params ; 
   
    const story = await Story.findOne({
        slug: slug 
    }).populate("author likes")

    return res.status(200).
        json({
            success:true,
            data : story
    })

})


const editStory  =asyncErrorWrapper(async(req,res,next)=>{
    const {slug } = req.params ;
    const {title ,content ,image, privacy } = req.body;
    const { getVideoThumbnail, isVideoUrl } = require("../Helpers/Libraries/cloudinaryUpload");

    const story = await Story.findOne({slug : slug })

    story.title = title ;
    story.content = content ;

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

    await story.save()  ;

    return res.status(200).
        json({
            success:true,
            data :story
    })

})

const deleteStory  =asyncErrorWrapper(async(req,res,next)=>{

    const {slug} = req.params  ;

    const story = await Story.findOne({slug : slug })

    deleteImageFile(req,story.image) ; 

    await story.remove()

    return res.status(200).
        json({
            success:true,
            message : "Story delete succesfully "
    })

})


module.exports ={
    addStory,
    getAllStories,
    detailStory,
    likeStory,
    editStoryPage,
    editStory ,
    deleteStory
}