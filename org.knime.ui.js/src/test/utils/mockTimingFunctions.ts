export const timingFunctionsMockFactory = () => {
  const throttle = function (func: (...args: any[]) => any) {
    return function (this: any, ...args: any[]) {
      // eslint-disable-next-line no-invalid-this
      return func.apply(this, args);
    };
  };

  const debounce = function (func: (...args: any[]) => any) {
    return function (this: any, ...args: any[]) {
      // eslint-disable-next-line no-invalid-this
      return func.apply(this, args);
    };
  };

  return {
    throttle,
    debounce,
  };
};
