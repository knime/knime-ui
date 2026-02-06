import { computed } from "vue";
import { API } from "@api";

import { embeddingSDK } from "@knime/hub-features";
import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { sleep } from "@knime/utils";

import { gatewayRpcClient } from "@/api/gateway-api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types";
import { useNotifyUIExtensionAlert } from "@/components/uiExtensions/common/useNotifyUIExtensionAlert";
import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import { isBrowser } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useCompositeViewStore } from "@/store/compositeView/compositeView";
import { useSelectionStore } from "@/store/selection";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useUIControlsStore } from "../uiControls/uiControls";

type ServiceRequestParams = {
  extensionConfig: ExtensionConfig;
  nodeService: string;
  serviceRequest: any;
  requestParams: any;
};

export type Identifiers = {
  projectId: string;
  workflowId: string;
  nodeId: string;
};

interface SelectionServiceParams {
  service: (...args: any[]) => void;
  id: Identifiers;
}

export type PageBuilderStoreState = {
  projectId: string | null;
  disallowLegacyWidgets: boolean;
  onChange: (isDirty: boolean, isDefault: boolean) => void;
};

const state: PageBuilderStoreState = {
  projectId: null,
  disallowLegacyWidgets: true,
  onChange: () => {},
};

const mutations = {
  setProjectId(state: PageBuilderStoreState, projectId: string | null) {
    state.projectId = projectId;
  },
};

export const handleError = (
  {
    caller,
    error,
    nodeId,
  }: {
    caller: string;
    error: any;
    nodeId?: string;
  },
  onlyLog?: boolean,
): void => {
  consola.error(`KNIME-UI pageBuilderStore: ${caller} failed with `, error);
  if (onlyLog !== true) {
    const { notify } = useNotifyUIExtensionAlert();
    notify(
      {
        message: `${caller} failed with error: ${error}`,
        type: "error",
      },
      {
        nodeId: nodeId ?? "",
      },
    );
  }
};

export const getSelectedNodeIdentifierFromStore = (): Identifiers | null => {
  const { projectId, workflowId } = useWorkflowStore().getProjectAndWorkflowIds;

  const selectedNode = useSelectionStore().singleSelectedNode;

  if (selectedNode === null || !workflowId) {
    const cause =
      selectedNode === null
        ? "Please select a single node."
        : "Invalid WorkflowId.";

    handleError(
      {
        caller: "getSelectedNodeIdentifierFromStore",
        error: `KNIME-UI pageBuilderStore: getSelectedNodeIdentifierFromStore failed. ${cause}`,
      },
      true,
    );

    return null;
  }

  const nodeId = selectedNode.id;

  return { projectId, workflowId, nodeId };
};

const testValidityOfPage = async ({ dispatch }, nodeId?: string) => {
  try {
    const res = await dispatch("pagebuilder/getValidity", null, { root: true });

    const viewValidities = Object.values(res);

    const isValid = viewValidities.every((isValid) => isValid === true);

    if (!isValid) {
      handleError({
        caller: "testValidityOfPage",
        error:
          "Client-side validation failed. Please check the page for errors.",
        nodeId,
      });
      return "invalid";
    }
  } catch (_error) {
    handleError({
      caller: "testValidityOfPage",
      error: "Validation check failed unexpectedly.",
      nodeId,
    });
    return "invalid";
  }
  return "valid";
};

/*
 * This generator is used to determine the polling interval for the re-execution of the composite view.
 */
const INITIAL_POLLING_INTERVAL = 1;
const POLLING_INTERVAL = 500;
const intervalGenerator = function* () {
  yield INITIAL_POLLING_INTERVAL;
  while (true) {
    yield POLLING_INTERVAL;
  }
};
const pollingInterval = intervalGenerator();

type ReexecutingPage = {
  page: { webNodes: any } | null;
  resetNodes: string[];
  reexecutedNodes: string[];
};
type PollingInformation =
  | {
      shouldPoll: true;
      pollInterval: number;
    }
  | { shouldPoll: false };

