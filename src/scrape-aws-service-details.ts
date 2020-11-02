#!/usr/bin/env ts-node-transpile-only

import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger, chunk, createLogger, getWebpage } from './utils';

const SERVICE_DETAILS_OUT_DIR = './scraped/service-details';

interface ServiceAction {
  name: string;
  description: string;
  accessLevel: string;
  resourceTypes: string[];
  conditionKeys: string;
  dependentActions: string;
}

interface ServiceDetails {
  actions: Record<string, ServiceAction>;
  servicePrefix: string;
  name: string;
}

type ServiceTopicTuple = [name: string, url: string];

const scrapeServiceTopics = async (): Promise<ServiceTopicTuple[]> => {
  const data = await getWebpage(
    'reference_policies_actions-resources-contextkeys.html'
  );

  const $ = cheerio.load(data);

  const $highlightsList = $('.highlights ul');

  if ($highlightsList.length !== 1) {
    throw new Error('found more than one element matching ".highlights ul"');
  }

  return ($highlightsList.find('li a').get() as cheerio.Element[])
    .map(element => [element.firstChild.data, element.attribs.href])
    .filter((topic): topic is ServiceTopicTuple => {
      if (!topic[1]) {
        console.warn('skipping', topic[0], 'as topic has no link');

        return false;
      }

      return true;
    });
};

const scapeServicePrefix = (
  $: cheerio.Root,
  name: string,
  logger: Logger
): string => {
  const firstCodeElement = $('code.code').get(0) as cheerio.Element | undefined;

  if (!firstCodeElement) {
    console.warn(
      'unable to find service prefix: failed to find any code elements'
    );

    return '';
  }

  if (firstCodeElement.children.length > 1) {
    console.warn('code element has more than one child');
  }

  const { data } = firstCodeElement.firstChild;

  if (!data) {
    logger.warn(
      'unable to find service prefix: code element child has no data'
    );

    return '';
  }

  return data;
  // document.getElementsByClassName('code')[0].parentElement.textContent;
};

const selectTagElements = (elements: cheerio.Element[]): cheerio.Element[] =>
  elements.filter(element => element.type === 'tag');

const groupRowsBasedOnRowSpans = (
  $: cheerio.Root,
  rowElements: cheerio.Element[]
): cheerio.Element[][] => {
  const elements: cheerio.Element[][] = [];
  let rowspan = 1;

  rowElements.forEach(rowElement => {
    rowspan -= 1;
    rowspan ||= 1;

    if (rowspan === 1) {
      elements.unshift([]);
    }

    rowspan = parseInt($(rowElement).attr('rowspan') ?? '1');

    elements[0].push(rowElement);
  });

  return elements.reverse();
};

const countColumnsSpanned = (
  $: cheerio.Root,
  element: cheerio.Element
): number => {
  return selectTagElements(element.children).findIndex(
    ele => $(ele).attr('rowspan') === undefined
  );
};

