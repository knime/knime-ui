import { createApiClient, type RequestHandler } from "./client";

import * as generatedAPI from "./generated";

export const createApi = (config: { makeRequest: RequestHandler }) => {
  createApiClient(config);

  return generatedAPI;
};
