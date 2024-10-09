const hasAllObjectPropertiesDefined = <T extends Object>(
  object: T,
): object is Required<T> => {
  // eslint-disable-next-line no-undefined
  return Object.values(object).every((prop) => prop !== undefined);
};

export { hasAllObjectPropertiesDefined };
