#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import fs from 'fs';
import path from 'path';
import { ServiceDetails } from './scrapers';

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

const listOfActions = Array.from(
  new Set(services.flatMap(service => Object.keys(service.actions)))
);

const otherEvents = [
  'DeleteExpiredKeyMaterial',
  'DeleteKey',
  'ReEncrypt',
  'RotateKey',
  'ConsoleLogin'
];

console.log('have', listOfActions.length, 'actions');

const buildUnion = (values: string[]): string =>
  values
    .map(v => `  | '${v}'`)
    .join('\n')
    .trim();

const contents = `
type AWSApiCallEventName =
  ${buildUnion(listOfActions)};

type AWSServiceEventName =
  ${buildUnion(otherEvents)};

export type AWSConsoleSigninEventName = 'ConsoleLogin';

export type AWSEventName =
  | AWSServiceEventName
  | AWSApiCallEventName
  | AWSConsoleSigninEventName;

export type AWSRegion = 'us-east-2' | 'ap-southeast-2';
export type CloudTrailEventType =
  | 'AwsApiCall'
  | 'AwsServiceEvent'
  | 'AwsConsoleSignin';
export type ManagementEventType =
  | 'AwsApiCall'
  | 'AwsConsoleAction'
  | 'AwsConsoleSignIn'
  | 'AwsServiceEvent';
`.trimStart();

fs.writeFileSync('unions.ts', contents);
