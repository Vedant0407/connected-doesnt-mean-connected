import express from 'express';
import cors from 'cors';
import { healthRoutes } from './routes/healthRoutes.js';
import { networkRoutes } from './routes/networkRoutes.js';
import { diagnosticsRoutes } from './routes/diagnosticsRoutes.js';
import { capturesRoutes } from './routes/capturesRoutes.js';
import { scenariosRoutes } from './routes/scenariosRoutes.js';
import { reportsRoutes } from './routes/reportsRoutes.js';
import { labRoutes } from './routes/labRoutes.js';
import { Logger } from './utils/logger.js';

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    Logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api', networkRoutes);
app.use('/api', diagnosticsRoutes);
app.use('/api', capturesRoutes);
app.use('/api', scenariosRoutes);
app.use('/api', reportsRoutes);
app.use('/api', labRoutes);

// Catch-all 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  Logger.error(`Unhandled error: ${err.message}`, err.stack);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected server error occurred',
  });
});
