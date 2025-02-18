import { consola } from "consola";

import { API } from "@/api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types.ts";
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

  registerService(_: any, { service, id }: SelectionServiceParams): void {
    // TODO(NXT-3316): We have these two versions of the projectId. The "more correct" version is one with an added uuid
    // but the SelectionEvent will use the simpler projectId one. So we dont use the "correct one" right now
    // const projectId = useApplicationStore().activeProjectId;

    const { addListener } = useSelectionEvents();
    addListener({ ...id }, service);
  },

  deregisterService(_: any, id: Identifiers): void {
    const { removeListener } = useSelectionEvents();
    removeListener({ ...id });
  },

  async changeNodeStates(): Promise<void> {
    await useExecutionStore().executeNodes("selected");
  },

  async mount(
    { dispatch }: any,
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

    await dispatch("pagebuilder/setPage", { page }, { root: true });
  },
};

const getters = {
  // tableView will use this getter to get the resource location
  uiExtResourceLocation:
    () =>
    ({
      resourceInfo,
    }: {
      resourceInfo: { baseUrl: string; path: string };
    }): string => {
      return resourceInfo.baseUrl + resourceInfo.path;
    },
};

export const pageBuilderStoreConfig = {
  actions,
  getters,
  namespaced: true,
};
