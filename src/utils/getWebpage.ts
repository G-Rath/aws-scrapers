import { strict as assert } from 'assert';
import axios from 'axios';
import crypto from 'crypto';
import { promises as fs, mkdirSync } from 'fs';
import path from 'path';

const hashString = (str: string): string =>
  crypto.createHash('md5').update(str).digest('hex');

const cacheDirPostfix = process.env.CACHE_DIR_POSTFIX ?? 1;

const cacheDir = `./.tmp/docs-cache-${cacheDirPostfix}/`;

// ensure the cache dir exists
mkdirSync(cacheDir, { recursive: true });

const client = axios.create({
  baseURL: 'https://docs.aws.amazon.com/service-authorization/latest/reference/'
});

export const getWebpage = async (
  url: string,
  cache = true
): Promise<string> => {
  const hash = hashString(url);
  const cachedFile = path.join(cacheDir, `${hash}.html`);

  try {
    assert.ok(cache, 'we should not use the cache');

    return await fs.readFile(cachedFile, 'utf-8');
  } catch {
    const { data } = await client.get<string>(url);

    await fs.writeFile(cachedFile, data);

    return data;
  }
};
