import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    // Direct messaging
    socket.on('send_direct_message', (data) => {
      io.to(data.receiverId).emit('direct_message', data);
    });

    socket.on('typing', (data) => {
      io.to(data.receiverId).emit('user_typing', { senderId: data.senderId });
    });

    socket.on('stop_typing', (data) => {
      io.to(data.receiverId).emit('user_stop_typing', { senderId: data.senderId });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