const checkIfUpdatesAreNeeded = (
  { dispatch },
  reexecutingPage: ReexecutingPage,
): PollingInformation => {
  const { page, resetNodes, reexecutedNodes } = reexecutingPage;

  if (page !== null) {
    const nodeIds = reexecutedNodes?.length
      ? reexecutedNodes
      : Object.keys(page.webNodes);
    dispatch("pagebuilder/setNodesReExecuting", [], { root: true });
    dispatch("pagebuilder/updatePage", { page, nodeIds }, { root: true });
    return { shouldPoll: false };
  }

  if (!resetNodes || resetNodes.length === 0) {
    consola.warn(
      "Page is null and no reset nodes provided. That should not happen. Stop polling.",
    );
    return { shouldPoll: false };
  }

  if (resetNodes.every((nodeId) => reexecutedNodes?.includes(nodeId))) {
    // If all nodes have executed, but page isn't ready, don't wait or update- just fetch page.
    return { shouldPoll: true, pollInterval: INITIAL_POLLING_INTERVAL };
  }

  dispatch(
    "pagebuilder/setNodesReExecuting",
    resetNodes.filter((id) => !reexecutedNodes.includes(id)),
    { root: true },
  );
  return { shouldPoll: true, pollInterval: pollingInterval.next().value };
};

