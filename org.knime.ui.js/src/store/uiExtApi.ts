import { API } from "@api";

// TODO: NXT-1295 the action / getter names in this store module CANNOT be renamed
// See other TODOs below

export const actions = {
  // TODO: NXT-1295 this is internally called by the pagebuilder. This should be removed if the page builder is
  // reworked to not be coupled to the existence of such a store
  // See: https://bitbucket.org/KNIME/knime-js-pagebuilder/src/6d50150c80a73eeb8281c368ce2a4a30ce2ed509/org.knime.js.pagebuilder/src/components/views/UIExtension.vue#lines-97
  async callService(
    _,
    { extensionConfig, nodeService, serviceRequest, requestParams }
  ) {
    const { projectId, workflowId, nodeId, extensionType } = extensionConfig;
    let result;

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
      // TODO: implement update selection. Also, is this needed for our use case?
      result = '{ "TODO": "TODO" }';
    }
    return { result: JSON.parse(result) };
  },

  // TODO: NXT-1295 this is internally called by the PageBuilder. It should be reworked into something different. Right now,
  // this gets called when the view has changed due to a node configuration change and it requires to be reloaded
  // See: https://bitbucket.org/KNIME/knime-js-pagebuilder/src/6d50150c80a73eeb8281c368ce2a4a30ce2ed509/org.knime.js.pagebuilder/src/components/views/ViewExecutable.vue#lines-51
  changeNodeStates({ dispatch, rootGetters }) {
    const singleSelectedNode = rootGetters["selection/singleSelectedNode"];
    dispatch("workflow/executeNodes", [singleSelectedNode.id], { root: true });
  },
};

export const getters = {
  // TODO: NXT-1295 This is internally used by the TableView, which is not ideal and should be removed to reduce coupling
  // See: https://bitbucket.org/KNIME/knime-base-views/src/dfd7674d74343205c36c627e795fd69722761936/org.knime.base.views/js-src/vue/src/components/TableView.vue#lines-396
  uiExtResourceLocation:
    () =>
    ({ resourceInfo }) =>
      resourceInfo.baseUrl + resourceInfo.path,
};
