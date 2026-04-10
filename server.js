import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

import connectDB from './config/db.js';
import traineeRoutes from './routes/traineeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import queryRoutes from './routes/queryRoutes.js';

// ES Module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialise App
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to req
app.use((req, res, next) => {
    req.io = io;
    next();
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', traineeRoutes);
app.use('/api/queries', queryRoutes);

// Socket Connection
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
});

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});