import { ref, watchEffect } from "vue";
import { useStore } from "@/composables/useStore";

import type { ExtensionWithNodes, NodeWithExtensionInfo } from "../../types";
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

    // Temporary variable to hold the values for this effect run.
    const _uninstalledExtensions: { [key: string]: ExtensionWithNodes } = {};

    const getUninstalledExtension = (
      node: NodeWithExtensionInfo,
    ): ExtensionWithNodes => {
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

      return extension;
    };

    const nodeTemplateIds = nodes.map(({ factoryId }) => factoryId);

    const { found, missing } = (await store.dispatch(
      "nodeTemplates/getNodeTemplates",
      { nodeTemplateIds },
    )) as {
      found: Record<string, NodeTemplateWithExtendedPorts>;
      missing: string[];
    };

    if (missing.length > 0) {
      nodes
        .filter(({ factoryId }) => missing.includes(factoryId))
        .forEach((node) => {
          const extension = getUninstalledExtension(node);

          // Append the node details to the extension.
          extension.nodes.push({
            factoryId: node.factoryId,
            factoryName: node.factoryName,
            title: node.title,
          });
        });
    }

    nodeTemplates.value = Object.values(found);
    uninstalledExtensions.value = _uninstalledExtensions;
    callback();
  });

  return {
    nodeTemplates,
    uninstalledExtensions,
  };
};

export { useNodeTemplates };
