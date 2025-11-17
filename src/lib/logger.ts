import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ["password", "token", "key", "secret"],
});

export { logger };

export const createLogger = (context: Record<string, any>) => {
  return logger.child(context);
};