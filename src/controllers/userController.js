import { Op } from 'sequelize';
import { User, validateUser } from '../models/user.js';
import bcrypt from 'bcrypt';
import { FailedApi, SuccessApi } from '../helper/apiResponse.js';
import { emailQueue, forgotPasswordQueue } from '../services/emailService.js';
import { ActivityLog } from '../models/activitylogs.js';
import _ from 'lodash';
import Joi from 'joi'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const Secret_Key = process.env.SECRET_KEY

function generateRandomToken() {
    const charactersToGenerateRandomToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let startIndex = 0; startIndex < 12; startIndex++) {
        const randomIndex = Math.floor(Math.random() * charactersToGenerateRandomToken.length);
        token = token + charactersToGenerateRandomToken.charAt(randomIndex);
    }
    return token;
}

const setPasswordSchema = Joi.object({
    oldPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*?[a-z\\s]).{8,}$')),
    password: Joi.string().min(8).required().pattern(new RegExp('^(?=.*?[a-z\\s]).{8,}$')),
    confirmPassword: Joi.string().min(8).required().pattern(new RegExp('^(?=.*?[a-z\\s]).{8,}$')).valid(Joi.ref("password")),
});

async function getAllUsers(req, res) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 1000;
        const search = req.query.search || '';

        const offset = (page - 1) * limit;

        const whereClause = {
            // Modify these fields according to your User model
            [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ],
        };
        const users = await User.findAndCountAll({
            where: whereClause,
            offset,
            limit,
        });
        if (!users || users.count === 0) {
            return FailedApi(res, 404, { message: 'No user found' });
        }

        const totalPages = Math.ceil(users.count / limit);
        const nextPage = page < totalPages;
        const PreviousPage = page > 1;
        const nextLink = nextPage ? `/api/get-all-users?page=${page + 1}&limit=${limit}&search=${search}` : null;
        const prevLink = PreviousPage ? `/api/get-all-users?page=${page - 1}&limit=${limit}&search=${search}` : null;

        // Modify the mappedUsers logic based on your User model fields
        const mappedUsers = users.rows.map((user) => {
            return {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isAdmin: user.isAdmin,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        });

        res.status(200).json({
            pagination: {
                totalUsers: users.count,
                page,
                totalPages,
                nextPage,
                PreviousPage,
                nextLink,
                prevLink,
            },
            users: mappedUsers,
        });
        console.log("Get All Users Api Hit");
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const createUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email } = req.body;

        const { error } = validateUser(req.body);
        if (error) {
            return FailedApi(res, 400, { message: "Validation error", error: error.details[0].message });
        }

        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            return FailedApi(res, 409, 'Email already registered');
        }

        const verificationToken = generateRandomToken();

        const newUser = await User.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            rememberToken: verificationToken
        });

        await emailQueue.add('sendVerificationEmail', { user: newUser });
        next();
        return SuccessApi(res, 200, { message: 'User created successfully. Check your email for verification.' });
    } catch (err) {
        return FailedApi(res, 400, { error: err.message });
    }
};

// Validate the password and confirm password
const setPassword = async (req, res) => {
    try {
        // Validate the password and confirm password
        const { error } = setPasswordSchema.validate(req.body);
        if (error) {
            return FailedApi(res, 400, { message: "Validation error", error: error.details[0].message });
        }

        const { password, confirmPassword } = req.body;
        const { email } = req.params;

        if (!email) {
            return FailedApi(res, 400, { message: "Email not provided" });
        }
        // Find user by email
        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return FailedApi(res, 404, { message: "Invalid Email, User Not Found" });
        }

        // const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Set expiry to 24 hours from now
        // user.rememberTokenExpiry = expiryTime;

        // // Check if the remember token has expired
        // if (user.isRememberTokenExpired()) {
        //     return FailedApi(res, 401,{ message: "Token has expired" });
        // }

        // Check if passwords match
        if (password !== confirmPassword) {
            return FailedApi(res, 400, { message: "Passwords do not match" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user's password and set isVerified to true
        await user.update({
            password: hashedPassword,
            isVerified: true,
            rememberToken: null, 
            rememberTokenExpiry: null, 
        });

        return SuccessApi(res, 200, { message: "Password set successfully" });
    } catch (error) {
        console.error("Error setting password:", error);
        return FailedApi(res, 500, { error: "Internal Server Error" });
    }
};

// User LOGIN in Function
const signin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the existing user by email
        const existingUser = await User.findOne({ where: { email } });

        if (!existingUser) {
            return FailedApi(res, 404, { message: "User Not Found" });
        }
        const comparePassword = await bcrypt.compare(password, existingUser.password);
        if (!comparePassword) {
            return FailedApi(res, 400, { message: "Invalid Email or Password" });
        }

        // Adjust payload for the token
        const payload = { email: existingUser.email, id: existingUser.userId, isAdmin: existingUser.isAdmin };

        // Generate JWT token
        const token = jwt.sign(payload, Secret_Key, { expiresIn: '1d' });
        console.log("User Login Successfully")
        const result = { user: _.pick(existingUser, ['email', 'isAdmin']), token, message: "Login Successfully" }
        SuccessApi(res, 200, result);
    } catch (error) {
        console.error("Signin error:", error);
        return FailedApi(res, 500, { message: "Internal Server Error" });
    }
};

