<script>
import {
  buildMiddleware,
  validateNodeConfigurationState,
  validateNodeExecutionState,
} from "../common/output-validator";

import NodeViewLoader from "./NodeViewLoader.vue";

/**
 * Runs a set of validations that qualify whether a node from a given group is able
 * to show its view
 * @param {Object} payload
 * @param {Object} payload.selectedNodes the group of nodes that are currently selected
 * @param {number} payload.isDragging whether there's a drag operation taking place
 * @param {Object} payload.portTypes dictionary of Port Types. Can be used to get more information on the port based
 * on its typeId property
 * @returns {Object} object containing an `error` property. If not null then it means the node is invalid. Additionally
 * more details about the error can be read from that `error` object
 */
export const runNodeValidationChecks = ({ selectedNode, portTypes }) => {
  const validationMiddleware = buildMiddleware(
    validateNodeConfigurationState,
    validateNodeExecutionState,
  );

  const result = validationMiddleware({ selectedNode, portTypes })();

  return Object.freeze(result);
};

/**
 * Validates and renders the PortViewLoader. It ensures the conditions are right for the PortView to be loaded
 * via several validation constraints. It yields back information about said validations as well as information
 * about the loading state of the PortView
 */
export default {
  components: {
    NodeViewLoader,
  },

  props: {
    projectId: {
      type: String,
      required: true,
    },
    workflowId: {
      type: String,
      required: true,
    },
    selectedNode: {
      type: Object,
      required: true,
    },
    availablePortTypes: {
      type: Object,
      required: true,
    },
  },

  emits: ["outputStateChange"],

  data() {
    return {
      nodeViewState: null,
    };
  },

  computed: {
    nodeErrors() {
      const { error } = runNodeValidationChecks({
        selectedNode: this.selectedNode,
        portTypes: this.availablePortTypes,
      });

      return error;
    },
  },

  watch: {
    /**
     * Emits null or an object with the following structure:
     *  EventPayload {
     *      message: string;
     *      loading?: string;
     *      error?: {
     *          type: string;
     *          code: string;
     *      }
     *  }
     */
    nodeErrors: {
      immediate: true,
      handler() {
        if (this.nodeErrors) {
          this.$emit("outputStateChange", {
            loading: this.nodeErrors.code === "NODE_BUSY",
            message: this.nodeErrors.message,
            error: this.nodeErrors,
          });
        }
      },
    },
  },

  methods: {
    onNodeViewStateChange(newState) {
      this.nodeViewState = newState;

      switch (this.nodeViewState?.state) {
        case "loading": {
          this.$emit("outputStateChange", {
            message: "Loading data",
            loading: true,
          });
          return;
        }
        case "error": {
          this.$emit("outputStateChange", {
            message: this.nodeViewState.message,
          });
          return;
        }
        default: {
          this.$emit("outputStateChange", null);
        }
      }
    },
  },
};
</script>

<template>
  <NodeViewLoader
    v-if="!nodeErrors"
    kind="node-view"
    :project-id="projectId"
    :workflow-id="workflowId"
    :selected-node="selectedNode"
    @state-change="onNodeViewStateChange"
  />
</template>
