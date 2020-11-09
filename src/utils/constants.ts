import path from 'path';

export const OUT_DIR = 'scraped';

export const SERVICE_DETAILS_DIR = path.join(OUT_DIR, 'service-details');

const UNION_TS_FILE_NAME = 'union.ts';
const ALL_ACTIONS_FILE_NAME = 'all-actions.txt';
const SELECTED_ACTIONS_FILE_NAME = 'selected-actions.txt';

export const UNION_TS_FILE_PATH = path.join(OUT_DIR, UNION_TS_FILE_NAME);
export const ALL_ACTIONS_FILE_PATH = path.join(OUT_DIR, ALL_ACTIONS_FILE_NAME);
export const SELECTED_ACTIONS_FILE_PATH = path.join(
  OUT_DIR,
  SELECTED_ACTIONS_FILE_NAME
);
