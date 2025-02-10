import { consola } from "consola";

import { API } from "@/api";
import type { ExtensionConfig } from "@/components/uiExtensions/common/types.ts";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import { mockedPage } from "@/components/uiExtensions/componentView/MockedPage.ts";
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

    if (nodeService === "NodeService.callNodeDataService") {
      result = await API.node.callNodeDataService({
        projectId,
        workflowId,
        nodeId,
        extensionType,
        serviceType: serviceRequest,
        dataServiceRequest: requestParams,
      });
    } else if (nodeService === "NodeService.updateDataPointSelection") {
      result = await API.node.updateDataPointSelection({
        projectId: useApplicationStore().activeProjectId ?? "",
        workflowId,
        nodeId,
        mode: serviceRequest,
        selection: requestParams,
      });
    }
    return { result: JSON.parse(result) };
  },

  registerService(_: any, { service, id }: SelectionServiceParams): void {
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

  async mount({ dispatch }: any): Promise<void> {
    consola.info("Loading page for PageBuilder");
    const page = mockedPage;
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
