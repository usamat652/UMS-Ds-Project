import express from 'express';
import { Server } from "socket.io";
import userRequest from "./gptSocket.js";
import { Prompt } from '../models/openAi.js';
const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log("New user connected!");

    let clientType = "client"
    socket.on('user message', async (data) => {
        console.log('Received message from client: ' + data);
        try {
            const gptReply = await userRequest({ body: { question: data } });
            await Prompt.create({ name: clientType + 1, request: data, response: gptReply });
            socket.emit('server message', gptReply);
        } catch (error) {
            console.error('Failed to save message to the database:', error);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('A user disconnected from the server');
    });
});
