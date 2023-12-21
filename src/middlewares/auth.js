import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import dotenv from 'dotenv';
dotenv.config();

const Secret_Key = process.env.SECRET_KEY;

const authenticateUser = async (req, res, next) => {
    const token = req.headers.token;
    // console.log(token)
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token not provided.' });
    }
    try {
        const decoded = jwt.verify(token, Secret_Key);
        const user = await User.findOne({email: decoded.email});
        // console.log(user)

        if (!user) {
            return res.status(401).json({ message: 'Invalid token. User not found.' });
        }
        req.user = user;
        if (user.isAdmin) {
            req.isAdmin = true;
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

export {authenticateUser};
