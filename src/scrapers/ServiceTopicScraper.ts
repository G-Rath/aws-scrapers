import cheerio from 'cheerio';
import { Logger, createLogger, getWebpage } from '../utils';

export interface ServiceAction {
  name: string;
  topics: string[];
  description: string;
  accessLevel: string;
  resourceTypes: string[];
  conditionKeys: string;
  dependentActions: string;
}

export interface ServiceDetails {
  actions: Record<string, ServiceAction>;
  servicePrefix: string;
  topics: string[];
}

const selectTagElements = (elements: cheerio.Element[]): cheerio.TagElement[] =>
  elements.filter((ele): ele is cheerio.TagElement => ele.type === 'tag');

export class ServiceTopicScraper {
  private readonly _name: string;
  private readonly _url: string;
  private readonly _logger: Logger;

  public static async scrape(
    name: string,
    url: string
  ): Promise<ServiceDetails> {
    return new this(name, url).scrape();
  }

  public constructor(name: string, url: string) {
    this._name = name;
    this._url = url;

    this._logger = createLogger(this._name);
  }

  public async scrape(): Promise<ServiceDetails> {
    this._logger.log('scraping topic');

    const $ = cheerio.load(await getWebpage(this._url));

    const servicePrefix = this._scapeServicePrefix($);
    const actions = this._scrapeServiceActions($);

    this._logger.log('scraped topic');

    return {
      servicePrefix,
      actions: actions.reduce(
        (m, action) => ({ ...m, [action.name]: action }),
        {}
      ),
      topics: [this._name]
    };
  }

  private _scapeServicePrefix($: cheerio.Root): string {
    const firstCodeElement = $('code.code').get(0) as
      | cheerio.Element
      | undefined;

    if (!firstCodeElement || firstCodeElement.type === 'text') {
      console.warn(
        'unable to find service prefix: failed to find any code elements'
      );

      return '';
    }

    if (firstCodeElement.children.length > 1) {
      console.warn('code element has more than one child');
    }

    const { data } = firstCodeElement.firstChild ?? {};

    if (!data) {
      this._logger.warn(
        'unable to find service prefix: code element child has no data'
      );

      return '';
    }

    return data;
    // document.getElementsByClassName('code')[0].parentElement.textContent;
  }

  private _scrapeServiceActions($: cheerio.Root): ServiceAction[] {
    const $tableContainer = $(
      'a[href="./reference_policies_actions-resources-contextkeys.html#actions_table"]'
    )
      .parent()
      .next();

    if (!$tableContainer.hasClass('table-container')) {
      this._logger.warn('was unable to find actions table container');

      return [];
    }

    const $table = $tableContainer.find('table');

    if ($table.length === 0) {
      this._logger.warn('was unable to find actions table');

      return [];
    }

    if ($table.length > 1) {
      this._logger.warn('found more than 1 actions table');
    }

    const numOfHeaders = $table.find('th').length;

    if (numOfHeaders !== 6) {
      this._logger.warn(
        `found ${numOfHeaders > 6 ? 'more' : 'less'} than 6 headers`
      );
    }

    const rowElements = selectTagElements(
      $table.find('tbody').find('tr').get() as cheerio.Element[]
    );

    // const groupedRowElements = this._groupRowsBasedOnRowSpans($, rowElements);
    //
    // return groupedRowElements.map(([start, ...group], index) => {
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
    //   const action: ServiceAction = {
    //     name: this._getActionName($, nameElement, index),
    //     description,
    //     accessLevel,
    //     resourceTypes: [resourceTypes].filter(s => !!s),
    //     conditionKeys,
    //     dependentActions
    //   };
    //
    //   return action;
    // });

    let rowsBeingSpanned = 1;

    return rowElements
      .map(element => selectTagElements(element.children))
      .filter(([firstElement]) => {
        if (rowsBeingSpanned > 1) {
          rowsBeingSpanned -= 1;

          return false;
        }

        rowsBeingSpanned = parseInt($(firstElement).attr('rowspan') ?? '');

        if (isNaN(rowsBeingSpanned)) {
          rowsBeingSpanned = 1;
        }

        return true;
      })
      .map(
        ([nameElement, ...rest], index): ServiceAction => {
          const [
            description,
            accessLevel,
            resourceTypes,
            conditionKeys,
            dependentActions
          ] = rest.map(ele => $(ele).text().trim());

          return {
            name: this._getActionName($, nameElement, index),
            topics: [this._name],
            description,
            accessLevel,
            resourceTypes: [resourceTypes].filter(s => !!s),
            conditionKeys,
            dependentActions
          };
        }
      );
  }

  private _groupRowsBasedOnRowSpans(
    $: cheerio.Root,
    rowElements: cheerio.Element[]
  ): cheerio.Element[][] {
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
  }

  private _countColumnsSpanned(
    $: cheerio.Root,
    element: cheerio.TagElement
  ): number {
    return selectTagElements(element.children).findIndex(
      ele => $(ele).attr('rowspan') === undefined
    );
  }

  private _getActionName(
    $: cheerio.Root,
    tableRowElement: cheerio.TagElement,
    index: number
  ): string {
    const [firstTag] = selectTagElements(tableRowElement.children);
    const text = $(tableRowElement).text().trim() || `$${index}`;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!firstTag) {
      this._logger.warn('element does not have firstTag');

      return text;
    }

    if (firstTag.tagName !== 'a') {
      this._logger.warn('got', firstTag.tagName, 'instead of a tag');

      return text;
    }

    const { id } = firstTag.attribs;

    if (!id) {
      this._logger.warn('first element does not have an id');

      return text;
    }

    return id.split('-').pop() ?? text;
  }
}
