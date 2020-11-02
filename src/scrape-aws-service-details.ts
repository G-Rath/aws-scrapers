#!/usr/bin/env ts-node-transpile-only

import { promises as fs } from 'fs';
import path from 'path';
import {
  ServiceDetails,
  ServiceTopicScraper,
  ServiceTopicTuple,
  ServiceTopicsScraper
} from './scrapers';
import { chunk } from './utils';

const SERVICE_DETAILS_OUT_DIR = './scraped/service-details';

const writeToFile = async (details: ServiceDetails) => {
  const filePath = path.join(
    SERVICE_DETAILS_OUT_DIR,
    `${details.servicePrefix}.json`
  );

  await fs.writeFile(filePath, JSON.stringify(details, null, 2));

  console.log(
    `[${details.name}]:`,
    'wrote',
    Object.keys(details.actions).length,
    'actions to',
    filePath
  );
};

const scrapeDetailsInBatch = async (
  topics: ServiceTopicTuple[]
): Promise<ServiceDetails[]> =>
  topics.reduce<Promise<ServiceDetails[]>>(
    async (previousPromise, someTopic) => {
      const collectedDetails = await previousPromise;
      const scrapedDetails = await ServiceTopicScraper.scrape(...someTopic);

      await writeToFile(scrapedDetails);

      return collectedDetails.concat(scrapedDetails);
    },
    Promise.resolve([])
  );

const scapeDetailsInBatches = async (
  topics: ServiceTopicTuple[],
  batches: number
): Promise<ServiceDetails[]> => {
  const chunkSize = topics.length / batches;
  const chunks = chunk(topics, chunkSize);

  return (await Promise.all(chunks.map(scrapeDetailsInBatch))).flat();
};

const run = async () => {
  const topics = await ServiceTopicsScraper.scrape();

  console.log('found', topics.length, 'topics');

  const nonRelativeLinkedServiceTopics = topics.filter(
    ([, url]) => !url.startsWith('./')
  );

  if (nonRelativeLinkedServiceTopics.length) {
    console.warn(
      'found',
      nonRelativeLinkedServiceTopics.length,
      'topics that are not relatively linked'
    );
  }

  // topics.length = 10;

  const details = await scapeDetailsInBatches(topics, 5);

  // const details = await scapeDetailsInBatches(topics, 5);

  // await Promise.all(details.map(writeToFile));

  console.log('done', '(scraped the details of', details.length, 'topics)');
};

run().catch(console.error);
