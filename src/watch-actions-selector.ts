#!/usr/bin/env ts-node-transpile-only
import { spawnSync } from 'child_process';
import { FileWatcher, hideCursor } from './utils';

const pathToScript = 'src/select-actions-to-monitor-for.ts';

const selectActions = () => {
  const { stdout } = spawnSync(pathToScript, {
    // stdio: 'inherit',
    encoding: 'utf-8'
  });

  return stdout;
};

const formatSpawnOutput = (output: string): Array<string | number> => {
  const split = output.split(' ');

  return split.map(bit => {
    const maybeNumber = parseInt(bit);

    if (isNaN(maybeNumber)) {
      return bit;
    }

    return maybeNumber;
  });
};

const refresh = (): void => {
  const output = [Date(), `Watching contents of ${pathToScript} for changes`];
  const spawnOutput = selectActions();
  const formattedOutput = formatSpawnOutput(spawnOutput);

  console.clear();
  console.log(output.join('\n'));
  console.log(...formattedOutput);
};

FileWatcher.watchForChanges(pathToScript, refresh);

hideCursor();
refresh();
