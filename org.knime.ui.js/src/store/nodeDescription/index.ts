import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";

import {
  toNativeNodeDescriptionWithExtendedPorts,
  toComponentNodeDescriptionWithExtendedPorts,
} from "@/util/portDataMapper";

import type { RootStoreState } from "../types";
import type {
  NativeNodeDescription,
  NodeFactoryKey,
} from "@/api/gateway-api/generated-api";
import type { ComponentNodeDescription } from "@/api/custom-types";

/**
 * Store that manages state for node and component descriptions.
 */

export interface NodeDescriptionState {
  cache: Map<string, NativeNodeDescription>;
}

export const state = (): NodeDescriptionState => ({
  /* nodeDescriptions cache */
  cache: new Map<string, NativeNodeDescription>(),
});

export const mutations: MutationTree<NodeDescriptionState> = {};

export const actions: ActionTree<NodeDescriptionState, RootStoreState> = {
  async getNativeNodeDescription(
    { rootState },
    {
      factoryId,
      nodeFactory,
    }: { factoryId: string; nodeFactory: NodeFactoryKey },
  ) {
    const { className, settings } = nodeFactory;
    const { availablePortTypes } = rootState.application;

    // Check if the node description is already in the cache
    if (rootState.nodeDescription.cache.has(factoryId)) {
      consola.trace(
        "action::getNativeNodeDescription -> Retrieving node description from cache",
        { factoryId },
      );
      return rootState.nodeDescription.cache.get(factoryId);
    }

    const params = {
      nodeFactoryKey: { className, settings },
    };

    try {
      const nodeDescription = await API.node.getNodeDescription(params);

      const nodeDescriptionWithExtendedPorts =
        toNativeNodeDescriptionWithExtendedPorts(availablePortTypes)(
          nodeDescription,
        );

      rootState.nodeDescription.cache.set(
        factoryId,
        nodeDescriptionWithExtendedPorts,
      );

      consola.trace(
        "action::getNativeNodeDescription -> Request to API.node.getNodeDescription",
        {
          params,
          response: nodeDescription,
        },
      );

      return nodeDescriptionWithExtendedPorts;
    } catch (error) {
      consola.error(
        "action::getNativeNodeDescription -> Error calling API.node.getNodeDescription",
        { params, error },
      );

      throw error;
    }
  },

  async getComponentDescription({ rootState, rootGetters }, { nodeId }) {
    const { projectId, workflowId } =
      rootGetters["workflow/projectAndWorkflowIds"];

    const params = {
      nodeId,
      projectId,
      workflowId,
    };

    try {
      const componentDescription = (await API.node.getComponentDescription(
        params,
      )) as ComponentNodeDescription; // TODO: NXT-2023 - remove type cast

      const { availablePortTypes } = rootState.application;
      return toComponentNodeDescriptionWithExtendedPorts(availablePortTypes)(
        componentDescription,
      );
    } catch (error) {
      consola.error(
        "action::getComponentDescription -> Error calling API.node.getComponentDescription",
        { params, error },
      );

      throw error;
    }
  },
};

export const getters: GetterTree<NodeDescriptionState, RootStoreState> = {};
