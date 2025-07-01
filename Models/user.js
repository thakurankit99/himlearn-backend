const crypto = require("crypto")

const mongoose = require("mongoose")

const bcrypt = require("bcryptjs")

const jwt = require("jsonwebtoken")

const UserSchema = new mongoose.Schema({

    username : {
        type :String,
        required : [true ,"Please provide a username"]
    },
    photo : {
        type : String,
        default : "https://res.cloudinary.com/dmrwcy4v1/image/upload/v1751222751/himlearning/users/user.jpg"
    },
    email : {
        type: String ,
        required : [true ,"Please provide a email"],
        unique : true ,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password : {
        type:String,
        minlength: [6, "Please provide a password with min length : 6 "],
        required: [true, "Please provide a password"],
        select: false
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "admin"]
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    readList : [{
        type : mongoose.Schema.ObjectId,
        ref : "Story"
    }],
    readListLength: {
        type: Number,
        default: 0
    },
    resetPasswordToken : String ,
    resetPasswordExpire: Date


},{timestamps: true})


UserSchema.pre("save" , async function (next) {

    if (!this.isModified("password")) {
        next()
    }

    const salt = await bcrypt.genSalt(10)

    this.password = await bcrypt.hash(this.password,salt)
    next() ;

})


UserSchema.methods.generateJwtFromUser  = function(){
    
    const { JWT_SECRET_KEY,JWT_EXPIRE } = process.env;

    payload = {
        id: this._id,
        username : this.username,
        email : this.email
    }

    const token = jwt.sign(payload ,JWT_SECRET_KEY, {expiresIn :JWT_EXPIRE} )

    return token 
}

UserSchema.methods.getResetPasswordTokenFromUser =function(){

    const { RESET_PASSWORD_EXPIRE } = process.env

    const randomHexString = crypto.randomBytes(20).toString("hex")

    const resetPasswordToken = crypto.createHash("SHA256").update(randomHexString).digest("hex")

    this.resetPasswordToken = resetPasswordToken

    this.resetPasswordExpire =Date.now()+ parseInt(RESET_PASSWORD_EXPIRE)

    return resetPasswordToken
}

UserSchema.methods.getEmailVerificationTokenFromUser = function(){

    const randomHexString = crypto.randomBytes(20).toString("hex")

    const emailVerificationToken = crypto.createHash("SHA256").update(randomHexString).digest("hex")

    this.emailVerificationToken = emailVerificationToken

    // Token expires in 24 hours
    this.emailVerificationExpire = Date.now() + (24 * 60 * 60 * 1000)

    return emailVerificationToken
}


const User = mongoose.model("User",UserSchema)

module.exports = User  ;