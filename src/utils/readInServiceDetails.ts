/* eslint-disable node/no-sync */

import fs from 'fs';
import path from 'path';
import { ServiceDetails } from '../scrapers';
import { SERVICE_DETAILS_DIR } from './constants';

export const readInServiceDetails = (): ServiceDetails[] =>
  fs
    .readdirSync(SERVICE_DETAILS_DIR)
    .filter(name => name.endsWith('.json'))
    .map(
      name =>
        JSON.parse(
          fs.readFileSync(path.join(SERVICE_DETAILS_DIR, name), 'utf-8')
        ) as ServiceDetails
    );
