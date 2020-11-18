import fs from 'fs';

export class FileWatcher {
  private static readonly _self = new FileWatcher();

  private readonly _debounceTimers: Record<string, NodeJS.Timer> = {};

  public static watchForChanges(filepath: string, onChange: () => void): void {
    this._self._watchForChanges(filepath, onChange);
  }

  private _watchForChanges(filepath: string, onChange: () => void): void {
    if (filepath in this._debounceTimers) {
      console.warn('clearing timer');

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._debounceTimers[filepath];
    }

    fs.watch(filepath).on('change', () => {
      this._refreshDebounceTimer(filepath, onChange);
    });
  }

  private _refreshDebounceTimer(filepath: string, callback: () => void): void {
    if (filepath in this._debounceTimers) {
      this._debounceTimers[filepath].refresh();

      return;
    }

    this._debounceTimers[filepath] = setTimeout(callback, 0);
  }
}
