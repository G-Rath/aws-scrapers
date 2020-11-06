import { ServiceAction, ServiceDetails } from '../scrapers';

const mergeStrings = (a: string, b: string): string => {
  if (a === b) {
    return a;
  }

  return `${a} ${b}`.trim();
};

const mergeArrays = <A, B>(a: A[], b: B[]): Array<A | B> => {
  return Array.from(new Set([...a, ...b]));
};

const mergeActions = (a: ServiceAction, b: ServiceAction): ServiceAction => ({
  name: mergeStrings(a.name, b.name),
  topics: mergeArrays(a.topics, b.topics),
  description: mergeStrings(a.description, b.description),
  accessLevel: mergeStrings(a.accessLevel, b.accessLevel),
  resourceTypes: mergeArrays(a.resourceTypes, b.resourceTypes),
  conditionKeys: mergeStrings(a.conditionKeys, b.conditionKeys),
  dependentActions: mergeStrings(a.dependentActions, b.dependentActions)
});

const mergeActionRecords = (
  a: Record<string, ServiceAction>,
  b: Record<string, ServiceAction>
): Record<string, ServiceAction> => {
  const c = { ...a };

  Object.entries(b).forEach(([k, v]) => {
    c[k] = k in c ? mergeActions(c[k], v) : v;
  });

  // return c;

  Object.keys(a).forEach(key => {
    if (key in b) {
      if (JSON.stringify(a[key]) === JSON.stringify(b[key])) {
        console.log(key, 'things are the same');
      }
    }
  });

  return {
    ...a,
    ...b
  };
};

const sortObject = <T>(obj: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );

export const mergeDetails = (
  a: ServiceDetails,
  b: ServiceDetails
): ServiceDetails => {
  if (a.servicePrefix !== b.servicePrefix) {
    throw new Error("can't merge details on different services");
  }

  const c = JSON.parse(JSON.stringify(a)) as ServiceDetails;

  c.topics = c.topics.concat(b.topics);
  c.actions = {
    ...a.actions,
    ...b.actions
  };

  c.actions = mergeActionRecords(a.actions, b.actions);
  c.actions = sortObject(c.actions);

  return c;
};
