#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import fs from 'fs';
import path from 'path';
import { ServiceDetails } from './scrapers';

const outfile = 'all-actions.txt';
const SERVICE_DETAILS_OUT_DIR = './scraped/service-details';

const readInServiceDetails = (): ServiceDetails[] =>
  fs
    .readdirSync(SERVICE_DETAILS_OUT_DIR)
    .filter(name => name.endsWith('.json'))
    .map(
      name =>
        JSON.parse(
          fs.readFileSync(path.join(SERVICE_DETAILS_OUT_DIR, name), 'utf-8')
        ) as ServiceDetails
    );

const services = readInServiceDetails();

const isProbablyActuallyAnAction = (actionName: string): boolean => {
  const firstChar = actionName.charAt(0);

  // we use the index of the action prefixed with a '$' when we can't
  // determine the name of an action (which happens with a rowspan)
  if (['$', ' '].includes(firstChar)) {
    return false;
  }

  if (actionName.startsWith('SCENARIO')) {
    return false;
  }

  // actions start with uppercases
  return firstChar.length > 0 && firstChar === firstChar.toUpperCase();
};

console.log('read in the services of', services.length, 'services');

const listOfActions = services.flatMap(service => {
  const actions = Object.keys(service.actions).filter(action => {
    if (isProbablyActuallyAnAction(action)) {
      return true;
    }

    console.warn(
      `excluding ${service.servicePrefix}:${action} as it doesnt look like an action`
    );

    return false;
  });

  return actions.map(name => `${service.servicePrefix}:${name}`);
});

console.log('have', listOfActions.length, 'actions');

fs.writeFileSync(outfile, `${listOfActions.join('\n')}\n`);
