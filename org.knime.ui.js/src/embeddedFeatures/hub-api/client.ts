type RequestOptions<T = any> = {
  url: string;
  method: "POST" | "GET";
  body: T;
};

export type RequestHandler = <T, K = any>(
  options: RequestOptions<K>,
) => Promise<T>;

let client: {
  get: (url: string) => Promise<any>;
  post: (url: string, body: any) => Promise<any>;
};

export const createApiClient = (config: { makeRequest: RequestHandler }) => {
  const { makeRequest } = config;

  client = {
    get: (url: string) =>
      makeRequest({
        url,
        method: "GET",
        body: {},
      }),

    post: (url: string, body) =>
      makeRequest({
        url,
        method: "POST",
        body,
      }),
  };
};

export const getClient = () => {
  if (!client) {
    throw new Error("client uninitialized");
  }

  return client;
};
