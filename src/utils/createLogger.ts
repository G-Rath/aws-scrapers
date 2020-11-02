export interface Logger {
  log: typeof console['log'];
  warn: typeof console['warn'];
}

export const createLogger = (prefix: string): Logger => {
  const formattedPrefix = `[${prefix}]:`;

  return {
    log(...messages: unknown[]) {
      console.log(formattedPrefix, ...messages);
    },
    warn(...messages: unknown[]) {
      console.warn(formattedPrefix, ...messages);
    }
  };
};
