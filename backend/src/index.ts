import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import logger from './config/logger';
import routes from './routes';
import { errorHandler } from './middleware/error';
import { initScheduler } from './config/scheduler';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api/v1', routes);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
const port = env.PORT;
initScheduler().then(() => {
  app.listen(port, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
  });
}).catch((err) => {
  logger.error('Failed to initialize scheduler', err);
});

export default app;
