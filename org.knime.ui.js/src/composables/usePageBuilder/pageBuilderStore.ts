import { computed } from "vue";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { sleep } from "@knime/utils";

import { API } from "@/api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types";
import { useNotifyUIExtensionAlert } from "@/components/uiExtensions/common/useNotifyUIExtensionAlert";
import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import { useReexecutingCompositeViewState } from "@/composables/usePageBuilder/useReexecutingCompositeViewState";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useExecutionStore } from "@/store/workflow/execution";
import { useWorkflowStore } from "@/store/workflow/workflow";

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
  disallowWebNodes: boolean;
  onChange: (isDirty: boolean) => void;
};

const state: PageBuilderStoreState = {
  projectId: null,
  disallowWebNodes: true,
  onChange: () => {},
};

const mutations = {
  setProjectId(state: PageBuilderStoreState, projectId: string | null) {
    state.projectId = projectId;
  },
};

const handleError = (
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

const getSelectedNodeIdentifierFromStore = (): Identifiers | null => {
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
 * The initial polling interval, i.e., the first call, is 100ms, after that it is 500ms.
 */
const INITIAL_POLLING_INTERVAL = 100;
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
    return { shouldPoll: true, pollInterval: 1 };
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

  registerService(
    { state }: { state: { projectId: string } },
    { service, id }: SelectionServiceParams,
  ): void {
    const { addListener } = useSelectionEvents();
    addListener({ ...id, projectId: state.projectId }, service);
  },

  /**
   * Triggers a partial re-execution of the composite view. This consists of the following steps: validation, value
   * retrieval and page update or polling.
   *
   * @async
   * @param {Object} context - Vuex context.
   * @param {Object} param - action config.
   * @param {String} param.nodeId - id of the node which triggered re-execution.
   * @returns {undefined}
   */
  async triggerReExecution({ dispatch }, { nodeId: resetNodeIdSuffix }) {
    consola.debug(
      "KNIME-UI pageBuilderStore: trigger re-execution due to node",
      resetNodeIdSuffix
        ? `"${resetNodeIdSuffix}"`
        : "none (complete re-execution)",
    );

    const resolvedIdentifiers = getSelectedNodeIdentifierFromStore();
    if (resolvedIdentifiers === null) {
      return;
    }

    const { nodeId: componentNodeId } = resolvedIdentifiers;

    if (
      (await testValidityOfPage({ dispatch }, componentNodeId)) === "invalid"
    ) {
      return;
    }

    const addingResult =
      useReexecutingCompositeViewState().addReexecutingNode(componentNodeId);

    if (addingResult === "alreadyExists") {
      handleError({
        caller: "triggerReExecution",
        error: "Node is already re-executing. Will not trigger again.",
      });
      return;
    }

    try {
      const viewValueResult = await dispatch(
        "pagebuilder/getViewValues",
        null,
        {
          root: true,
        },
      );

      // make all values to strings as expected by the API
      const viewValues = Object.keys(viewValueResult).reduce(
        (accumulator, nodeId) => {
          accumulator[nodeId] = JSON.stringify(viewValueResult[nodeId]);
          return accumulator;
        },
        {},
      );

      const reexecutingPage =
        (await API.component.triggerCompleteComponentReexecution({
          ...resolvedIdentifiers,
          viewValues,
        })) as unknown as ReexecutingPage;

      await Promise.all(
        reexecutingPage.resetNodes.map((nodeId) => {
          return dispatch(
            "pagebuilder/resetDirtyState",
            { nodeId },
            { root: true },
          );
        }),
      );

      const isDirty = await dispatch("pagebuilder/isDirty", null, {
        root: true,
      });
      await dispatch("api/onChange", { isDirty }, { root: true });

      await dispatch("pollReExecution", {
        reexecutingPage,
        resolvedIdentifiers,
      });
    } catch (error) {
      handleError({
        caller: "triggerReExecution",
        error,
      });
    } finally {
      useReexecutingCompositeViewState().removeReexecutingNode(componentNodeId);
    }
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
        (await API.component.pollCompleteComponentReexecutionStatus(
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
        (await API.component.pollCompleteComponentReexecutionStatus(
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

    const versionId = computed(
      () => useWorkflowStore().activeWorkflow!.info.version,
    );

    const result = await API.component.getCompositeViewPage({
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
    };

    commit("setProjectId", projectId);
    await dispatch("pagebuilder/setPage", { page }, { root: true });
  },
};

const getters = {
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
  disallowWebNodes: (state: PageBuilderStoreState) => state.disallowWebNodes,
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
