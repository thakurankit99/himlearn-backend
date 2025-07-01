const express = require("express")

const router = express.Router()

const authRoute = require("./auth")
const storyRoute = require("./story")
const userRoute = require("./user")
const commentRoute = require("./comment")
const adminRoute = require("./admin")
const announcementRoute = require("./announcement")

router.use("/auth",authRoute)
router.use("/story",storyRoute)
router.use("/user",userRoute)
router.use("/comment",commentRoute)
router.use("/admin",adminRoute)
router.use("/announcements",announcementRoute)


module.exports = router