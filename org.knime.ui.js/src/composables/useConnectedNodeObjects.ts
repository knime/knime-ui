import { computed, type Ref } from "vue";
import { useStore } from "./useStore";

type UseConnectedNodeObjectsOptions = {
  /**
   * Node ID of the connector's source node
   */
  sourceNode: Ref<string | null>;
  /**
   * Node ID of the connector's target node
   */
  destNode: Ref<string | null>;
};

export const useConnectedNodeObjects = (
  options: UseConnectedNodeObjectsOptions,
) => {
  const store = useStore();

  const sourceNodeObject = computed(
    () => store.state.workflow.activeWorkflow.nodes[options.sourceNode.value],
  );
  const destNodeObject = computed(
    () => store.state.workflow.activeWorkflow.nodes[options.destNode.value],
  );

  return {
    sourceNodeObject,
    destNodeObject,
  };
};
