import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import dotenv from 'dotenv';
dotenv.config();

const Secret_Key = process.env.SECRET_KEY;

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];    // console.log(token)
    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token Missing.' });
    }
    try {
        const decoded = jwt.verify(token, Secret_Key);
        const user = await User.findOne({email: decoded.email});
        // console.log(user)

        if (!user) {
            return res.status(401).json({ message: 'Invalid or Missing token. User not found.' });
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


// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
  
//     if (token == null) {
//       return FailedApi(res, 401, 'Unauthorized');
//     }
  
//     jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
//       if (err) {
//         return FailedApi(res, 403, 'Forbidden');
//       }
//       req.user = user;
//       next();
//     });
//   };

export {authenticateUser};