// const changePassword = async (req, res) => {
//     try {
//       const { email,oldPassword ,password,confirmPassword } = req.body;
//       if (email) {
//         const user = await User.findOne({
//           where: {
//             email: email,
//           },
//         });
//         await bcrypt.compare(oldPassword , user.password);
//         if (newPassword !== confirmPassword) {
//           return FailedApi(res, 400, "Password does not match");
//         }
//         const hashedPassword = await bcrypt.hash(newPassword, 10);
//         // Update the user's password
//         await User.update(
//           { password: hashedPassword },
//           { where: { email: user.email } }
//         );
//         // Send a success response
//         return SuccessApi(res, 200,{message:"Password change successfully"});
//       } else {
//         return FailedApi(res, 500, "Email not found");
//       }
//     } catch (error) {
//       // Send an error response
//       return FailedApi(res, 500, {message: error.message});
//     }
//   };


const changePassword = async (req, res) => {
    try {
        const { error } = setPasswordSchema.validate(req.body);
        if (error) {
            return FailedApi(res, 400, { message: "Validation error", error: error.details[0].message });
        }
        const token = req.headers.authorization.split(" ")[1];
        const decode = jwt.verify(token, Secret_Key);
        const email = decode.email;
        const { oldPassword, password, confirmPassword } = req.body;
        if (email) {
            const user = await User.findOne({
                where: {
                    email: email,
                },
            });
            if (!user) {
                return FailedApi(res, 404, 'User not found');
            }

            const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
            if (!isPasswordCorrect) {
                return FailedApi(res, 400, 'Incorrect old password');
            }

            if (password === oldPassword) {
                return FailedApi(res, 400, 'New password cannot be the same as the old password');
              }

            if (password !== confirmPassword) {
                return FailedApi(res, 400, 'Passwords do not match');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            // Update the user's password
            await User.update({ password: hashedPassword }, { where: { email: email } });

            // Send a success response
            return SuccessApi(res, 200, { message: 'Password changed successfully' });
        }
    } catch (error) {
        // Send an error response
        return FailedApi(res, 500, { message: error.message });
    }
};


const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return FailedApi(res, 404, { message: 'User not found' });
        }

        // Set the reset token and expiry time for password reset
        // const expiryTime = new Date(Date.now() + 60 * 1000); // Set expiry to 24 hours from now
        // user.rememberTokenExpiry = expiryTime;
        // if (user.isRememberTokenExpired()) {
        //     return FailedApi(res, 400, { message: "Token has expired" });
        // }
        await user.save();

        // Send email with the reset link to the user
        await forgotPasswordQueue.add('sendPasswordResetEmail', { user: user });

        return SuccessApi(res, 200, { message: 'Password reset link sent successfully' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return FailedApi(res, 500, { message: 'Internal server error' });
    }
};

