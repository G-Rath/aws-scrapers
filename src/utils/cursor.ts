export const showCursor = (): boolean => process.stdout.write('\x1b[?25h');
export const hideCursor = (): boolean => process.stdout.write('\x1b[?25l');