const actions = {
  async callService(
    _: any,
    {
      extensionConfig,
      nodeService,
      serviceRequest,
      requestParams,
    }: ServiceRequestParams,
  ): Promise<{ result: any }> {
    const { projectId, workflowId, nodeId, extensionType } = extensionConfig;
    let result: any;

    const realProjectId = useApplicationStore().activeProjectId ?? projectId;
    const versionId = computed(
      () => useWorkflowStore().activeWorkflow!.info.version,
    );

    if (nodeService === "NodeService.callNodeDataService") {
      result = await API.node.callNodeDataService({
        projectId: realProjectId,
        workflowId,
        versionId: versionId.value ?? CURRENT_STATE_VERSION,
        nodeId,
        extensionType,
        serviceType: serviceRequest,
        dataServiceRequest: requestParams,
      });
    } else if (nodeService === "NodeService.updateDataPointSelection") {
      result = await API.node.updateDataPointSelection({
        projectId: realProjectId,
        workflowId,
        versionId: versionId.value ?? CURRENT_STATE_VERSION,
        nodeId,
        mode: serviceRequest,
        selection: requestParams,
      });
    }
    return { result: JSON.parse(result) };
  },

  callKnimeUiApi(_: any, { method, params }: { method: string; params: any }) {
    return gatewayRpcClient.call(method, params);
  },

  registerService(
    { state }: { state: { projectId: string } },
    { service, id }: SelectionServiceParams,
  ): void {
    const { addListener } = useSelectionEvents();
    addListener({ ...id, projectId: state.projectId }, service);
  },

  async resetOnChangeState({ dispatch }) {
    await dispatch("pagebuilder/resetDirtyState", null, { root: true });
    const isDirty = await dispatch("pagebuilder/isDirty", null, {
      root: true,
    });
    const isDefault = await dispatch("pagebuilder/isDefault", null, {
      root: true,
    });
    await dispatch("api/onChange", { isDirty, isDefault }, { root: true });
  },

  async getViewValuesAndResolvedIdentifiers(
    { dispatch },
    onlyDirty = false,
  ): Promise<
    (Identifiers & { viewValues: Record<string, string> }) | undefined
  > {
    consola.debug(
      `KNIME-UI pageBuilderStore: getViewValues from ${
        onlyDirty ? "only dirty nodes" : "all nodes"
      }`,
    );

    const resolvedIdentifiers = getSelectedNodeIdentifierFromStore();
    if (resolvedIdentifiers === null) {
      return;
    }

    const { nodeId: componentNodeId } = resolvedIdentifiers;

    try {
      const getViewValues = () => {
        if (onlyDirty) {
          return dispatch("pagebuilder/getDirtyNodes", null, { root: true });
        }
        // param true will result in stringified view values
        return dispatch("pagebuilder/getViewValues", true, { root: true });
      };

      const viewValues = await getViewValues();

      // eslint-disable-next-line consistent-return
      return {
        ...resolvedIdentifiers,
        viewValues,
      };
    } catch (error) {
      handleError({
        caller: "getViewValues",
        error,
        nodeId: componentNodeId,
      });
    }
  },

  /**
   * Triggers a partial re-execution of the composite view. This consists of the following steps: validation, value
   * retrieval and page update or polling.
   *
   * @async
   * @param {Object} context - Vuex context.
   * @returns {undefined}
   */
  async applyAsDefault({ dispatch }) {
    const viewValuesAndResolvedIdentifier = await dispatch(
      "getViewValuesAndResolvedIdentifiers",
    );
    if (!viewValuesAndResolvedIdentifier) {
      consola.debug(
        "KNIME-UI pageBuilderStore: applyAsDefault failed. No view values available.",
      );
      return;
    }
    try {
      consola.debug("KNIME-UI pageBuilderStore: applyAsDefault: ", {
        viewValuesAndResolvedIdentifier,
      });
      await API.compositeview.setViewValuesAsNewDefault(
        viewValuesAndResolvedIdentifier,
      );
    } catch (error) {
      handleError({
        caller: "applyAsDefault",
        error,
        nodeId: viewValuesAndResolvedIdentifier.nodeId,
      });
    }
  },

  /**
   * Triggers a re-execution of the composite view. This consists of the following steps: validation, value
   * retrieval and page update or polling. If the `nodeId` is provided, it will only re-execute the
   * specified node and its down-stream nodes.
   *
   * @async
   * @param {Object} context - Vuex context.
   * @param {Object} param - action config.
   * @param {String} param.nodeId - id of the node which triggered re-execution.
   * @returns {undefined}
   */
  async triggerReExecution({ dispatch }, { nodeId: resetNodeIdSuffix }) {
    const viewValuesAndResolvedIdentifier = await dispatch(
      "getViewValuesAndResolvedIdentifiers",
      true, // only dirty nodes
    );
    if (!viewValuesAndResolvedIdentifier?.viewValues) {
      handleError({
        caller: "triggerReExecution",
        error: `No view values available for re-execution. ${viewValuesAndResolvedIdentifier}`,
        nodeId: resetNodeIdSuffix,
      });
      return;
    }

    consola.debug(
      "KNIME-UI pageBuilderStore: trigger re-execution due to node",
      resetNodeIdSuffix ? resetNodeIdSuffix : "none (complete re-execution)",
      {
        componentIdentifier:
          viewValuesAndResolvedIdentifier.resolvedIdentifiers,
        viewValues: viewValuesAndResolvedIdentifier.viewValues,
      },
    );

    const { nodeId: componentNodeId } = viewValuesAndResolvedIdentifier;

    if (
      (await testValidityOfPage({ dispatch }, componentNodeId)) === "invalid"
    ) {
      return;
    }

    const reexecution = async () => {
      try {
        useCompositeViewStore().addReexecutingNode(componentNodeId);

        const reexecutingPage =
          (await API.compositeview.triggerCompleteComponentReexecution(
            viewValuesAndResolvedIdentifier,
          )) as unknown as ReexecutingPage;

        await dispatch("resetOnChangeState");

        await dispatch("pollReExecution", {
          reexecutingPage,
          resolvedIdentifiers: {
            projectId: viewValuesAndResolvedIdentifier.projectId,
            workflowId: viewValuesAndResolvedIdentifier.workflowId,
            nodeId: viewValuesAndResolvedIdentifier.nodeId,
          },
        });
      } finally {
        useCompositeViewStore().removeReexecutingNode(componentNodeId);
      }
    };

    // now we can fire the re-execution and return immediately to not block the selection process
    reexecution().catch((error) => {
      handleError({
        caller: "triggerReExecution",
        error,
        nodeId: componentNodeId,
      });
    });
  },

  async pollReExecution(
    { dispatch },
    {
      reexecutingPage,
      resolvedIdentifiers,
    }: { reexecutingPage: ReexecutingPage; resolvedIdentifiers: Identifiers },
  ) {
    if (!reexecutingPage) {
      reexecutingPage =
        (await API.compositeview.pollCompleteComponentReexecutionStatus(
          resolvedIdentifiers,
        )) as unknown as ReexecutingPage;
    }

    while (true) {
      const pollingInformation = checkIfUpdatesAreNeeded(
        { dispatch },
        reexecutingPage,
      );
      if (!pollingInformation.shouldPoll) {
        break;
      }

      await sleep(pollingInformation.pollInterval);

      reexecutingPage =
        (await API.compositeview.pollCompleteComponentReexecutionStatus(
          resolvedIdentifiers,
        )) as unknown as ReexecutingPage;
    }
  },

  deregisterService(_: any, id: Identifiers): void {
    const { removeListener } = useSelectionEvents();
    removeListener({ ...id });
  },

  async changeNodeStates(): Promise<void> {
    await useExecutionStore().executeNodes("selected");
  },

  /*
   * Mounts the page for the PageBuilder. No polling, no updates
   */
  async mount(
    { dispatch, commit }: any,
    { projectId, workflowId, nodeId }: Identifiers,
  ): Promise<void> {
    consola.debug(
      "Loading page for PageBuilder: ",
      projectId,
      workflowId,
      nodeId,
    );

    const workflowStore = useWorkflowStore();
    const uiControlsStore = useUIControlsStore();

    const versionId = computed(
      () => workflowStore.activeWorkflow!.info.version,
    );

    const result = await API.compositeview.getCompositeViewPage({
      projectId,
      workflowId,
      versionId: versionId.value ?? CURRENT_STATE_VERSION,
      nodeId,
    });

    const page = {
      nodeMessages: null,
      wizardExecutionState: "INTERACTION_REQUIRED",
      hasPreviousPage: false,
      wizardPageContent: JSON.parse(result),
      disableWidgets:
        workflowStore.isActiveWorkflowFixedVersion ||
        !uiControlsStore.canReExecuteCompositeViews,
    };

    commit("setProjectId", projectId);
    await dispatch("pagebuilder/setPage", { page }, { root: true });
  },
};

