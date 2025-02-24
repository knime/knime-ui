import { API } from "@api";
import { defineStore } from "pinia";

import type { ComponentNodeDescription } from "@/api/custom-types";
import type { NodeFactoryKey } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  type ComponentNodeDescriptionWithExtendedPorts,
  type NativeNodeDescriptionWithExtendedPorts,
  toComponentNodeDescriptionWithExtendedPorts,
  toNativeNodeDescriptionWithExtendedPorts,
} from "@/util/portDataMapper";

/**
 * Store that manages state for node and component descriptions.
 */

export const useNodeDescriptionStore = defineStore("nodeDescription", {
  state: () => ({
    /* nodeDescriptions cache */
    cache: new Map<string, NativeNodeDescriptionWithExtendedPorts>(),
  }),
  actions: {
    async getNativeNodeDescription({
      factoryId,
      nodeFactory,
    }: {
      factoryId: string;
      nodeFactory: NodeFactoryKey;
    }): Promise<NativeNodeDescriptionWithExtendedPorts> {
      const { className, settings } = nodeFactory;

      // Check if the node description is already in the cache
      if (this.cache.has(factoryId)) {
        consola.trace(
          "action::getNativeNodeDescription -> Retrieving node description from cache",
          { factoryId },
        );
        return this.cache.get(factoryId)!;
      }

      const params = {
        nodeFactoryKey: { className, settings },
      };

      try {
        const nodeDescription = await API.node.getNodeDescription(params);

        const nodeDescriptionWithExtendedPorts =
          toNativeNodeDescriptionWithExtendedPorts(
            useApplicationStore().availablePortTypes,
          )(nodeDescription);

        this.cache.set(factoryId, nodeDescriptionWithExtendedPorts);

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

    async getComponentDescription({
      nodeId,
    }: {
      nodeId: string;
    }): Promise<ComponentNodeDescriptionWithExtendedPorts> {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;
      const params = {
        nodeId,
        projectId,
        workflowId,
      };

      try {
        const componentDescription = (await API.component.getComponentDescription(
          params,
        )) as ComponentNodeDescription; // TODO: NXT-2023 - remove type cast

        return toComponentNodeDescriptionWithExtendedPorts(
          useApplicationStore().availablePortTypes,
        )(componentDescription);
      } catch (error) {
        consola.error(
          "action::getComponentDescription -> Error calling API.node.getComponentDescription",
          { params, error },
        );

        throw error;
      }
    },
  },
});
