import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load local env for dev
dotenv.config({ path: '.env.local' });

// Import serverless-style handlers and adapt to Express
import optimizeHandler from './optimize.js';
import contactHandler from './contact.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Wrap the Vercel-style handler(req, res) for Express
function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('API route error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}

// API routes
app.post('/api/optimize', wrap(optimizeHandler));
app.post('/api/contact', wrap(contactHandler));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔌 Dev API server running at http://localhost:${PORT}`);
  console.log('➡ Routes:');
  console.log('   POST /api/optimize');
  console.log('   POST /api/contact');
});

