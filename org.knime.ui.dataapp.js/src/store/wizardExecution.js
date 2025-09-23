/* eslint-disable max-lines */
/* eslint-disable complexity */
import { StatusCodes } from "http-status-codes";

import * as globalConfigs from "@/config";
import { embeddingBridge } from "@/util/embedding/embeddingBridge";
import extractErrorMessage from "@/util/extractErrorMessage";

/* wizard execution/navigation messages and configurations */
const CLIENT_VALIDATION_ERROR_MESSAGE =
  "Some of your input is invalid. Please check the messages on the page.";
/**
 * Contains a message (@field message) and unique message hash (@field id) which can be used for notification tracking.
 */
const clientValidationErrorMsgConfig = {
  message: CLIENT_VALIDATION_ERROR_MESSAGE,
  id: btoa(CLIENT_VALIDATION_ERROR_MESSAGE),
};

const SERVER_VALIDATION_ERROR_MESSAGE =
  "Sorry, a problem occurred. Please check for errors on the page and" +
  " contact your admin for KNIME Hub if the problem persists.";
/**
 * Contains a message (@field message) and unique message hash (@field id) which can be used for notification tracking.
 */
const serverValidationErrorMsgConfig = {
  message: SERVER_VALIDATION_ERROR_MESSAGE,
  id: btoa(SERVER_VALIDATION_ERROR_MESSAGE),
};

const formatViewValues = (viewValues) =>
  Object.keys(viewValues).reduce((obj, nodeId) => {
    obj[nodeId] = JSON.stringify(viewValues[nodeId]);
    return obj;
  }, {});

export const DEFAULT_ERROR_MESSAGE =
  "Sorry, a problem occurred. Please contact your admin for KNIME\
 Hub if the problem persists.";

const { jobPageTimeout, wizardExecutionStates, unsupportedExecutionStates } = globalConfigs;
const {
  LOADING,
  EXECUTING,
  FINISHED,
  FINISHED_WITH_ERRORS,
  FAILED,
  STOPPING,
  CANCELLED,
  NOT_EXECUTABLE,
  MISSING,
} = wizardExecutionStates;

const isPageBuilderLoaded = (store) => {
  // ensure pageBuilderLoader middleware resource loading succeeded
  return store.hasModule("pagebuilder");
};

// Can be for either next page job statistics or component re-execution.
let pollingTimeout;

export const state = () => ({
  job: null,
  page: null,
  executionStatistics: {
    wizardExecutionState: "",
    nodesExecuted: [],
    nodesExecuting: [],
    totalExecutionDuration: 0,
  },
  nodesReExecuted: [],
  nodesReExecuting: [],
  reExecutionUpdates: 0,
  executingShown: false,
  totalProgress: 0,
});

export const mutations = {
  setJob(state, job) {
    state.job = job;
  },

  setPage(state, page) {
    state.page = page;
  },

  setExecutionStatistics(state, statistics) {
    state.executionStatistics = statistics;
  },

  setTotalProgress(state, progress) {
    state.totalProgress = progress;
  },

  // allow null (which bypasses default destructuring assignment)
  setNodesReExecuting(state, { nodesReExecuting = [], nodesReExecuted = [] }) {
    state.nodesReExecuted = nodesReExecuted;
    state.nodesReExecuting = nodesReExecuting;
  },

  setReExecutionUpdates(state, totalUpdates) {
    state.reExecutionUpdates = totalUpdates;
  },

  setExecutingShown(state, executingShown) {
    state.executingShown = executingShown;
  },
};

