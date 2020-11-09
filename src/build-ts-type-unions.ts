#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import fs from 'fs';
import { UNION_TS_FILE_PATH, readInServiceDetails } from './utils';

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

fs.writeFileSync(UNION_TS_FILE_PATH, contents);
