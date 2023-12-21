import { Server } from "socket.io";

let io; 

const socketConfig = (server) => {
  if (!io) {
    io = new Server(server);

    io.on('connection', (socket) => {
      console.log("User is connected");

      socket.on('chat message', (message) => {
        console.log('message: ' + message);
      });
    });
  }
};

export {socketConfig}