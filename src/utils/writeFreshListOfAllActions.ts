import fs from 'fs';
import { ALL_ACTIONS_FILE_PATH, readInServiceDetails } from '.';

export const writeFreshListOfAllActions = (): void => {
  const services = readInServiceDetails();

  console.log('-- read details of', services.length, 'services --');

  const listOfActions = services.flatMap(service =>
    Object.keys(service.actions).map(name => `${service.servicePrefix}:${name}`)
  );

  console.log('-- wrote list of', listOfActions.length, 'api call events --');

  // eslint-disable-next-line node/no-sync
  fs.writeFileSync(ALL_ACTIONS_FILE_PATH, `${listOfActions.join('\n')}\n`);
};
