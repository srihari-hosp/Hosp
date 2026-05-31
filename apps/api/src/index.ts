import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { logger } from './logger/index.js';
import { createApp } from './app.js';

const loadEnv = (): void => {
  const candidates = [
    path.resolve(process.cwd(), '.env.development'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env.development'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
};

loadEnv();

const app = createApp();
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Server listening on port ' + PORT);
  logger.info('API started', { 
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    dbHost: (() => {
      try {
        return process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'unknown';
      } catch {
        return 'invalid-url';
      }
    })()
  });
});

server.on('error', (err) => {
  logger.error('Server failed to start or encountered an error:', { 
    error: err.message,
    stack: err.stack,
    code: (err as any).code
  });
  console.error('Server error:', err);
});

// --- GLOBAL ERROR HANDLERS ---

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { 
    promise, 
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      code: (reason as any).code
    } : reason 
  });
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { 
    error: err.message,
    stack: err.stack,
    code: (err as any).code
  });
  console.error('Uncaught Exception:', err);
  
  // Give logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});
