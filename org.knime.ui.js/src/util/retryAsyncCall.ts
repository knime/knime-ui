/* eslint-disable func-style */
import sleep from "webapps-common/util/sleep";

const DEFAULT_RETRY_DELAY_MS = 0;
const DEFAULT_RETRY_COUNT = 5;

export async function retryAsyncCall<T>(
  fn: () => Promise<T>,
  retryDelayMS = DEFAULT_RETRY_DELAY_MS,
  retryCount = DEFAULT_RETRY_COUNT,
) {
  try {
    return await fn();
  } catch (e) {
    if (retryCount > 0) {
      await sleep(retryDelayMS);

      // eslint-disable-next-line no-return-await
      return await retryAsyncCall(fn, retryCount - 1, retryDelayMS);
    }

    throw e;
  }
}
