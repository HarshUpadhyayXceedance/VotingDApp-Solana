/**
 * Production-ready logging utility
 *
 * In development: Logs to console with colors and formatting
 * In production: Only logs errors and warnings, can be extended to send to external services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  electionId?: string;
  transactionId?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const minLogLevel: LogLevel = isProduction ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLogLevel];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Logger for development debugging
 * Automatically stripped in production builds
 */
export const logger = {
  /**
   * Debug level - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    console.log(formatMessage('debug', message, context));
  },

  /**
   * Info level - general information
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    console.info(formatMessage('info', message, context));
  },

  /**
   * Warning level - potential issues
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage('warn', message, context));
  },

  /**
   * Error level - errors and exceptions
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (!shouldLog('error')) return;

    const errorDetails = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack }
      : { errorMessage: String(error) };

    console.error(formatMessage('error', message, { ...context, ...errorDetails }));

    // In production, you could send errors to an external service
    if (isProduction) {
      // Example: Send to Sentry, LogRocket, etc.
      // captureException(error, { extra: context });
    }
  },

  /**
   * Log successful transaction
   */
  transaction(action: string, txId: string, context?: LogContext): void {
    this.info(`Transaction ${action} completed`, { ...context, transactionId: txId });
  },
};

/**
 * Utility to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if error is a specific Anchor/Solana error
 */
export function isAccountNotFoundError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes('does not exist') ||
    message.includes('Account not found') ||
    message.includes('not found') ||
    message.includes('AccountNotInitialized') ||
    message.includes('buffer length') ||
    message.includes('0x0')
  );
}
