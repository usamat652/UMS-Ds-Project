import express from 'express';
import rateLimit from "express-rate-limit";
import { syncModels } from './src/config/database.js';
import dotenv from 'dotenv';
import userRouter from './src/routes/user.js';
import apiDetails from './src/controllers/apilogsController.js';
import cors from 'cors'
import JobRouter from './src/routes/job.js';
import { scheduleJob } from './src/controllers/jobController.js';

dotenv.config();
syncModels();
const PORT = process.env.PORT;
const app = express();
app.use(express.json());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Too many requests from this IP at the same type. Please try again later." },
});


// const deletedJobs = scheduleJob();
// console.log(deletedJobs);


app.use(limiter);
app.use(cors())
app.use(apiDetails)
// app.use(logRequestDetails)

app.use('/api', userRouter)
app.use('/api', JobRouter)

const host = process.env.HOST
app.listen(PORT, host, () => {
    console.log(`Server is running on http://${host}:${PORT}`);
});