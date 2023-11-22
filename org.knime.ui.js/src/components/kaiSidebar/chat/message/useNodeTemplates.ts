import { ref, watchEffect } from "vue";
import { useStore } from "@/composables/useStore";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";

import type { ExtensionWithNodes, NodeWithExtensionInfo } from "../../types";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";

/**
 * A Vue composition function that provides node templates based on given role and nodes.
 * @param params - An object containing role and nodes.
 * @param params.role - The role of the current user.
 * @param params.nodes - A list of nodes.
 * @param params.callback - A callback that is called when all nodetemplates have been fetched.
 * @returns - An object containing refs to nodeTemplates and uninstalledExtensions.
 */
const useNodeTemplates = ({
  role,
  nodes,
  callback,
}: {
  role: string;
  nodes: NodeWithExtensionInfo[];
  callback: () => void;
}) => {
  // Reactive references to hold the node templates.
  const nodeTemplates = ref<NodeTemplateWithExtendedPorts[]>([]);
  const uninstalledExtensions = ref<{ [key: string]: ExtensionWithNodes }>({});

  const store = useStore();

  watchEffect(async () => {
    // If the role is not "assistant", exit early.
    if (role !== "assistant") {
      return;
    }

    // Temporary variables to hold the values for this effect run.
    const _nodeTemplates: NodeTemplate[] = [];
    const _uninstalledExtensions: { [key: string]: ExtensionWithNodes } = {};

    // Fetching node templates concurrently.
    await Promise.all(
      nodes.map(async (node) => {
        // Dispatching a Vuex action to get a node template.
        const nodeTemplate: NodeTemplate = await store.dispatch(
          "nodeRepository/getNodeTemplate",
          node.factoryId,
        );

        if (nodeTemplate) {
          // If nodeTemplate exists, add it to the list.
          _nodeTemplates.push(nodeTemplate);
        } else {
          // If the nodeTemplate doesn't exist, consider it as an uninstalled extension.
          let extension = _uninstalledExtensions[node.featureSymbolicName];
          if (!extension) {
            // Create a new extension object if it doesn't already exist.
            extension = {
              featureSymbolicName: node.featureSymbolicName,
              featureName: node.featureName,
              owner: node.owner,
              nodes: [],
            };
            _uninstalledExtensions[node.featureSymbolicName] = extension;
          }

          // Append the node details to the extension.
          extension.nodes.push({
            factoryId: node.factoryId,
            factoryName: node.factoryName,
            title: node.title,
          });
        }
      }),
    );

    // Updating the reactive refs with the new values.
    nodeTemplates.value = _nodeTemplates.map(
      toNodeTemplateWithExtendedPorts(
        store.state.application.availablePortTypes,
      ),
    );
    uninstalledExtensions.value = _uninstalledExtensions;
    callback();
  });

  return {
    nodeTemplates,
    uninstalledExtensions,
  };
};

export { useNodeTemplates };
