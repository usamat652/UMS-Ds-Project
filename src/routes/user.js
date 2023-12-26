import express from 'express';
import {
    changePassword,
    // combinedVerificationAndPasswordSetup,
    createUser,
    forgetPassword,
    getAllLogs,
    getAllUsers,
    logUserActivity,
    setPassword,
    signin,
} from '../controllers/userController.js';
import { isAdminMiddleware } from '../middlewares/adminAuth.js';
import { authenticateUser } from '../middlewares/auth.js';
import userRequest from '../chatbotSocket.js/gptSocket.js';
// import { OpenAi } from '../chatbotSocket.js/gptSocket.js';
// import { authenticateUser } from '../middlewares/auth.js';

const userRouter = express.Router();
// userRouter.use(logUserActivity)
userRouter.post('/createUser', logUserActivity,isAdminMiddleware, createUser);
userRouter.post('/logIn', logUserActivity, signin);
userRouter.post('/forget-password', logUserActivity, forgetPassword);
userRouter.post('/change-password', authenticateUser, changePassword);
userRouter.post('/setPassword/:email', logUserActivity, setPassword);
userRouter.get('/get-all-users', isAdminMiddleware, getAllUsers);
userRouter.get('/get-all-logs', getAllLogs);
userRouter.post('/gpt-response', userRequest);
// userRouter.get('/verify-and-set-password/:token', combinedVerificationAndPasswordSetup);


export default userRouter;