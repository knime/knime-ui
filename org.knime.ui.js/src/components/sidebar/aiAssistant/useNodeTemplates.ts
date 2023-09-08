import { ref, watchEffect } from "vue";
import { useStore } from "vuex";

// TODO: AP-20131 Node identifier in node stats and modern node repo can have clashes
// This is a temporary fix to avoid problems with the factory name for dynamic factories:
// Data from the hub looks like this: ...$DynamicExtensionNodeFactory:ffae4570 but in
// knime-ui ...$DynamicExtensionNodeFactory#LLM+Prompter is needed to get the node template.
const getInternalFactoryName = (factoryName, title) => {
  const pattern = /(\$DynamicExtensionNodeFactory):[\w\d]+/;
  if (pattern.test(factoryName)) {
    return factoryName.replace(pattern, "$1#") + title.replace(/ /g, "+");
  }
  return factoryName;
};

/**
 * A Vue composition function that provides node templates based on given role and nodes.
 * @param {Object} params - An object containing role and nodes.
 * @param {string} params.role - The role of the current user.
 * @param {Array} params.nodes - A list of nodes.
 * @returns {Object} - An object containing refs to nodeTemplates and uninstalledExtensions.
 */
const useNodeTemplates = ({ role, nodes }) => {
  // Reactive references to hold the node templates.
  const nodeTemplates = ref([]);
  const uninstalledExtensions = ref({});

  const store = useStore();

  watchEffect(async () => {
    // If the role is not "assistant", exit early.
    if (role !== "assistant") {
      return;
    }

    // Temporary variables to hold the values for this effect run.
    const _nodeTemplates = [];
    const _uninstalledExtensions = {};

    // Fetching node templates concurrently.
    await Promise.all(
      nodes.map(async (node) => {
        // Dispatching a Vuex action to get a node template.
        const nodeTemplate = await store.dispatch(
          "nodeRepository/getNodeTemplate",
          getInternalFactoryName(node.factoryName, node.title),
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
              featureVendor: node.featureVendor,
              nodes: [],
            };
            _uninstalledExtensions[node.featureSymbolicName] = extension;
          }

          // Append the node details to the extension.
          extension.nodes.push({
            factoryName: node.factoryName,
            title: node.title,
          });
        }
      }),
    );

    // Updating the reactive refs with the new values.
    nodeTemplates.value = _nodeTemplates;
    uninstalledExtensions.value = _uninstalledExtensions;
  });

  return {
    nodeTemplates,
    uninstalledExtensions,
  };
};

export default useNodeTemplates;
