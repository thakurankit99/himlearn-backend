const CustomError = require("../../Helpers/error/CustomError");
const User = require("../../Models/user")
const jwt = require("jsonwebtoken");
const asyncErrorWrapper =require("express-async-handler")
const { isTokenIncluded ,getAccessTokenFromHeader} = require("../../Helpers/auth/tokenHelpers");


const getAccessToRoute = asyncErrorWrapper(async(req,res,next) =>{

    const {JWT_SECRET_KEY} =process.env ;

    if(!isTokenIncluded(req)) {

        return next(new CustomError("You are not authorized to access this route ", 401))
    }

    const accessToken = getAccessTokenFromHeader(req)

    const decoded = jwt.verify(accessToken,JWT_SECRET_KEY) ;

    const user = await User.findById(decoded.id)

    if(!user) {
        return next(new CustomError("You are not authorized to access this route ", 401))
    }

    req.user = user ;

    next()

})

const getOptionalAccessToRoute = asyncErrorWrapper(async(req,res,next) =>{

    const {JWT_SECRET_KEY} =process.env ;

    // If no token is provided, continue without setting req.user
    if(!isTokenIncluded(req)) {
        req.user = null;
        return next();
    }

    try {
        const accessToken = getAccessTokenFromHeader(req)
        const decoded = jwt.verify(accessToken,JWT_SECRET_KEY) ;
        const user = await User.findById(decoded.id)

        if(user) {
            req.user = user ;
        } else {
            req.user = null;
        }
    } catch (error) {
        // If token is invalid, continue without setting req.user
        req.user = null;
    }

    next()

})



module.exports ={getAccessToRoute, getOptionalAccessToRoute}