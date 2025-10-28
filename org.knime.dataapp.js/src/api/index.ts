import { axiosResponseInterceptor } from "./axios-response.interceptor";
import {
  callNodeDataService,
  callNodeDataServiceForVirtualProject,
  getNodeViewForVirtualProject,
  job,
  jobCurrentPage,
  jobCurrentPageExecutionStatistics,
  jobDownloadResource,
  jobExecutionStatistics,
  jobNextPage,
  jobPreviousPage,
  jobUploadResource,
  jobWebResource,
  reportDownloadPath,
  updateDataPointSelection,
  uploadResource,
} from "./serviceUrls";

export const apiFactory = ({ $axios }) => {
  $axios.defaults.baseURL = "/_/api";
  consola.debug("Initializing axios using basePath", $axios.defaults.baseURL);

  $axios.interceptors.response.use(axiosResponseInterceptor);

  /**
   * Package all requests (successful & error) to simplify checking for errors and improve
   * readability. Anytime an API call is made (except for jobWebResourceUrl which doesn't
   * make any requests), it will return:
   *
   * @example (good response): { response: {...}, errorResponse: undefined }
   * @example (error response): { response: undefined, errorResponse: {...} }
   */

  const createResponseHandler = () => (response) => {
    consola.trace("API success:", response);
    return { response: response.data };
  };
  const createErrorHandler =
    () =>
    ({ response = {}, message = "" } = {}) => {
      consola.debug("API failed:", response, message);

      return {
        errorResponse: {
          ...response,
          cancelled: message === '"Request cancelled."',
        },
      };
    };

  return {
    job: ({ jobId }) => {
      consola.trace("Axios sending job get request");
      return $axios.get(job({ jobId })[0]).then(createResponseHandler(), createErrorHandler());
    },
    jobCurrentPage: ({ jobId }) => {
      consola.trace("Axios sending job current page request");
      const [url] = jobCurrentPage({ jobId });

      return $axios.get(url).then(createResponseHandler(), createErrorHandler());
    },
    jobNextPage: ({ jobId, viewValues, timeout }) => {
      consola.trace("Axios sending job next page request");
      const [url, config] = jobNextPage({ jobId, timeout });
      return $axios
        .post(url, { viewValues }, config)
        .then(createResponseHandler(), createErrorHandler());
    },
    jobPreviousPage: ({ jobId, timeout }) => {
      consola.trace("Axios sending job previous page request");
      const [url, config] = jobPreviousPage({ jobId, timeout });
      return $axios
        .post(
          url,
          {
            /* no body */
          },
          config,
        )
        .then(createResponseHandler(), createErrorHandler());
    },
    getNodeViewForVirtualProject: ({ jobId, virtualProjectId, workflowId, nodeId }) => {
      consola.trace("Axios sending get node view request");
      const [url, config] = getNodeViewForVirtualProject({
        jobId,
        workflowId,
        nodeId,
        virtualProjectId,
      });
      return $axios.get(url, config).then(createResponseHandler(), createErrorHandler());
    },
    callNodeDataService: ({
      jobId,
      workflowId,
      nodeId,
      extensionType,
      serviceRequest: serviceType,
      requestParams,
    }) => {
      consola.trace("Axios sending call node data service request");
      const [url, config] = callNodeDataService({
        jobId,
        workflowId,
        nodeId,
        extensionType,
        serviceType,
      });
      return $axios
        .post(url, requestParams, config)
        .then(createResponseHandler(), createErrorHandler());
    },
    callNodeDataServiceForVirtualProject: ({
      jobId,
      virtualProjectId,
      workflowId,
      nodeId,
      extensionType,
      serviceType,
      requestParams,
    }) => {
      consola.trace("Axios sending call node data service request");
      const [url, config] = callNodeDataServiceForVirtualProject({
        jobId,
        virtualProjectId,
        workflowId,
        nodeId,
        extensionType,
        serviceType,
      });
      return $axios
        .post(url, requestParams, config)
        .then(createResponseHandler(), createErrorHandler());
    },

    updateDataPointSelection: ({
      jobId,
      workflowId,
      nodeId,
      serviceRequest: mode,
      requestParams,
    }) => {
      consola.trace("Axios sending update data point selection request");
      const [url, config] = updateDataPointSelection({
        jobId,
        workflowId,
        nodeId,
        mode,
      });
      return $axios
        .post(url, requestParams, config)
        .then(createResponseHandler(), createErrorHandler());
    },
    jobReExecuteCurrentPage: ({ jobId, nodeId, viewValues, timeout }) => {
      consola.trace("Axios sending job re-execute current page request");
      const [url, config] = jobCurrentPage({ jobId, nodeId, timeout });
      return $axios
        .post(url, { viewValues }, config)
        .then(createResponseHandler(), createErrorHandler());
    },
    jobExecutionStatistics: ({ jobId, reExecuting = false }) => {
      consola.trace("Axios sending job execution statistics request");
      return $axios
        .get(
          ...(reExecuting
            ? jobCurrentPageExecutionStatistics({ jobId })
            : jobExecutionStatistics({ jobId })),
        )
        .then(createResponseHandler(), createErrorHandler());
    },
    // just returns the URL, doesn't do any request
    jobWebResourceUrl: ({ jobId, webResource = "" }) => {
      consola.trace("Building web resource URL");
      const resourceUrl = `${$axios.defaults.baseURL}/${jobWebResource({
        jobId,
        webResource,
      })}`;
      return resourceUrl;
    },
    // just returns the URL, doesn't do any request
    reportDownloadUrl: ({ jobId, format }) => {
      consola.trace(`Building report download URL for ${format}`);
      const reportUrl = `${$axios.defaults.baseURL}/${reportDownloadPath({
        jobId,
        format,
      })}`;
      return reportUrl;
    },
    // just returns the download URL, doesn't do any request
    jobDownloadResource: ({ jobId, resourceId, nodeId = "" }) => {
      consola.trace("Building download URL");
      const downloadPath = jobDownloadResource({ jobId, resourceId, nodeId });
      const downloadUrl = `${$axios.defaults.baseURL}/${downloadPath}`;
      return downloadUrl;
    },
    // just returns the upload URL, doesn't do any request
    jobUploadResource: ({ jobId, resourceId, nodeId }) => {
      consola.trace("Building upload URL");
      const uploadUrl = `${$axios.defaults.baseURL}/${jobUploadResource({
        jobId,
        resourceId,
        nodeId,
      })}`;
      return uploadUrl;
    },
    uploadResource: ({ jobId, resource, nodeId, progressCallback, abortController }) => {
      consola.trace("Uploading resource");
      return $axios
        .put(
          ...uploadResource({
            jobId,
            resource,
            nodeId,
            progressCallback,
            abortController,
          }),
        )
        .then(createResponseHandler(), createErrorHandler());
    },
    deleteJob: ({ jobId }) => {
      consola.trace("Axios delete job", jobId);
      return $axios.delete(...job({ jobId })).then(createResponseHandler(), createErrorHandler());
    },
  };
};
