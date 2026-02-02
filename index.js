import express from 'express';
import cors from 'cors';
import config from './src/config/env.js';
import uploadRouter from './src/routes/upload.js';
import authRouter from './src/routes/authRoutes.js';
import notesRouter from './src/routes/notesRoutes.js';

const app = express();
const PORT = config.PORT;

// CORS — allows our React frontend to talk to this server
app.use(
  cors({
    origin: 'http://localhost:5173', // Vite dev server
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/upload', uploadRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Notivate server is running 🚀' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Notivate server running on http://localhost:${PORT}`);
  console.log(`📁 Upload endpoint: POST http://localhost:${PORT}/api/upload`);
});

export default app;
