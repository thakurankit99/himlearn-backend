
const mongoose = require("mongoose")
const Comment = require("./comment")
const slugify = require("slugify")

const StorySchema = new mongoose.Schema({

    author: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    slug: String,
    title: {
        type: String,
        required: [true, "Please provide a title"],
        minlength: [4, "Please provide a title least 4 characters "],
    },
    content: {
        type: String,
        required: [true, "Please a provide a content "],
        minlength: [10, "Please provide a content least 10 characters "],
    },
    image: {
        type: String,
        default: "default.jpg"
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
    },
    videoThumbnail: {
        type: String,
        default: null
    },
    videoDuration: {
        type: Number,
        default: null // Duration in seconds
    },
    readtime: {
        type: Number,
        default: 3
    },
    likes: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],
    likeCount: {
        type: Number,
        default: 0
    },
    comments: [{
            type: mongoose.Schema.ObjectId,
            ref: "Comment"
    }],
    commentCount: {
        type: Number,
        default: 0
    },
    privacy: {
        type: String,
        enum: ["public", "user", "private"],
        default: "public"
    }


}, { timestamps: true })

StorySchema.pre("save", async function (next) {

    if (!this.isModified("title")) {
        return next();
    }

    // Generate base slug
    const baseSlug = this.makeSlug();
    let slug = baseSlug;
    let counter = 1;

    // Check for existing slugs and make unique if necessary
    while (await mongoose.model("Story").findOne({ slug: slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    this.slug = slug;
    next();

})

StorySchema.pre("remove", async function (next) {

    const story= await Story.findById(this._id)

    await Comment.deleteMany({
        story : story 
    })

})

StorySchema.methods.makeSlug = function () {
    return slugify(this.title, {
        replacement: '-',
        remove: /[*+~.()'"!:@/?]/g,
        lower: true,
        strict: false,
        locale: 'tr',
        trim: true
    })

}

const Story = mongoose.model("Story", StorySchema)

module.exports = Story;