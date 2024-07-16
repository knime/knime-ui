import { vi, type Mock } from "vitest";

// utility type to detect a Function
type FunctionType<T> = T extends (...args: any[]) => any ? T : never;

// utility type to deeply set all functions inside an object as a Mock type
type DeepMocked<T> = T extends object
  ? {
      // detect arrays first since objects are also arrays
      [P in keyof T]: T[P] extends Array<any>
        ? // if array simply return the array as-is
          T[P]
        : // else, if it's a function then set its type to be a Mock
        T[P] extends FunctionType<T[P]>
        ? Mock<any>
        : // otherwise it's an object so recursively set the type
          DeepMocked<T[P]>;
    }
  : T;

export const createDeepMock = <T extends Record<string, any>>(
  source: T,
): DeepMocked<T> => {
  const isFunction = (value: unknown) => typeof value === "function";
  const isObject = (value: unknown) =>
    value !== null && typeof value === "object";

  const recurse = (_source: T) => {
    const mock = {};

    // function
    if (isFunction(_source)) {
      return vi.fn();
    }

    // primitive
    if (!Array.isArray(_source) && !isObject(_source)) {
      return _source;
    }

    // object
    for (const [key, value] of Object.entries(_source)) {
      if (isFunction(value)) {
        // @ts-ignore
        mock[key] = vi.fn();
      }

      if (Array.isArray(value)) {
        // @ts-ignore
        mock[key] = value.map(recurse);
        // skip to next iteration to avoid Object check
        // because arrays are also objects
        continue;
      }

      if (isObject(value)) {
        // @ts-ignore
        mock[key] = recurse(_source[key]);
      }
    }
    return mock;
  };

  return recurse(source) as DeepMocked<T>;
};

export const deepMocked = <T>(value: T) => value as DeepMocked<T>;
