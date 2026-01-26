import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/database.js';
import okrsRouter from './routes/okrs.js';
import initiativesRouter from './routes/initiatives.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.use('/api/okrs', okrsRouter);
app.use('/api/initiatives', initiativesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
