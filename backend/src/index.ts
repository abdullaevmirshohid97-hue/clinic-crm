import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import logger from './config/logger';
import routes from './routes';
import { errorHandler } from './middleware/error';
import { initScheduler } from './config/scheduler';
import { apiRateLimit, authRateLimit } from './middleware/rateLimit.middleware';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global API Rate Limit
app.use(apiRateLimit);

// Auth Rate Limit (stricter)
app.use('/api/v1/auth', authRateLimit);

// Main Routes (API v1)
app.use('/api/v1', routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

// Start Server (Don't block on scheduler case Redis is down)
const port = env.PORT;
app.listen(port, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
});

initScheduler().catch((err) => {
  logger.error('Failed to initialize scheduler (Redis might be down)', err);
});

export default app;
