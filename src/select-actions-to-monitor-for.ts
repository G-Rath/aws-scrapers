#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import fs from 'fs';
import { ALL_ACTIONS_FILE_PATH, SELECTED_ACTIONS_FILE_PATH } from './utils';

const readInListOfActions = (): string[] =>
  fs.readFileSync(ALL_ACTIONS_FILE_PATH, 'utf-8').trim().split('\n');

const servicesToIgnore = [];

const isListAction = (action: string): boolean => action.includes(':List');

const isTagAction = (action: string): boolean => {
  // this is a different type of "tag"
  if (action === 'ecr:PutImageTagMutability') {
    return false;
  }

  if (action.includes('Tag') || action.includes('Untag')) {
    return true;
  }

  return false;
};

const shouldMonitorAction = (action: string): boolean => {
  if (isListAction(action)) {
    return false;
  }

  if (isTagAction(action)) {
    return false;
  }

  return true;
};

const actions = readInListOfActions();

console.log('read in a list of', actions.length, 'actions');

const listOfActions = actions.filter(shouldMonitorAction);

console.log('selected', listOfActions.length, 'actions');

fs.writeFileSync(SELECTED_ACTIONS_FILE_PATH, `${listOfActions.join('\n')}\n`);
