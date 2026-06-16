class ScopedLogger {
  private scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  private isDev(): boolean {
    return process.env.NODE_ENV === "development";
  }

  log(message: string, ...args: unknown[]): void {
    if (this.isDev()) {
      console.log(`%c[${this.scope}]`, "color: #4f46e5; font-weight: bold;", message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isDev()) {
      console.warn(`%c[${this.scope}]`, "color: #f59e0b; font-weight: bold;", message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.isDev()) {
      console.error(`%c[${this.scope}]`, "color: #ef4444; font-weight: bold;", message, ...args);
    }
  }
}

export function createLogger(scope: string): ScopedLogger {
  return new ScopedLogger(scope);
}
