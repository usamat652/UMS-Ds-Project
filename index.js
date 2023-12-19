import express from 'express';
import rateLimit from "express-rate-limit";
// import logger from './config/apiLogs.js';
// import LogModel from './models/apiLog.js';
// import logRequestDetails from './config/apiLogs.js';
import { syncModels } from './src/config/database.js';
import dotenv from 'dotenv';
import userRouter from './src/routes/user.js';
import apiDetails from './src/controllers/apilogsController.js';
import cors from 'cors'
import JobRouter from './src/routes/job.js';
dotenv.config();
syncModels();
const PORT = process.env.PORT;
const app = express();
app.use(express.json());

const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  message: { error: "Too many requests from this IP at the same type. Please try again later." },
});

app.use(limiter);
app.use(cors())
app.use(apiDetails)
// app.use(logRequestDetails)

app.use('/user', userRouter)
app.use('', JobRouter)
// app.use('/classicmodel', productRouter);
// app.use('/classicmodel', customerRouter);
// app.use('/queries', router);


app.listen(PORT,'192.168.11.172',() => {
    console.log(`Server is running on http://192.168.11.172:${PORT}`);
  });