const scrapeServiceActions = (
  $: cheerio.Root,
  name: string,
  logger: Logger
): ServiceAction[] => {
  const $tableContainer = $(
    'a[href="./reference_policies_actions-resources-contextkeys.html#actions_table"]'
  )
    .parent()
    .next();

  if (!$tableContainer.hasClass('table-container')) {
    logger.warn('was unable to find actions table container');

    return [];
  }

  const $table = $tableContainer.find('table');

  if ($table.length === 0) {
    logger.warn('was unable to find actions table');

    return [];
  }

  if ($table.length > 1) {
    logger.warn('found more than 1 actions table');
  }

  const numOfHeaders = $table.find('th').length;

  if (numOfHeaders !== 6) {
    logger.warn(`found ${numOfHeaders > 6 ? 'more' : 'less'} than 6 headers`);
  }

  const rowElements = $table
    .find('tbody')
    .find('tr')
    .get() as cheerio.Element[];

  // const groupedRowElements = groupRowsBasedOnRowSpans($, rowElements);
  //
  // return groupedRowElements.map(([start, ...group]) => {
  //   // const columnsSpanned = countColumnsSpanned($, start);
  //   const [nameElement, ...rest] = selectTagElements(start.children);
  //
  //   const [
  //     description,
  //     accessLevel,
  //     resourceTypes,
  //     conditionKeys,
  //     dependentActions
  //   ] = rest.map(ele => $(ele).text().trim());
  //
  //   const action: TopicAction = {
  //     name: getActionName($, nameElement, logger),
  //     description,
  //     accessLevel,
  //     resourceTypes: [resourceTypes].filter(s => !!s),
  //     conditionKeys,
  //     dependentActions
  //   };
  //
  //   return action;
  // });

  // // todo: somehow handle row span :/
  return rowElements
    .map(element => selectTagElements(element.children))
    .map(
      ([nameElement, ...rest]): ServiceAction => {
        const [
          description,
          accessLevel,
          resourceTypes,
          conditionKeys,
          dependentActions
        ] = rest.map(ele => $(ele).text().trim());

        return {
          name: getActionName($, nameElement, logger),
          description,
          accessLevel,
          resourceTypes: [resourceTypes].filter(s => !!s),
          conditionKeys,
          dependentActions
        };
      }
    );
};

const getActionName = (
  $: cheerio.Root,
  tableRowElement: cheerio.Element,
  logger: Logger
): string => {
  const [firstTag] = selectTagElements(tableRowElement.children);
  const text = $(tableRowElement).text().trim() || `$${Date.now().toString()}`;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!firstTag) {
    logger.warn('element does not have firstTag');

    return text;
  }

  if (firstTag.tagName !== 'a') {
    logger.warn('got', firstTag.tagName, 'instead of a tag');

    return text;
  }

  const { id } = firstTag.attribs;

  if (!id) {
    logger.warn('first element does not have an id');

    return text;
  }

  return id.split('-').pop() ?? text;
};

const scrapeServiceDetails = async ([name, url]: ServiceTopicTuple): Promise<
  ServiceDetails
> => {
  const logger = createLogger(name);

  logger.log('scraping actions');

  const data = await getWebpage(url);

  const $ = cheerio.load(data);

  const servicePrefix = scapeServicePrefix($, name, logger);
  const actions = scrapeServiceActions($, name, logger);

  logger.log('scraped actions');

  return {
    servicePrefix,
    actions: actions.reduce(
      (m, action) => ({ ...m, [action.name]: action }),
      {}
    ),
    name
  };
};

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

const scrapeAndSaveTopic = async (topic: ServiceTopicTuple): Promise<void> => {
  const details = await scrapeServiceDetails(topic);

  await writeToFile(details);
};

const scrapeAndSaveDetails = async (
  topics: ServiceTopicTuple[]
): Promise<void> => {
  await topics.reduce<Promise<unknown>>(
    async (p, someTopic) => p.then(async () => scrapeAndSaveTopic(someTopic)),
    Promise.resolve()
  );
};

const scrapeAndSaveDetailsInBatch = async (
  topics: ServiceTopicTuple[],
  batches: number
): Promise<void> => {
  const chunkSize = topics.length / batches;
  const chunks = chunk(topics, chunkSize);

  await Promise.all(chunks.map(scrapeAndSaveDetails));
};

const scrapeDetailsInBatch = async (
  topics: ServiceTopicTuple[]
): Promise<ServiceDetails[]> =>
  topics.reduce<Promise<ServiceDetails[]>>(
    async (p, someTopic) =>
      p.then(async arr => arr.concat(await scrapeServiceDetails(someTopic))),
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
  const topics = await scrapeServiceTopics();

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

  await scrapeAndSaveDetailsInBatch(topics, 5);

  // const details = await scapeDetailsInBatches(topics, 5);

  // await Promise.all(details.map(writeToFile));

  console.log('done');
};

run().catch(console.error);
