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

console.log('read in the services of', services.length, 'services');

const listOfActions = services.flatMap(service =>
  Object.keys(service.actions).map(name => `${service.servicePrefix}:${name}`)
);

console.log('have', listOfActions.length, 'actions');

fs.writeFileSync(outfile, `${listOfActions.join('\n')}\n`);
