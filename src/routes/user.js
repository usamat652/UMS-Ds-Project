import express from 'express';
import {
    // combinedVerificationAndPasswordSetup,
    createUser,
    forgetPassword,
    logUserActivity,
    setPassword,
    signin,
} from '../controllers/userController.js';

const userRouter = express.Router();
userRouter.use(logUserActivity)
userRouter.post('/createUser', createUser);
userRouter.post('/logIn',signin);
// userRouter.get('/your-verification-link/:token', verification);
userRouter.post('/forget-password',forgetPassword );
userRouter.post('/setPassword/:email', setPassword);
userRouter.post('/get-all-activity', setPassword);
// userRouter.get('/verify-and-set-password/:token', combinedVerificationAndPasswordSetup);


export default userRouter;