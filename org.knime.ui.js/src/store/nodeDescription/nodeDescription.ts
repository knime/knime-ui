import { API } from "@api";
import { defineStore } from "pinia";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import type { ComponentNodeDescription } from "@/api/custom-types";
import type { NodeFactoryKey } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  type ComponentNodeDescriptionWithExtendedPorts,
  type NativeNodeDescriptionWithExtendedPorts,
  componentDescription,
  nodeDescription,
} from "@/util/data-mappers";

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
        const nativeNodeDescription = await API.node.getNodeDescription(params);

        const nodeDescriptionWithExtendedPorts =
          nodeDescription.toNativeNodeDescriptionWithExtendedPorts(
            useApplicationStore().availablePortTypes,
          )(nativeNodeDescription);

        this.cache.set(factoryId, nodeDescriptionWithExtendedPorts);

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
      const { getProjectAndWorkflowIds, activeWorkflow } = useWorkflowStore();
      const { projectId, workflowId } = getProjectAndWorkflowIds;
      const versionId = activeWorkflow?.info.version;
      const params = {
        projectId,
        workflowId,
        versionId: versionId ?? CURRENT_STATE_VERSION,
        nodeId,
      };

      try {
        const rawDescription = (await API.component.getComponentDescription(
          params,
        )) as ComponentNodeDescription; // TODO: NXT-2023 - remove type cast

        return componentDescription.toComponentNodeDescriptionWithExtendedPorts(
          useApplicationStore().availablePortTypes,
        )(rawDescription);
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