// TODO: WEBP-791 remove single-property getters
export const getters = {
  isWebNodesLoading: (state, getters, rootState) => {
    if (rootState.pagebuilder) {
      return rootState.pagebuilder.webNodesLoading.length > 0;
    } else {
      return false;
    }
  },
  nodesExecuted: (state) => state.executionStatistics.nodesExecuted,
  nodesExecuting: (state) => state.executionStatistics.nodesExecuting,
  nodesReExecuting: (state) => state.nodesReExecuting || [],
  isReExecuting: (state) => state.nodesReExecuting === true || state.nodesReExecuting?.length,
  reExecutionUpdates: (state) => state.reExecutionUpdates,
  reExecutionPercent: ({ nodesReExecuted: all, nodesReExecuting: curr = [] }) => {
    if (curr?.length && all?.length) {
      let total = all.length + curr.length;
      return ((total - curr.length) / (total || 1)) * 100;
    }
    return 0;
  },
  nodes: (state, getters) => getters.nodesExecuted.concat(getters.nodesExecuting),
  totalDuration: (state) => state.executionStatistics.totalExecutionDuration,
  totalPercentage: (state, getters) => (getters.nodesExecuted.length / getters.nodes.length) * 100,
  currentJobId: (state) => state.job && state.job.id,
  workflowPath: (state) => state.job && state.job.workflow,
  hasPreviousPage: (state) => Boolean(state.page && state.page.hasPreviousPage),
  hasNextPage: (state) => Boolean(state.page && state.page.hasNextPage),
  isMissing: (state) => Boolean(state.page && state.page.wizardExecutionState === MISSING),
  isExecuting: (state) => Boolean(state.page && state.page.wizardExecutionState === EXECUTING),
  isStopping: (state) => Boolean(state.page && state.page.wizardExecutionState === STOPPING),
  isCancelled: (state) => Boolean(state.page && state.page.wizardExecutionState === CANCELLED),
  isFinished: (state, getters) => {
    if (!state.page || getters.hasNextPage || getters.isExecuting) {
      return false;
    }
    return [FINISHED, FINISHED_WITH_ERRORS, FAILED, NOT_EXECUTABLE, CANCELLED].includes(
      state.page.wizardExecutionState,
    );
  },
  hasReport: (state) =>
    Boolean(state.page && state.page.hasReport && state.page.wizardExecutionState === FINISHED),
};

