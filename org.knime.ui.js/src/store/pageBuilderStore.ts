import { consola } from "consola";

import { API } from "@/api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types.ts";
import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import { useApplicationStore } from "@/store/application/application.ts";
import { useExecutionStore } from "@/store/workflow/execution";

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

const state = {
  projectId: null,
};

const mutations = {
  setProjectId(state, projectId) {
    state.projectId = projectId;
  },
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
    consola.info("Loading page for PageBuilder");

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
    (state) =>
    ({
      resourceInfo,
    }: {
      resourceInfo: { baseUrl: string; path: string };
    }): string => {
      return resourceLocationResolver(
        state.projectId,
        resourceInfo.path,
        resourceInfo.baseUrl,
      );
    },
};

export const pageBuilderStoreConfig = {
  state,
  mutations,
  actions,
  getters,
  namespaced: true,
};
