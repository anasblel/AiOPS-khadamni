import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { initSocket } from './src/socket.js';

import authRoutes from './src/routes/auth.js';
import providerRoutes from './src/routes/providers.js';
import bookingRoutes from './src/routes/bookings.js';
import chatRoutes from './src/routes/chat.js';
import notificationRoutes from './src/routes/notifications.js';

const app = express();
const httpServer = createServer(app);

// Initialize socket.io via shared module
const io = initSocket(httpServer);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Connect to MongoDB then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    httpServer.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error('MongoDB error:', err));