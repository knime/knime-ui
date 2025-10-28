/**
 * This store provides access the global WebPortal API and its functionality. It allows the PageBuilder to build
 * dynamic URLs by managing WebPortal specifics (such as Job ID).
 * This allows the PageBuilder to reuse the same API regardless of execution environment.
 */

export const state = () => ({
  api: null,
  jobId: null,
  uiExtUrl: null,
  abortController: {},
});

export const mutations = {
  setJobId(state, jobId) {
    state.jobId = jobId;
    // api needs to be available for getters
    state.api = this.$api;
  },
  setUIExtUrl(state, uiExtUrl) {
    state.uiExtUrl = uiExtUrl;
  },
};

export const actions = {
  setJobId({ commit }, { jobId }) {
    commit("setJobId", jobId);
  },

  setUIExtUrl({ commit }, { uiExtUrl }) {
    commit("setUIExtUrl", uiExtUrl);
  },

  triggerReExecution({ dispatch }, { nodeId }) {
    consola.debug("API: reexecution triggered by PageBuilder.");
    dispatch("wizardExecution/reExecuteCurrentPage", { nodeId }, { root: true });
  },

  /**
   * Initiates a node service call via REST API  which subsequently targets an extension service implementation
   * of the node identified by the provided extension config.
   *
   * @param {Object} context - Vuex context.
   * @param {Object} param - action config.
   * @param {Object} param.extensionConfig - the UI extension config.
   * @param {string} param.nodeService - the node service to call.
   * @param {string} param.serviceRequest - the service request.
   * @param {any} param.requestParams - the request parameters.
   * @returns {Promise<Object>} - the results of the service call. The resolved results will optionally contain
   *      the @property {result} (if the service was successful) or the @property {error} (if the service failed).
   * @async
   */
  async callService(
    { dispatch, state },
    { extensionConfig, nodeService = "", serviceRequest, requestParams },
  ) {
    let { workflowId, nodeId, extensionType } = extensionConfig;
    consola.debug(`API: callService for ${nodeService}:${serviceRequest}.`);
    let config = {
      jobId: state.jobId,
      workflowId,
      nodeId,
      extensionType,
      serviceRequest,
      requestParams,
    };
    let callResponse = { result: JSON.stringify({}) };
    if (nodeService.includes("updateDataPointSelection")) {
      let { response } = await this.$api.updateDataPointSelection(config);
      if (response?.length) {
        response.forEach((selectionUpdate) => {
          dispatch(
            "pagebuilder/service/pushEvent",
            {
              event: { eventType: "SelectionEvent", payload: selectionUpdate },
            },
            { root: true },
          );
        });
      }
    } else if (nodeService.includes("callNodeDataService")) {
      let { response } = await this.$api.callNodeDataService(config);
      callResponse.result = response;
    } else {
      let message = `The provided node service "${nodeService}" is not available.`;
      callResponse = { error: JSON.stringify({ code: 400, message }) };
      consola.warn(message);
    }
    return Promise.resolve(callResponse);
  },

  /**
   * Gives nested UI-extensions access to the DataApps API.
   * To be removed/refactored with as part of FEATKNAP-167.
   *
   * @param {String} method the rpc method to call
   * @param {Object} params rpc-method parameters
   */
  async callKnimeUiApi({ state }, { method, params }) {
    if (method === "NodeService.getNodeView") {
      return (
        await this.$api.getNodeViewForVirtualProject({
          jobId: state.jobId,
          virtualProjectId: params.projectId,
          workflowId: params.workflowId,
          nodeId: params.nodeId,
        })
      ).response;
    } else if (method === "NodeService.callNodeDataService") {
      return (
        await this.$api.callNodeDataServiceForVirtualProject({
          jobId: state.jobId,
          virtualProjectId: params.projectId,
          workflowId: params.workflowId,
          nodeId: params.nodeId,
          extensionType: params.extensionType,
          serviceType: params.serviceType,
          requestParams: params.dataServiceRequest,
        })
      ).response;
    } else {
      let message = `No endpoint to match the rpc-call "${method}".`;
      consola.warn(message);
      return { error: JSON.stringify({ code: 400, message }) };
    }
  },
  registerService() {
    // TODO: pagebuilder calls this action, should be implemented or not be called
    consola.trace("Implementation missing for `registerService`");
  },
  deregisterService() {
    // TODO: pagebuilder calls this action, should be implemented or not be called
    consola.trace("Implementation missing for `deregisterService`");
  },
  onChange() {
    // TODO: pagebuilder calls this action, should be implemented or not be called
    consola.trace("Implementation missing for `onChange`");
  },
};

export const getters = {
  defaultMountId: async (state) => {
    if (state.api) {
      let { response } = await state.api.billboard({});
      return response?.mountId ?? null;
    } else {
      return null;
    }
  },
  repository:
    (state) =>
    ({ path, deep = true }) => {
      if (state.api) {
        return state.api.repository({ path, deep, showErrorPage: false });
      } else {
        return null;
      }
    },
  downloadResourceLink:
    (state) =>
    ({ resourceId, nodeId }) => {
      if (state.api && state.jobId) {
        return state.api.jobDownloadResource({
          jobId: state.jobId,
          resourceId,
          nodeId,
        });
      } else {
        return null;
      }
    },
  reportDownloadLink:
    (state) =>
    ({ format }) => {
      if (state.api && state.jobId) {
        return state.api.reportDownloadUrl({ jobId: state.jobId, format });
      } else {
        return null;
      }
    },
  uploadResourceLink:
    (state) =>
    ({ resourceId, nodeId }) => {
      if (state.api && state.jobId) {
        return state.api.jobUploadResource({
          jobId: state.jobId,
          resourceId,
          nodeId,
        });
      } else {
        return null;
      }
    },
  uploadResource:
    (state) =>
    ({ resource, nodeId, progressCallback, abortController }) => {
      if (state.api && state.jobId) {
        if (!abortController) {
          const controller = new AbortController();
          state.abortController[nodeId] = controller;
          abortController = controller;
        }
        return state.api.uploadResource({
          jobId: state.jobId,
          resource,
          nodeId,
          progressCallback,
          abortController,
        });
      } else {
        return null;
      }
    },
  cancelUploadResource:
    (state) =>
    ({ nodeId }) => {
      state.abortController[nodeId]?.abort("Request cancelled.");
      delete state.abortController[nodeId];
    },
  uiExtResourceLocation:
    (state) =>
    ({ resourceInfo } = {}) => {
      if (state.uiExtUrl) {
        return state.uiExtUrl;
      }
      let resourceLocation = `${state.api.jobWebResourceUrl({
        jobId: state.jobId,
      })}/${resourceInfo.path}`;
      return resourceLocation;
    },
};
