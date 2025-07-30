// Simple Socket.IO Server for WebRTC Signaling
// This would typically run on your backend server
// For development, you can run this with: node src/server/socket-server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for the Socket.IO server
const io = socketIo(server, {
  cors: {
    origin: "*", // Vite dev server
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());

// Store rooms and users
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    rooms.get(roomId).add(socket.id);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId: socket.id });
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Leave a room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }
    
    // Notify others in the room
    socket.to(roomId).emit('user-left', { userId: socket.id });
    
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // WebRTC signaling events
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      userId: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      userId: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      userId: socket.id
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from all rooms
    for (const [roomId, users] of rooms.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit('user-left', { userId: socket.id });
        
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log(`- WebSocket: ws://localhost:${PORT}`);
  console.log('- Ready for WebRTC signaling');
});