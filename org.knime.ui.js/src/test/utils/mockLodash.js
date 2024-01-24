export const lodashMockFactory = () => {
  const throttle = function (func) {
    return function (...args) {
      // eslint-disable-next-line no-invalid-this
      return func.apply(this, args);
    };
  };

  const debounce = function (func) {
    return function (...args) {
      // eslint-disable-next-line no-invalid-this
      return func.apply(this, args);
    };
  };

  return {
    throttle,
    debounce,
  };
};
