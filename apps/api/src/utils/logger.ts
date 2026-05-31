import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');

const transport = new DailyRotateFile({
  filename: `${logDir}/%DATE%-app.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const errorTransport = new DailyRotateFile({
  filename: `${logDir}/%DATE%-error.log`,
  level: 'error',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d'
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    transport,
    errorTransport,
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export default logger;
