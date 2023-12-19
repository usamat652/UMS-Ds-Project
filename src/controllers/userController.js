import { User, validateUser } from '../models/user.js';
import bcrypt from 'bcrypt';
import { FailedApi, SuccessApi } from '../config/apiResponse.js';
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
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
});

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
            return FailedApi(res, 404, { message: "Email not provided" });
        }

        // Find user by rememberToken
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
            rememberToken: null, // Clear the remember token after successful password change
            rememberTokenExpiry: null, // Clear the expiry timestamp
        });

        return SuccessApi(res, 200, { message: "Password set successfully" });
    } catch (error) {
        console.error("Error setting password:", error);
        return FailedApi(res, 500, { error: "Internal Server Error" });
    }
};



// const verification = async (req, res) => {
//     try {
//         const { token } = req.params;

//         // Find user by rememberToken in MySQL using Sequelize
//         const user = await User.findOne({ where: { rememberToken: token } });

//         if (!user) {
//             return FailedApi(res, 400, { message: "User not found" });
//         }

//         // Update rememberToken to null
//         user.rememberToken = null;
//         await user.save();

//         return SuccessApi(res, 200, { message: "Email Verification Successful" });
//     } catch (error) {
//         return FailedApi(res, 401, { message: "Error occurred" });
//     }
// };



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
            return FailedApi(res, 400, { message: "Password Did Not Match" });
        }

        // Adjust payload for the token
        const payload = { email: existingUser.email, id: existingUser.userId };

        // Generate JWT token
        const token = jwt.sign(payload, Secret_Key);
        console.log("User Login Successfully")
        return SuccessApi(res, 200, { user: _.pick(existingUser, ['email']), token: token, message: "Login Successfully" });
    } catch (error) {
        console.error("Signin error:", error);
        return FailedApi(res, 500, { message: "Internal Server Error" });
    }
};

// const combinedVerificationAndPasswordSetup = async (req, res) => {
//     try {
//         const { token } = req.params;

//         // Find user by rememberToken in MySQL using Sequelize
//         const user = await User.findOne({ where: { rememberToken: token } });

//         if (!user) {
//             return res.status(400).json({ message: "Invalid token" });
//         }

//         // Redirect to password setup page
//         return res.redirect(`http://192.168.11.218:8080/#/CreatePassword/?token=${token}`); // Replace with your password setup page URL
//     } catch (error) {
//         return res.status(500).json({ message: "Error occurred" });
//     }
// };

const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return FailedApi(res, 404, { message: 'User not found' });
        }

        // Set the reset token and expiry time for password reset
        const expiryTime = new Date(Date.now() + 60 * 1000); // Set expiry to 24 hours from now
        user.rememberTokenExpiry = expiryTime;
        if (user.isRememberTokenExpired()) {
            return FailedApi(res, 400, { message: "Token has expired" });
        }
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
                action: 'User Creation',
                username: userName,
                userEmail: email,
                details: `New user ${userName} (${email}) has been created`,
            };
            console.log('User Creation log action detected');
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
                    details: `User ${userName} with email ${email} logged in`,
                };
                console.log('User Login log action detected');
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
                };
                console.log('Forget Password log action detected');
            } else {
                console.log(`User with email ${email} not found`);
            }
        } else if (req.path.startsWith('/setPassword/') && req.method === 'POST') {
            // For set password
            const { token } = req.params;

            logData = {
                action: 'Set Password',
                details: `Password reset completed with token ${token}`,
            };
            console.log('Set Password log action detected');
        } else {
            // If the route doesn't match any specific path or method, proceed to next middleware
            return next();
        }

        res.on('finish', async () => {
            try {
                logData.statusCode = res.statusCode;

                if (res.statusCode >= 400 && res.statusCode <= 499) {
                    logData.action = 'Client Error';
                    logData.details = `Client error encountered: ${res.statusMessage}`;
                } else if (res.statusCode >= 500 && res.statusCode <= 599) {
                    logData.action = 'Server Error';
                    logData.details = `Server error encountered: ${res.statusMessage}`;
                }

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


export {
    createUser,
    logUserActivity,
    signin,
    setPassword,
    // combinedVerificationAndPasswordSetup,
    forgetPassword,
};
