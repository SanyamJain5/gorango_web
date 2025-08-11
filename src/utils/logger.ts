import winston from "winston";

const { combine, timestamp, json, printf } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} ${level}: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), json(), myFormat),
  transports: [
    new winston.transports.Console()
  ]
});
