export const removeComponentIdentifier = (nodeId: string) =>
  nodeId.replace(/:0:/g, ":").replace(/^0:/, "");

export const replaceColons = (nodeId: string) => nodeId.replace(/:/g, "-");

// Get REST path and query parameters as an array, respectively
// These can be used in axios like so:
//     axios.get(...search({ params: { query: 'foo' }}));

// Remember that axios requires escaped URLs, so we need to take care of always calling `encodeURI()` here
const accountByName = ({ name }) => [`accounts/name/${encodeURIComponent(name)}`]; // names may include reserved chars
const accountById = ({ id }) => [`accounts/${id}`];

const identity = () => ["accounts/identity"];

const hubGlobal = () => ["accounts/hub:global"];

const job = ({ jobId }) => [encodeURI(`jobs/${jobId}`)];
const jobCurrentPage = ({ jobId, nodeId = null, timeout = 0 }) => {
  if (nodeId) {
    return [
      encodeURI(`jobs/${jobId}/workflow/wizard/current-page`),
      {
        params: { async: false, "node-id": nodeId, timeout },
        headers: {
          "Content-Type": "application/json",
        },
      },
    ];
  }
  return [encodeURI(`jobs/${jobId}/workflow/wizard/current-page`)];
};
const jobCurrentPageExecutionStatistics = ({ jobId }) => [
  encodeURI(`jobs/${jobId}/workflow/wizard/current-page/execution-statistics`),
];
const jobNextPage = ({ jobId, timeout }) => [
  encodeURI(`jobs/${jobId}/workflow/wizard/next-page`),
  {
    params: { async: false, timeout },
    headers: {
      "Content-Type": "application/json",
    },
  },
];
const jobPreviousPage = ({ jobId, timeout }) => [
  encodeURI(`jobs/${jobId}/workflow/wizard/previous-page`),
  {
    params: { timeout },
    headers: {
      "Content-Type": "application/json",
    },
  },
];
const getNodeViewForVirtualProject = ({ jobId, virtualProjectId, workflowId, nodeId }) => [
  encodeURI(
    `jobs/${jobId}/virtual-projects/${virtualProjectId}/workflow/${workflowId}/node/${nodeId}/view`,
  ),
  {
    headers: {
      "Content-Type": "application/json",
    },
  },
];

const callNodeDataService = ({ jobId, workflowId, nodeId, extensionType, serviceType }) => [
  encodeURI(`jobs/${jobId}/workflow/${workflowId}/node/${nodeId}/${extensionType}/data`),
  {
    params: { serviceType },
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
  },
];
const callNodeDataServiceForVirtualProject = ({
  jobId,
  virtualProjectId,
  workflowId,
  nodeId,
  extensionType,
  serviceType,
}) => [
  encodeURI(
    `jobs/${jobId}/virtual-projects/${virtualProjectId}/workflow/${workflowId}/node/${nodeId}/${extensionType}/data`,
  ),
  {
    params: { serviceType },
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
  },
];
const updateDataPointSelection = ({ jobId, workflowId, nodeId, mode, async = false }) => [
  encodeURI(`jobs/${jobId}/workflow/${workflowId}/node/${nodeId}/view/selection`),
  {
    params: { async, mode },
    headers: {
      "Content-Type": "application/json",
    },
  },
];
const jobExecutionStatistics = ({ jobId }) => [
  encodeURI(`jobs/${jobId}/workflow/wizard/execution-statistics`),
];

// only returns a string with the path
const jobWebResource = ({ jobId, webResource }) =>
  encodeURI(`jobs/${jobId}/workflow/wizard/web-resources${webResource}`);

// only returns a string with the path
const reportDownloadPath = ({ jobId, format }) => {
  let downloadPath = `jobs/${jobId}/workflow/wizard/report`;
  downloadPath += `?format=${format}`;
  return downloadPath;
};

// only returns a string with the path for the resource download url
const jobDownloadResource = ({ jobId, resourceId, nodeId }) => {
  const stubbedNodeId = removeComponentIdentifier(nodeId);
  return encodeURI(`jobs/${jobId}/output-resources/${resourceId}-${stubbedNodeId}`);
};

const jobUploadResource = ({ jobId, resourceId, nodeId }) => {
  const stubbedNodeId = replaceColons(removeComponentIdentifier(nodeId));
  // the node id is not necessary to create the URL but it provides a simple means to avoid overwriting
  // files in the object store in case different upload nodes upload files with the same name
  return encodeURI(`jobs/${jobId}/ostore/${stubbedNodeId}-${resourceId}`);
};

/**
 * @param {Object} param
 * @param {String} param.jobId - the id of the current job.
 * @param {File} param.resource - the resource to upload.
 * @param {String} param.nodeId - the id of the file upload node.
 * @param {Function} param.progressCallback - the callback function to be called when upload progress is changed.
 * @param {Object} [param.cancelToken] - Axios {@see CancelToken} for the request.
 * @returns {[String, FormData, Object]} array of axios parameters (PUT URL, file FormData, axios configuration).
 */
const uploadResource = ({ jobId, resource, nodeId, progressCallback, abortController }) => {
  const axiosConfig = {
    onUploadProgress(progressEvent) {
      progressCallback(Math.round((progressEvent.loaded * 100) / progressEvent.total));
    },
    signal: abortController.signal,
  };
  return [jobUploadResource({ jobId, resourceId: resource.name, nodeId }), resource, axiosConfig];
};

export {
  accountByName,
  accountById,
  identity,
  hubGlobal,
  job,
  jobCurrentPage,
  jobCurrentPageExecutionStatistics,
  jobNextPage,
  jobPreviousPage,
  getNodeViewForVirtualProject,
  callNodeDataService,
  callNodeDataServiceForVirtualProject,
  updateDataPointSelection,
  jobExecutionStatistics,
  jobWebResource,
  reportDownloadPath,
  jobDownloadResource,
  jobUploadResource,
  uploadResource,
};
