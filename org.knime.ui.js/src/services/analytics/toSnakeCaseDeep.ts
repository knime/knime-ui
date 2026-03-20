import { snakeCase } from "es-toolkit/string";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
};

export const toSnakeCaseDeep = (object: Record<string | number, unknown>) =>
  Object.entries(object).reduce((acc, [rawKey, rawValue]) => {
    const key = rawKey.toString();

    if (isPlainObject(rawValue)) {
      acc[snakeCase(key)] = toSnakeCaseDeep(rawValue);
    } else if (Array.isArray(rawValue)) {
      acc[snakeCase(key)] = rawValue.map((v) =>
        isPlainObject(v) ? toSnakeCaseDeep(v) : v,
      );
    } else {
      acc[snakeCase(key)] = rawValue;
    }

    return acc;
  }, {});
