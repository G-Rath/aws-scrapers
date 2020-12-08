import cheerio from 'cheerio';
import { getWebpage } from '../utils';

export type ServiceTopicTuple = [name: string, url: string];

export class ServiceTopicsScraper {
  public static async scrape(): Promise<ServiceTopicTuple[]> {
    return new this().scrape();
  }

  public async scrape(): Promise<ServiceTopicTuple[]> {
    const data = await getWebpage(
      'reference_policies_actions-resources-contextkeys.html'
    );

    const $ = cheerio.load(data);

    const $highlightsList = $('.highlights ul');

    if ($highlightsList.length !== 1) {
      throw new Error('found more than one element matching ".highlights ul"');
    }

    return ($highlightsList.find('li a').get() as cheerio.Element[])
      .filter((ele): ele is cheerio.TagElement => ele.type === 'tag')
      .map(element => [element.firstChild?.data, element.attribs.href])
      .filter((topic): topic is ServiceTopicTuple => {
        if (!topic[1]) {
          console.warn('skipping', topic[0], 'as topic has no link');

          return false;
        }

        return true;
      });
  }
}
