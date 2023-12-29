import express from 'express';
import rateLimit from "express-rate-limit";
import { syncModels } from './src/config/database.js';
import dotenv from 'dotenv';
import userRouter from './src/routes/user.js';
import apiDetails from './src/controllers/apilogsController.js';
import cors from 'cors'
import JobRouter from './src/routes/job.js';
import { Server } from "socket.io";
import userRequest from "./src/Sockets/gptSocket.js";
import { Prompt } from './src/models/openAi.js';
import http from 'http';
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



app.use('/api', userRouter);
app.use('/api', JobRouter);


const server = http.createServer(app);
const io = new Server(server);
io.on("connection", (socket) => {
    console.log("User CONNECTED Successful");
    // Listen for chat messages from clients
    socket.on("chat message", async (msg) => {
      console.log("Message received from client: " + msg);
      try {
        // Send user's message to OpenAI GPT-3.5 Turbo
        const gptResponse = await userRequest(msg);
        // Emit the GPT response back to the specific client
        io.emit("chat message", gptResponse);
        // Save the chat message to the database
        await Prompt.create({
          question: msg,
          gptResponse,
        });
      } catch (error) {
        console.error("Error processing chat message:", error);
        // Handle the error (e.g., emit an error message to the client)
        io.emit("chat message", "Error processing your message");
      }
    });
  });
const host = process.env.HOST
server.listen(PORT, host, () => {
    console.log(`Server is running on http://${host}:${PORT}`);
});