import { ref, watchEffect } from "vue";
import { useStore } from "vuex";

const useNodeTemplates = ({ role, nodes }) => {
  const nodeTemplates = ref([]);
  const uninstalledExtensions = ref({});
  const store = useStore();

  watchEffect(async () => {
    if (role !== "assistant") {
      return;
    }

    // Resetting the values
    nodeTemplates.value = [];
    uninstalledExtensions.value = {};

    await Promise.all(
      nodes.forEach(async (node) => {
        const { factoryName } = node;
        const nodeTemplate = await store.dispatch(
          "nodeRepository/getNodeTemplate",
          factoryName,
        );

        if (nodeTemplate) {
          nodeTemplates.value.push(nodeTemplate);
        } else {
          let extension = uninstalledExtensions.value[node.featureSymbolicName];
          if (!extension) {
            extension = {
              featureSymbolicName: node.featureSymbolicName,
              featureName: node.featureName,
              featureVendor: node.featureVendor,
              nodes: [],
            };
            uninstalledExtensions.value[node.featureSymbolicName] = extension;
          }

          extension.nodes.push({
            factoryName: node.factoryName,
            title: node.title,
          });
        }
      }),
    );
  });

  return {
    nodeTemplates,
    uninstalledExtensions,
  };
};

export default useNodeTemplates;
