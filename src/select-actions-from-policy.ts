#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import disparity from 'disparity';
import fs from 'fs';
import { ALL_ACTIONS_FILE_PATH, FileWatcher, hideCursor } from './utils';

interface ParsedArgs {
  pathToPolicy: string;
  watch: boolean;
  statementIndex: number;
}

const parseArgv = (argv: readonly string[]): ParsedArgs => {
  const parsedArgs: ParsedArgs = {
    pathToPolicy: '',
    watch: false,
    statementIndex: NaN
  };

  let previousFlag = null as string | null;

  argv.forEach(arg => {
    if (!arg.startsWith('-')) {
      if (previousFlag === '--statement') {
        parsedArgs.statementIndex = parseInt(arg);
      } else {
        parsedArgs.pathToPolicy = arg;
      }

      previousFlag = null;

      return;
    }

    // negative numbers start with an "-", so check them first
    if (previousFlag === '--statement') {
      const negativeIndex = parseInt(arg);

      if (isFinite(negativeIndex)) {
        parsedArgs.statementIndex = negativeIndex;
        previousFlag = null;

        return;
      }
    }

    previousFlag = arg;

    if (arg === '--no-watch') {
      parsedArgs.watch = false;

      return;
    }

    if (arg === '--watch') {
      parsedArgs.watch = true;

      return;
    }

    if (arg === '--statement') {
      return;
    }

    throw new Error(`"${arg}" is not a supported flag`);
  });

  if (previousFlag === '--statement') {
    throw new Error('--statement expects an index value');
  }

  console.log(parsedArgs);

  return parsedArgs;
};

const readInListOfActions = (): string[] =>
  fs.readFileSync(ALL_ACTIONS_FILE_PATH, 'utf-8').trim().split('\n');

const readPolicyJsonFromFile = (policyFilePath: string): IAMPolicy => {
  const contents = fs
    .readFileSync(policyFilePath, 'utf-8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  return JSON.parse(contents) as IAMPolicy;
};

interface PolicyStatement {
  Effect: 'Allow' | 'Block';
  Action: string[];
  Resource: string | string[];
}

interface IAMPolicy {
  Version: string;
  Statement: PolicyStatement[];
}

const listOfActions = readInListOfActions();

const matchActions = (statementAction: string): string[] => {
  const regexp = new RegExp(statementAction.replace(/\*/gu, '.*'), 'iu');

  return listOfActions.filter(action => regexp.test(action));
};

const selectActionsForStatement = (statement: PolicyStatement): string[] => {
  const statementActions = Array.isArray(statement.Action)
    ? statement.Action
    : [statement.Action];

  return Array.from(
    new Set(
      statementActions.flatMap(statementAction => {
        if (statementAction.includes('*')) {
          return matchActions(statementAction);
        }

        return [statementAction];
      })
    )
  ).sort((a, b) => a.localeCompare(b));
};

const { pathToPolicy, statementIndex, watch } = parseArgv(process.argv);

const selectActionsForPolicy = (policyFilePath: string): string[][] => {
  const policy = readPolicyJsonFromFile(policyFilePath);
  const index =
    statementIndex < 0
      ? policy.Statement.length - statementIndex - 2
      : statementIndex;

  console.log(index);

  const statements = isNaN(index)
    ? policy.Statement
    : [policy.Statement[index]];

  return statements.map(statement => selectActionsForStatement(statement));
};

let currentActions: string[][] | null = selectActionsForPolicy(pathToPolicy);
let previousActions: string[][] | null = null;

if (!watch) {
  console.log(currentActions);

  // eslint-disable-next-line node/no-process-exit
  process.exit();
}

const compareArrays = (a: unknown[], b: unknown[]): string => {
  const stringifiedA = JSON.stringify(a, null, 2);
  const stringifiedB = JSON.stringify(b, null, 2);

  if (stringifiedA === stringifiedB) {
    return stringifiedA;
  }

  return disparity.unified(stringifiedA, stringifiedB, {
    paths: ['previous', 'current'],
    context: Infinity
  });
};

const refresh = (): void => {
  const output = [Date(), `Watching contents of ${pathToPolicy} for changes`];

  previousActions = currentActions;
  currentActions = selectActionsForPolicy(pathToPolicy);

  if (previousActions) {
    output.push('-'.repeat(61), compareArrays(previousActions, currentActions));
  }

  console.clear();
  console.log(output.join('\n'));
};

FileWatcher.watchForChanges(pathToPolicy, refresh);

hideCursor();
refresh();
