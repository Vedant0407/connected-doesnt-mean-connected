export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export class Logger {
  private static formatTime(): string {
    return new Date().toISOString();
  }

  static info(message: string, meta?: unknown): void {
    console.log(`[${this.formatTime()}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static warn(message: string, meta?: unknown): void {
    console.warn(`[${this.formatTime()}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static error(message: string, meta?: unknown): void {
    console.error(`[${this.formatTime()}] [ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  static debug(message: string, meta?: unknown): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`[${this.formatTime()}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
}
