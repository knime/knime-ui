import type { App } from "vue";

let jobId: string, restApiBaseUrl: string;

export const useConstants = () => {
  if (!jobId || !restApiBaseUrl) {
    throw new Error("constants not initialized");
  }

  return { jobId, restApiBaseUrl };
};

const initConstants = (app: App, params: { jobId: string; restApiBaseUrl: string }) => {
  jobId = params.jobId;
  restApiBaseUrl = params.restApiBaseUrl;

  app.config.globalProperties.$jobId = jobId;
  app.config.globalProperties.$restAPIUrl = restApiBaseUrl;
};

export default initConstants;
