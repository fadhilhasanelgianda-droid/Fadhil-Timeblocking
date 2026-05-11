import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bodyParser from 'body-parser';
import { getTimeBlocks, createTimeBlock, updateTimeBlock, deleteTimeBlock } from './server/sheetsService.js';
import dotenv from 'dotenv';
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/timeblocks', async (req, res) => {
    try {
      const blocks = await getTimeBlocks();
      res.json(blocks);
    } catch (error) {
      console.error('Failed to get timeblocks:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post('/api/timeblocks', async (req, res) => {
    try {
      const block = await createTimeBlock(req.body);
      res.status(201).json(block);
    } catch (error) {
      console.error('Failed to create timeblock:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.put('/api/timeblocks/:id', async (req, res) => {
    try {
      const block = await updateTimeBlock(req.params.id, req.body);
      if (!block) return res.status(404).json({ error: 'Not found' });
      res.json(block);
    } catch (error) {
      console.error('Failed to update timeblock:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/timeblocks/:id', async (req, res) => {
    try {
      const success = await deleteTimeBlock(req.params.id);
      if (!success) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete timeblock:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
