export const randomValue = (values: any[] | Readonly<any[]>) =>
  values.at(Math.floor(Math.random() * values.length));

export const arrayToDictionary = <T, K extends keyof T>(
  array: T[],
  property: K,
): { [key: string]: T } => {
  return array.reduce(
    (acc, item) => ({ ...acc, [String(item[property])]: item }),
    {},
  );
};
