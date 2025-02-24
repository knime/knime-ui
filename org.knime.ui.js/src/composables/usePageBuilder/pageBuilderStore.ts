import { consola } from "consola";

import { API } from "@/api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types.ts";
import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import { useApplicationStore } from "@/store/application/application.ts";
import { useSelectionStore } from "@/store/selection.ts";
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
};

const state: PageBuilderStoreState = {
  projectId: null,
};

const mutations = {
  setProjectId(state, projectId) {
    state.projectId = projectId;
  },
};

const testValidityOfPage = async ({
  dispatch,
}): Promise<"valid" | "invalid"> => {
  try {
    const res = await dispatch("pagebuilder/getValidity", null, { root: true });

    const viewValidities = Object.values(res);

    const isValid = viewValidities.every((isValid) => isValid === true);

    if (!isValid) {
      dispatch("handleError", {
        caller: "triggerReExecution",
        error:
          "Client-side validation failed. Please check the page for errors.",
      });
      return "invalid";
    }
  } catch (error) {
    dispatch("handleError", {
      caller: "triggerReExecution",
      error: "Validation check failed unexpectedly.",
    });
    return "invalid";
  }
  return "valid";
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

    if (nodeService === "NodeService.callNodeDataService") {
      result = await API.node.callNodeDataService({
        projectId: realProjectId,
        workflowId,
        nodeId,
        extensionType,
        serviceType: serviceRequest,
        dataServiceRequest: requestParams,
      });
    } else if (nodeService === "NodeService.updateDataPointSelection") {
      result = await API.node.updateDataPointSelection({
        projectId: realProjectId,
        workflowId,
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
   * retrieval and page update or polling initialization.
   *
   * @async
   * @param {Object} context - Vuex context.
   * @param {Object} param - action config.
   * @param {String} param.nodeId - id of the node which triggered re-execution.
   * @returns {undefined}
   */
  async triggerReExecution({ dispatch }, { nodeId: resetNodeIdSuffix }) {
    consola.debug("KNIME-UI pageBuilderStore: trigger re-execution");

    const { projectId, workflowId } =
      useWorkflowStore().getProjectAndWorkflowIds;

    const selectedNode = useSelectionStore().singleSelectedNode;

    if (selectedNode === null || !workflowId) {
      const cause =
        selectedNode === null
          ? "Please select a single node."
          : "Invalid WorkflowId.";
      consola.error(
        `KNIME-UI pageBuilderStore: trigger re-execution failed. ${cause}`,
      );
      return;
    }

    const componentNodeId = selectedNode.id;

    const pageValidity = await testValidityOfPage({ dispatch });
    if (pageValidity === "invalid") {
      return;
    }

    const viewValues = await dispatch("pagebuilder/getViewValues", null, {
      root: true,
    }).catch(() => false);

    const params = Object.keys(viewValues).reduce((obj, nId) => {
      obj[nId] = JSON.stringify(viewValues[nId]);
      return obj;
    }, {});

    await API.component.triggerComponentReexecution({
      projectId,
      workflowId,
      nodeId: componentNodeId,
      resetNodeIdSuffix,
      viewValues: { ...params },
    });
  },

  deregisterService(_: any, id: Identifiers): void {
    const { removeListener } = useSelectionEvents();
    removeListener({ ...id });
  },

  async changeNodeStates(): Promise<void> {
    await useExecutionStore().executeNodes("selected");
  },

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

    const result = await API.component.getCompositeViewPage({
      projectId,
      workflowId,
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