const logUserActivity = async (req, res, next) => {
    try {

        let logData = {};

        if (req.path === '/createUser' && req.method === 'POST') {
            // For user creation

            const { firstName, lastName, email } = req.body;
            const userName = `${firstName} ${lastName}`;

            logData = {
                action: 'User Created',
                username: userName,
                userEmail: email,
                details: `${userName} has been created`,
                userAgent: req.headers["user-agent"]
            };
            console.log('User Creation action detected by Admin');
        } else if (req.path === '/logIn' && req.method === 'POST') {
            // For user login
            const { email } = req.body;

            // Fetch user details from the database based on the provided email
            const user = await User.findOne({ where: { email } });

            if (user) {
                const { firstName, lastName } = user;
                const userName = `${firstName} ${lastName}`;
                logData = {
                    action: 'User Login',
                    username: userName,
                    userEmail: email,
                    details: `User "${email}" just logged in Successfully`,
                    userAgent: req.headers["user-agent"]

                };
                console.log('User Login action detected');
            } else {
                console.log(`User with email ${email} not found`);
            }
        } else if (req.path === '/forget-password' && req.method === 'POST') {
            // For forget password
            const { email } = req.body;
            const user = await User.findOne({ where: { email } });

            if (user) {
                const { firstName, lastName } = user;
                const userName = `${firstName} ${lastName}`;
                logData = {
                    action: 'Forget Password',
                    username: userName,
                    userEmail: email,
                    details: `Password reset request initiated for email ${email}`,
                    userAgent: req.headers["user-agent"]

                };
                console.log('Forget Password log action detected');
            } else {
                console.log(`User with email ${email} not found`);
            }
        } else if (req.path.startsWith('/setPassword/') && req.method === 'POST') {
            // For set password
            const { email } = req.params;
            const user = await User.findOne({ where: { email } });
            const userName = `${user.firstName} ${user.lastName}`;

            logData = {
                action: 'Set Password',
                username: userName,
                userEmail: email,
                details: `User ${userName} Just set the Password`,
                userAgent: req.headers["user-agent"]
            };
            console.log('Set Password log action detected');
        } else if (req.path.startsWith('/change-password') && req.method === 'POST') {
            // For set password

            const token = req.headers.authorization.split(" ")[1];
            const decode = jwt.verify(token, Secret_Key);
            const email = decode.email;
            const user = await User.findOne({ where: { email } });
            const userName = `${user.firstName} ${user.lastName}`;

            logData = {
                action: 'Change Password',
                username: userName,
                userEmail: email,
                details: `User ${userName} Just change their Password`,
                userAgent: req.headers["user-agent"]
            };
            console.log('Change Password log action detected');
        }
        else {
            // If the route doesn't match any specific path or method, proceed to next middleware
            return next();
        }

        res.on('finish', async () => {
            try {
                // if (res.statusCode >= 400 && res.statusCode <= 499) {
                //     logData.action = 'Client Side Error';
                //     logData.details = `Client error encountered: ${res.statusMessage}`;
                // } else if (res.statusCode >= 500 && res.statusCode <= 599) {
                //     logData.action = 'Server Error';
                //     logData.details = `Server error encountered: ${res.statusMessage}`;
                // }

                await ActivityLog.create(logData);
                console.log('User activity logged successfully:'); // Check the logged createdLog object
            } catch (error) {
                console.error('Error creating log:', error);
            }
        });
        next();
    } catch (error) {
        console.error('Error logging user activity:', error);
        next(error);
    }
};

const getAllLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 1000;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;
        // Build the where clause for filtering logs
        const whereClause = {
            [Op.or]: [
                { username: { [Op.like]: `%${search}%` } },
                { userEmail: { [Op.like]: `%${search}%` } },
                { action: { [Op.like]: `%${search}%` } },
                { details: { [Op.like]: `%${search}%` } },
            ],
        };

        // Find logs based on the provided criteria
        const logs = await ActivityLog.findAndCountAll({
            where: whereClause,
            offset,
            limit,
        });
        if (!logs) {
            return FailedApi(res, 404, {
                status: 'failed',
                message: 'No logs found based on the provided criteria.',
            });
        }
        // Calculate pagination details
        const totalPages = Math.ceil(logs.count / limit);
        const nextPage = page < totalPages;
        const PreviousPage = page > 1;
        const nextLink = nextPage ? `/api/getAllLogs?page=${page + 1}&limit=${limit}&search=${search}` : null;
        const prevLink = PreviousPage ? `/api/getAllLogs?page=${page - 1}&limit=${limit}&search=${search}` : null;

        // Return the response with the retrieved data and pagination details
        SuccessApi(res, 200, {
            pagination: {
                totalLogs: logs.count,
                page,
                totalPages,
                nextPage,
                PreviousPage,
                nextLink,
                prevLink,
            },
            data: logs.rows,
            message: "User Logs Fetched Successfully"
        });
    } catch (error) {
        // Handle any errors that occur during the process
        FailedApi(res, 500, {
            message: 'An error occurred while fetching logs.',
            error: error.message,
        });
    }
};

export {
    createUser,
    logUserActivity,
    signin,
    setPassword,
    changePassword,
    getAllUsers,
    forgetPassword,
    getAllLogs
};
