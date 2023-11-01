export const createAbortablePromise = () => {
  const abortController: AbortController = new AbortController();

  const runAbortablePromise = <T = unknown>(request: () => Promise<T>) => {
    return new Promise<T>((resolve, reject) => {
      // abort logic
      const abortListener = ({ target }) => {
        abortController.signal.removeEventListener("abort", abortListener);
        reject(target.reason);
      };

      // the actual call
      request().then(resolve);

      abortController.signal.addEventListener("abort", abortListener);
    });
  };

  return { abortController, runAbortablePromise };
};
