#!/usr/bin/env ts-node-transpile-only
/* eslint-disable node/no-sync */

import fs from 'fs';
import { UNION_TS_FILE_PATH, readInServiceDetails } from './utils';

const services = readInServiceDetails();

console.log('read in the services of', services.length, 'services');

const listOfActions = Array.from(
  new Set(services.flatMap(service => Object.keys(service.actions)))
);

console.log('have', listOfActions.length, 'actions');

const buildUnion = (values: string[]): string =>
  values
    .map(v => `  | '${v}'`)
    .join('\n')
    .trim();

type Union = [name: string, values: string[]];

const unions: Union[] = [
  ['AWSApiCallEventName', listOfActions],
  [
    'AWSServiceEventName',
    [
      'DeleteExpiredKeyMaterial',
      'DeleteKey',
      'ReEncrypt',
      'RotateKey',
      'ConsoleLogin'
    ]
  ],
  ['AWSConsoleSignInEventName', ['ConsoleLogin', 'SwitchRole', 'CheckMfa']],
  [
    'AWSRegion',
    [
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2',
      'ap-southeast-1',
      'ap-southeast-2'
    ]
  ],
  [
    'CloudTrailEventType',
    ['AwsApiCall', 'AwsServiceEvent', 'AwsConsoleSignIn']
  ],
  [
    'ManagementEventType',
    ['AwsApiCall', 'AwsConsoleAction', 'AwsConsoleSignIn', 'AwsServiceEvent']
  ]
];

const AWSEventNameUnion = `
export type AWSEventName =
  | AWSServiceEventName
  | AWSApiCallEventName
  | AWSConsoleSignInEventName;
`.trimStart();

const contents = unions
  .map(([name, values]) => `export type ${name} =\n  ${buildUnion(values)};`)
  .concat(AWSEventNameUnion)
  .join('\n\n');

fs.writeFileSync(UNION_TS_FILE_PATH, contents);
