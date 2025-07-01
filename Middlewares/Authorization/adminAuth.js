const CustomError = require("../../Helpers/error/CustomError");
const asyncErrorWrapper = require("express-async-handler");

const getAdminAccess = asyncErrorWrapper(async (req, res, next) => {
    const { user } = req;

    if (!user) {
        return next(new CustomError("You are not authorized to access this route", 401));
    }

    if (user.role !== "admin") {
        return next(new CustomError("Only admins can access this route", 403));
    }

    next();
});

module.exports = {
    getAdminAccess
};
