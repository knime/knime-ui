import { createApiClient, type RequestHandler } from "./client";

import * as generatedAPI from "./generated";

export const createApi = (config: {
  makeRequest: RequestHandler;
  exit?: () => any;
}) => {
  createApiClient(config);

  return { ...generatedAPI, exit: config.exit };
};
