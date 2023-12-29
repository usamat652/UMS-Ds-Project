import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { FailedApi } from '../helper/apiResponse.js';
dotenv.config();


function isAdminMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).send('Token not available');
    const token = header.split(' ')[1];
    const user = jwt.decode(token);
    if (user.isAdmin) {
      jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
        if (error) {
          console.error('JWT verification failed:', error.message);
          return FailedApi(res, 401,{message:'Unauthorized: Invalid token'});
        } else {
          next();
        }
      });
    } else {
        return FailedApi(res, 403,{message:'Access denied. Admin privileges required.'});
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

export { isAdminMiddleware };