const removeComponentIdentifier = (nodeId: string) =>
  nodeId.replace(/:0:/g, ":").replace(/^0:/, "");

// only returns a string with the path for the resource download url
const jobDownloadResource = ({ jobId, resourceId, nodeId }) => {
  const stubbedNodeId = removeComponentIdentifier(nodeId);
  return encodeURI(
    `jobs/${jobId}/output-resources/${resourceId}-${stubbedNodeId}`,
  );
};

const getters = {
  // resolves the download link for, e.g., the File Download Widget
  downloadResourceLink:
    () =>
    ({ resourceId, nodeId }) => {
      if (!isBrowser()) {
        return null;
      }

      const context = embeddingSDK.guest.getContext();
      if (!context) {
        return null;
      }

      const path = jobDownloadResource({
        jobId: context.jobId,
        resourceId,
        nodeId,
      });
      return `${context.restApiBaseUrl}/${path}`;
    },

  // tableView will use this getter to get the resource location
  uiExtResourceLocation:
    (state: PageBuilderStoreState) =>
    ({
      resourceInfo,
    }: {
      resourceInfo: { baseUrl: string; path: string };
    }): string => {
      let projectId = state.projectId;
      if (projectId === null) {
        consola.warn(
          "PageBuilderStore.uiExtResourceLocation: ProjectId is not set. Will try to read it from the application store!",
        );
        projectId = useApplicationStore().activeProjectId;
        if (projectId === null) {
          consola.warn(
            "PageBuilderStore.uiExtResourceLocation: ApplicationStore does not have the projectId either. Leaving projectId empty.",
          );
          projectId = "";
        }
      }

      return resourceLocationResolver(
        projectId,
        resourceInfo.path,
        resourceInfo.baseUrl,
      );
    },
  disallowLegacyWidgets: (state: PageBuilderStoreState) =>
    state.disallowLegacyWidgets,
};

/*
 * This store is used to communicate with the PageBuilder module which uses Vuex
 * and will be used to instantiate the vuex store on the pageBuilder side.
 */
export const pageBuilderApiVuexStoreConfig = {
  state,
  mutations,
  actions,
  getters,
  namespaced: true,
};
