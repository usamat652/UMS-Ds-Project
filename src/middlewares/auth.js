import jwt from "jsonwebtoken";
import {User} from "../models/user.js";
import dotenv from "dotenv";
dotenv.config();

const authenticateMiddleware = async (req, res, next) => {
    const token = req.headers.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      // Verify the token using your secret key
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const user = await User.findOne({
        where: { email: decoded.email },
      });
      if (!user) {
        return res.status(401).json({ error: "Unauthorized - User not found" });
      }
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
  };
  
  
export {authenticateMiddleware};