export const actions = {
  setJob({ commit, dispatch }, { job }) {
    commit("setJob", job);
    if (job && job.id) {
      dispatch("api/setJobId", { jobId: job.id }, { root: true });
    }
  },

  setWizardExecutionState({ dispatch }, { wizardExecutionState, jobId, hasPreviousPage }) {
    return dispatch("setPage", {
      page: {
        wizardExecutionState,
        hasPreviousPage,
      },
      jobId,
    });
  },

  setPage({ commit, dispatch, state }, { page = null, jobId, poll = true }) {
    if (page) {
      let { wizardExecutionState: execState, singlePageExecutionState: pageExecState } = page;
      let normalPoll = poll && execState === EXECUTING;
      let refreshDuringReExecution = pageExecState === EXECUTING && state.page === null;
      if (normalPoll || refreshDuringReExecution) {
        // pageExecState is only set when page is re-executed
        dispatch(
          pageExecState === EXECUTING
            ? "startReExecutionPolling"
            : "startExecutionStatisticsPolling",
          { jobId },
        );
      } else if (!Object.values(wizardExecutionStates).includes(execState)) {
        /* if the execution state not supported */
        let details =
          unsupportedExecutionStates[execState] || "No or unsupported wizardExecutionState!";
        consola.error(`${execState} State: ${details}`);

        embeddingBridge.dispatchCommandToEmbedder({
          kind: "showNotification",
          content: {
            type: "error",
            message: `${DEFAULT_ERROR_MESSAGE}\n${details}`,
            autoRemove: true,
          },
        });

        page = null;
      }
    }
    // check current state before update
    let { nodesReExecuting, nodesReExecuted, page: localPage } = state;
    let hasPage = localPage && page;
    let needsReExecutionUpdate = nodesReExecuting && nodesReExecuted?.length;
    commit("setPage", page);
    if (isPageBuilderLoaded(this)) {
      // TODO: AP-16491 create "Update page method" which accepts a sub-set of "finished" nodeIds to update
      // only update if page exists (detect either initial setPage or refresh while executing)
      if (hasPage && needsReExecutionUpdate) {
        dispatch("pagebuilder/updatePage", { page, nodeIds: nodesReExecuted }, { root: true });
      } else if (
        !page?.singlePageExecutionState ||
        localPage === null ||
        localPage?.wizardExecutionState === EXECUTING ||
        nodesReExecuting !== null ||
        nodesReExecuted?.length
      ) {
        /* "hard" set page when:
                    - page is not in singlePageExecution
                    - no previous page (fresh load)
                    - previous page was executing (e.g. progress)
                    - nodes re-executing have not been reset, e.g. w/ trailing nodes + refresh
                    - re-execution finished, but page was not eligible for update */
        dispatch("pagebuilder/setPage", { page }, { root: true });
      }
      // must reset re-executing node ids last so we have the subset of nodesIds to update and provide to
      // `pagebuilder/updatePage`. Resetting the state here also prevents multiple redraws.
      dispatch("setNodesReExecuting", {
        nodesReExecuting: null,
        nodesReExecuted: [],
      });
    }
  },

  setExecutionStatistics({ commit }, { statistics }) {
    consola.trace("Set execution statistics");
    commit("setExecutionStatistics", statistics);
  },

  clearStatistics({ commit }) {
    consola.trace("Clear execution statistics");
    commit("setExecutionStatistics", {
      nodesExecuted: [],
      nodesExecuting: [],
      totalExecutionDuration: 0,
    });
    commit("setTotalProgress", 0);
  },
  /*
   * Clears error notification from page validation or other client-side problems and can be called
   * upon successfully completing a wizard navigation request.
   */
  clearPageContentErrorNotifications() {
    consola.trace("Removing error notifications of client-side origin");
    embeddingBridge.dispatchCommandToEmbedder({
      kind: "clearNotification",
      payload: { deduplicationKey: clientValidationErrorMsgConfig.id },
    });
    embeddingBridge.dispatchCommandToEmbedder({
      kind: "clearNotification",
      payload: { deduplicationKey: serverValidationErrorMsgConfig.id },
    });
  },

  /**
   * Re-usable action to retrieve and validate views from the PageBuilder for the view content on the
   * current page. The page is first validated and then the values are fetched. If either step fails,
   * a notification is displayed via the notification store action 'show'.
   *
   * @param {*} Vuex context.
   * @returns {Object} results - the result of the action if available, else (i.e. error) empty.
   * @returns {Object} [results.viewValues] - the view values provided by the PageBuilder. Only provided
   *      if the validation and value retrieval were successful (else `undefined`).
   */
  async validateAndGetPageValues({ dispatch }) {
    /* CLIENT (View/Widget) VALIDATION */
    let validPage = await dispatch("pagebuilder/getValidity", null, {
      root: true,
    })
      .then((res) => {
        let isValid = false;
        let viewValidities = Object.values(res);
        if (viewValidities || viewValidities.length > 0) {
          isValid = viewValidities.every((isValid) => isValid === true);
        }
        return isValid;
      })
      .catch(() => false);

    if (!validPage) {
      consola.error("Client side validation failed.");

      embeddingBridge.dispatchCommandToEmbedder({
        kind: "showNotification",
        content: {
          type: "error",
          deduplicationKey: clientValidationErrorMsgConfig.id,
          message: clientValidationErrorMsgConfig.message,
        },
      });
      return {};
    }

    /* VALUE AND PAGE RETRIEVAL */
    let viewValues = await dispatch("pagebuilder/getViewValues", null, {
      root: true,
    }).catch(() => false);
    if (viewValues) {
      return { viewValues };
    }
    consola.error("Retrieving viewValues failed.");
    embeddingBridge.dispatchCommandToEmbedder({
      kind: "showNotification",
      content: {
        type: "error",
        deduplicationKey: serverValidationErrorMsgConfig.id,
        message: serverValidationErrorMsgConfig.message,
      },
    });

    return {};
  },

  async validatePollingResponse({ dispatch }, { errorResponse, jobId, poll }) {
    if (errorResponse) {
      // detect connection loss and continue polling until connection had resumed
      if (errorResponse.status >= StatusCodes.INTERNAL_SERVER_ERROR || !navigator.onLine) {
        consola.trace("Polling: continuing...");
        pollingTimeout = window.setTimeout(poll, globalConfigs.jobPollInterval);
        return {};
      }
      // job likely deleted during execution; update executionState
      if (errorResponse.status === StatusCodes.NOT_FOUND) {
        await dispatch("setWizardExecutionState", {
          wizardExecutionState: MISSING,
          jobId,
        });
      }

      embeddingBridge.dispatchCommandToEmbedder({
        kind: "showNotification",
        content: {
          type: "error",
          message: extractErrorMessage(errorResponse),
        },
      });

      return {};
    }
    // stop polling if navigation has occurred
    if (this.$router && this.$router.currentRoute.name !== "space-repository-workflow-or-job") {
      consola.debug("Navigated since last polling. Clearing state.");
      dispatch("clear");
      return {};
    }
    return { isValid: true };
  },

  // called from job-exec and when polling finished/stops
  async fetchPage({ dispatch, state }, { jobId, poll = true }) {
    consola.debug("Fetching page");

    // TODO: HUB-3868 this needs to be reworked to support 'LOADING' state, where a page isn't available yet
    let pageData = Promise.all([this.$api.jobCurrentPage({ jobId }), this.$api.job({ jobId })]);

    let [
      { response: page = {}, errorResponse: pageError },
      { response: job = {}, errorResponse: jobError },
    ] = await pageData;
    // if job previously cancelled, ignore all and return
    if (state.page && state.page.wizardExecutionState === CANCELLED) {
      return {};
    }
    // handle workflow/job loading when navigating back to a job
    if (pageError && job.state === LOADING) {
      page = { hasPreviousPage: false };
      pageError = false;
    }
    // handle unexpected errors
    let errorResponse = pageError || jobError;
    if (errorResponse) {
      dispatch("clear");
      embeddingBridge.dispatchCommandToEmbedder({
        kind: "showNotification",
        content: {
          type: "error",
          message: extractErrorMessage(errorResponse),
        },
      });
      return { errorResponse };
    }
    // set resource base url because it currently includes the jobId
    let resourceBaseUrl = this.$api.jobWebResourceUrl({ jobId });
    if (isPageBuilderLoaded(this)) {
      dispatch("pagebuilder/setResourceBaseUrl", { resourceBaseUrl }, { root: true });
    }
    dispatch("clearPageContentErrorNotifications");
    dispatch("setPage", { page, jobId, poll });
    dispatch("setJob", { job });
    return {};
  },

  // called from WizardNavigation
  async fetchNextPage({ dispatch }, { jobId }) {
    consola.trace("Requesting next page");
    let { viewValues } = await dispatch("validateAndGetPageValues");
    if (!viewValues) {
      return {};
    }
    /* Executor expects values for each nodeId to be strings for Jackson de-serialization */
    let { response: page, errorResponse } = await this.$api.jobNextPage({
      jobId,
      viewValues: formatViewValues(viewValues),
      timeout: jobPageTimeout,
    });

    /* UPDATE PAGE */
    if (page && page.status === StatusCodes.OK) {
      let { response: job = {} } = await this.$api.job({ jobId }).catch(() => {
        /* do nothing */
      });
      dispatch("clearPageContentErrorNotifications");
      dispatch("setPage", { page, jobId });
      dispatch("setJob", { job });
      return {};
    }
    let { status, data } = errorResponse;
    if (status === StatusCodes.BAD_REQUEST && data.exceptionName === "TimeoutException") {
      consola.trace(`Execution takes longer than ${jobPageTimeout}ms.`);
      await dispatch("setWizardExecutionState", {
        wizardExecutionState: EXECUTING,
        jobId,
        hasPreviousPage: true,
      });
      return {};
    }
    if (status === StatusCodes.NOT_ACCEPTABLE) {
      consola.error("Server validation failed.");
      embeddingBridge.dispatchCommandToEmbedder({
        kind: "showNotification",
        content: {
          type: "error",
          deduplicationKey: serverValidationErrorMsgConfig.id,
          message: serverValidationErrorMsgConfig.message,
        },
      });
      await dispatch("pagebuilder/setValidationErrors", { page: data }, { root: true });
      return {};
    }

    embeddingBridge.dispatchCommandToEmbedder({
      kind: "showNotification",
      content: {
        type: "error",
        message: extractErrorMessage(errorResponse),
      },
    });

    return { errorResponse };
  },

  // called from WizardNavigation
  async fetchPreviousPage({ dispatch, state }, { jobId }) {
    /* Update wizardExecutionState if stopping execution for styling progress and
        preventing additional calls while we wait for cancelled execution response */
    if (state.page.wizardExecutionState === EXECUTING || getters.isReExecuting) {
      dispatch("stopPolling", { flushTimers: true });
      // clear any nodes re-executing before setting wizard execution state to STOPPING
      await dispatch("setNodesReExecuting", {});
      await dispatch("setWizardExecutionState", {
        wizardExecutionState: STOPPING,
        jobId,
      });
    }
    consola.trace("Requesting previous page");
    let { response: page, errorResponse } = await this.$api.jobPreviousPage({
      jobId,
      timeout: jobPageTimeout,
    });
    if (page) {
      dispatch("clearPageContentErrorNotifications");
      dispatch("setPage", { page, jobId });
      return {};
    }
    // handle errorResponse
    if (state.page.wizardExecutionState === STOPPING) {
      await dispatch("setWizardExecutionState", {
        wizardExecutionState: MISSING,
        jobId,
      });
    }

    embeddingBridge.dispatchCommandToEmbedder({
      kind: "showNotification",
      content: {
        type: "error",
        message: extractErrorMessage(errorResponse),
      },
    });

    return { errorResponse };
  },

  /**
   * Action to trigger the re-execution of the current WizardExecution page. When called, the callee provides
   * the nodeId of the event initiator which is used to determine the degree of partial re-execution in the
   * workflow. This action validates the current page, retrieves the current page state (viewValues) and triggers
   * the partial re-execution of the parent-component of the current page. If the request (and re-execution) is
   * not completed within the timeout window (which is usually expected; execution usually exceeds the timeout)
   * then polling will be initiated by this action for re-execution-specific execution statistics (different than
   * execution statistics between WizardExecution pages).
   *
   * @param {*} Vuex context.
   * @param {*} params - action configuration.
   * @param {String} params.nodeId - the nodeId of the initiating node. This is provided by the dispatcher
   *      (i.e. PageBuilder).
   * @returns {Object} results - empty object if re-execution event handling was successful, else error details.
   * @returns {Object} [results.errorResponse] - optional details about any error which may have occurred.
   */
  async reExecuteCurrentPage({ dispatch, state }, { nodeId }) {
    let jobId = state.job.id;
    consola.debug("Re-executing current page");
    let { viewValues } = await dispatch("validateAndGetPageValues");
    if (!viewValues) {
      return {};
    }
    dispatch("setNodesReExecuting", { nodesReExecuting: true });
    /* Executor expects values for each nodeId to be strings for Jackson de-serialization */
    let { response: page = {}, errorResponse = {} } = await this.$api.jobReExecuteCurrentPage({
      jobId,
      nodeId,
      viewValues: formatViewValues(viewValues),
      timeout: jobPageTimeout,
    });
    /* UPDATE PAGE */
    if (page.status === StatusCodes.OK) {
      let { nodesExecuted: nodesReExecuted = [] } = page;
      await dispatch("setNodesReExecuting", {
        nodesReExecuting: [],
        nodesReExecuted,
      });
      dispatch("setPage", { page, jobId });
      return {};
    }
    let { status, data } = errorResponse;
    /* Check for timeout */
    if (status === StatusCodes.BAD_REQUEST && data?.exceptionName === "TimeoutException") {
      dispatch("startReExecutionPolling", { jobId });
      return {};
    }
    // on error, reset nodes re-executing
    await dispatch("setNodesReExecuting", {});
    if (status === StatusCodes.NOT_ACCEPTABLE) {
      consola.error("Server validation failed.");
      embeddingBridge.dispatchCommandToEmbedder({
        kind: "showNotification",
        content: {
          type: "error",
          deduplicationKey: serverValidationErrorMsgConfig.id,
          message: serverValidationErrorMsgConfig.message,
        },
      });
      await dispatch("pagebuilder/setValidationErrors", { page: data }, { root: true });
      return {};
    }

    embeddingBridge.dispatchCommandToEmbedder({
      kind: "showNotification",
      content: {
        type: "error",
        message: extractErrorMessage(errorResponse),
      },
    });

    return { errorResponse };
  },

  cancelJob({ dispatch }, { jobId }) {
    consola.debug("Cancelling current job.");
    // manually clear any timers that are running, as delete job will be called before job-exec page teardown
    dispatch("stopPolling", { flushTimers: true });
    dispatch("setPage", { page: { wizardExecutionState: CANCELLED } });
    dispatch("setNodesReExecuting", { nodesReExecuting: null });
    dispatch("deployments/deleteJob", { jobId, update: false }, { root: true });
  },

  startReExecutionPolling({ dispatch, state, getters }, { jobId }) {
    dispatch("stopPolling", {}); // in case polling was active before
    consola.trace("Start polling for node execution states during re-execution");

    /* @param {*} init - if the call is the first in a re-execution polling sequence. */
    let poll = async (init) => {
      consola.trace("Polling current page re-execution");
      let { response, errorResponse } = await this.$api.jobExecutionStatistics({
        jobId,
        reExecuting: true,
      });
      let { isValid } = await dispatch("validatePollingResponse", {
        errorResponse,
        jobId,
        poll,
      });
      if (!isValid || response.singlePageExecutionState === FAILED) {
        await dispatch("setNodesReExecuting", { nodesReExecuting: null });
        consola.debug("Reexecution failed: ", errorResponse);
        if (this.$router && this.$router.currentRoute.name !== "space-repository-job-exec") {
          embeddingBridge.dispatchCommandToEmbedder({
            kind: "showNotification",
            content: {
              type: "error",
              message: "Page re-execution unsuccessful.",
            },
          });
        }
        return {};
      }
      let { nodesExecuting: nodesReExecuting, nodesExecuted: nodesReExecuted } = response;
      consola.debug(
        "Reexecution status (nodesReExecuting/nodesReExecuted):",
        nodesReExecuting,
        nodesReExecuted,
      );
      // - if empty executing nodes and state of executed nodes has not been reset by a front-end update
      // - needed to handle workflows which have downstream nodes from the "last" wizard node
      // - must be checked before updating with 'setNodesReExecuting'
      let updateNeeded =
        !nodesReExecuting?.length && state.nodesReExecuted?.length && getters.isReExecuting;
      if (response.singlePageExecutionState === FINISHED) {
        // this updates the re-execution state in the same manner as after 'fast' re-execution
        // (see reExecuteCurrentPage()) to facilitate an update of the page rather then a reset
        // TODO: Check if this has any side effects as previously updating the state only happened in certain cases
        await dispatch("setNodesReExecuting", {
          nodesReExecuting: [],
          nodesReExecuted,
        });
        // manually stop polling to prevent any errant timeouts from updating state concurrently.
        dispatch("stopPolling", { flushTimers: true });
        dispatch("fetchPage", { jobId, poll: false });
        return {};
      }
      /* Handle re-execution statistics initialization and prevent trailing nodes from reloading page. Only
            update when nodesReExecuting is not null as this is expected state during fast nested execution. In this
            case, later polling updates will either be FINISHED or FAILED */
      if ((init || state.nodesReExecuting !== null) && nodesReExecuting !== null) {
        await dispatch("setNodesReExecuting", {
          nodesReExecuting,
          nodesReExecuted,
        });
      }
      if (updateNeeded) {
        // prevent double polling and continue in the background to enable wizard navigation
        await dispatch("fetchPage", { jobId, poll: false });
      }
      pollingTimeout = window.setTimeout(poll, globalConfigs.jobPollInterval);
      return {};
    };
    return poll(true);
  },

  toggleExecutingMessage({ commit, state }) {
    let message = "Executing...";
    // eslint-disable-next-line no-magic-numbers
    if (state.reExecutionUpdates >= 5 && !state.executingShown) {
      commit("setExecutingShown", true);
      embeddingBridge.dispatchCommandToEmbedder({
        kind: "showNotification",
        content: {
          type: "error",
          message,
          deduplicationKey: message,
        },
      });
    }
    if (!state.nodesReExecuting?.length && state.executingShown) {
      commit("setExecutingShown", false);
      embeddingBridge.dispatchCommandToEmbedder({
        kind: "clearNotification",
        // message also acts as id
        payload: { id: message },
      });
    }
    return {};
  },

  startExecutionStatisticsPolling({ dispatch, state }, { jobId }) {
    dispatch("stopPolling", {}); // in case polling was active before
    consola.trace("Start polling for job execution statistics");
    let poll = async () => {
      consola.trace("polling execution statistics");
      let { response: statistics, errorResponse } = await this.$api.jobExecutionStatistics({
        jobId,
      });
      if (statistics) {
        await dispatch("setExecutionStatistics", { statistics });
      }
      let { isValid } = await dispatch("validatePollingResponse", {
        errorResponse,
        jobId,
        poll,
      });
      if (!isValid) {
        return {};
      }
      // continue polling if needed
      if (
        state.executionStatistics &&
        state.executionStatistics.wizardExecutionState === EXECUTING
      ) {
        consola.trace("Polling: continuing...");
        pollingTimeout = window.setTimeout(poll, globalConfigs.jobPollInterval);
        return {};
      }
      // fetch page if execution finished
      consola.debug("Polling ended.");
      await dispatch("fetchPage", { jobId });
      return {};
    };

    return poll();
  },

  stopPolling(_, { flushTimers }) {
    consola.trace("Stop polling for job execution statistics (in case polling was active)");
    let clearPollingTimeout = () => {
      window.clearTimeout(pollingTimeout);
    };
    clearPollingTimeout();
    /*
     * When clearing store call this twice to prevent unexpected behavior where
     * the timeout is set in a race condition scenario while being cleared.
     */
    if (flushTimers) {
      consola.debug("Flushing execution statistics polling.");
      window.setTimeout(clearPollingTimeout, globalConfigs.jobPollInterval);
    }
  },

  clear({ dispatch }) {
    consola.trace("Clearing wizard execution store");
    dispatch("stopPolling", { flushTimers: true });
    dispatch("setJob", { job: null });
    dispatch("setPage", { page: null, jobId: null });
    dispatch("setNodesReExecuting", { nodesReExecuting: null });
    dispatch("clearStatistics");
  },

  /* Nodes re-executing can be falsy or empty when nodes are not re-executing. If the page is re-executing,
    nodes re-executing should be an array containing the nodeIds of the currently re-executing nodes ~OR~ true
    if the re-execution was recently initialized and node-specific information is not yet available. */
  setNodesReExecuting(
    { dispatch, commit, state, getters },
    { nodesReExecuting = [], nodesReExecuted = [] },
  ) {
    consola.trace(`Setting re-executing nodes: ${nodesReExecuting}`);
    commit("setNodesReExecuting", { nodesReExecuting, nodesReExecuted });
    // when not re-executing, must set to 0 to hide progress
    commit("setReExecutionUpdates", getters.isReExecuting ? state.reExecutionUpdates + 1 : 0);
    if (isPageBuilderLoaded(this)) {
      dispatch("pagebuilder/setNodesReExecuting", nodesReExecuting, {
        root: true,
      });
    }
    return dispatch("toggleExecutingMessage");
  },
};
