const isTokenIncluded =(req) => {
   
    return (
        req.headers.authorization && req.headers.authorization.startsWith("Bearer")
    )

}

const getAccessTokenFromHeader = (req) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return null;
    }

    const parts = authorization.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return null;
    }

    const access_token = parts[1];

    // Basic token validation
    if (!access_token || access_token === 'null' || access_token === 'undefined') {
        return null;
    }

    return access_token;
}

const sendToken = (user,statusCode ,res)=>{

    const token = user.generateJwtFromUser()

    return res.status(statusCode).json({
        success: true ,
        token
    })

}

module.exports ={
    sendToken,
    isTokenIncluded,
    getAccessTokenFromHeader
}
