<script lang="ts">
/* eslint-disable valid-jsdoc */
/* eslint-disable object-curly-newline  */
import { defineComponent, type PropType } from "vue";

import PlayIcon from "@/assets/execute.svg";
import Button from "webapps-common/ui/components/Button.vue";

import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import { MetaNodePort, NodeState } from "@/api/gateway-api/generated-api";
import PortViewLoader from "@/components/embeddedViews/PortViewLoader.vue";
import type { ViewStateChangeEvent } from "@/components/embeddedViews/ViewLoader.vue";
import { toPortObject } from "@/util/portDataMapper";

import {
  buildMiddleware,
  validateNodeConfigurationState,
  validateNodeExecutionState,
  validateOutputPorts,
  validatePortSelection,
  validatePortSupport,
  type ValidationResult,
} from "./output-validator";

import { canExecute, isNodeMetaNode } from "@/util/nodeUtil";
import PortViewTabToggles from "./PortViewTabToggles.vue";

/**
 * Runs a set of validations that qualify whether a port from a node is able
 * to show its view
 * @returns object containing an `error` property. If not null then it means the port is invalid. Additionally
 * more details about the error can be read from the `error` object
 */
const runValidationChecks = ({
  selectedNode,
  portTypes,
  selectedPortIndex,
}: {
  /** the node that is currently selected */
  selectedNode: KnimeNode;
  /** dictionary of Port Types. Can be used to get more information on the port based on its typeId property */
  portTypes: AvailablePortTypes;
  /** index of the selected port */
  selectedPortIndex: number;
}) => {
  const validationMiddleware = buildMiddleware(
    validateOutputPorts,
    validatePortSelection,
    validatePortSupport,
    validateNodeConfigurationState,
    validateNodeExecutionState,
  );

  const result = validationMiddleware({
    selectedNode,
    portTypes,
    selectedPortIndex,
  })();

  return Object.freeze(result);
};

interface ComponentData {
  portViewState: ViewStateChangeEvent | null;
}

/**
 * Validates and renders the PortViewLoader. It ensures the conditions are right for the PortView to be loaded
 * via several validation constraints. It yields back information about said validations as well as information
 * about the loading state of the PortView
 */
export default defineComponent({
  components: {
    PortViewLoader,
    PortViewTabToggles,
    Button,
    PlayIcon,
  },

  inheritAttrs: false,

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
      type: Object as PropType<KnimeNode>,
      required: true,
    },
    selectedPortIndex: {
      type: Number,
      required: true,
    },
    availablePortTypes: {
      type: Object as PropType<AvailablePortTypes>,
      required: true,
    },
  },

  emits: {
    outputStateChange: (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _payload: {
        message: string;
        loading?: boolean;
        error?: ValidationResult["error"];
      } | null,
    ) => true,
    executeNode: () => true,
  },

  data(): ComponentData {
    return {
      portViewState: null,
    };
  },

  computed: {
    uniquePortKey() {
      // using UNIQUE keys for all possible ports in knime-ui ensures that a new port view instance
      // is created upon switching ports
      // port object version changes whenever a port state has updated.
      // "ABA"-Changes on the port will always trigger a re-render.

      const { portContentVersion } =
        this.selectedNode.outPorts[this.selectedPortIndex];

      return [
        this.projectId,
        this.workflowId,
        this.selectedNode.id,
        this.selectedPortIndex,
        portContentVersion,
      ].join("/");
    },

    hasNoDataValidationError() {
      return this.validationError && this.validationError.code === "NO_DATA";
    },

    validationError(): ValidationResult["error"] | null {
      const { error } = runValidationChecks({
        selectedNode: this.selectedNode,
        portTypes: this.availablePortTypes,
        selectedPortIndex: this.selectedPortIndex,
      });

      return error || null;
    },

    selectedPort() {
      if (this.validationError) {
        return null;
      }

      return this.selectedNode.outPorts[this.selectedPortIndex];
    },

    fullPortObject() {
      return toPortObject(this.availablePortTypes)(this.selectedPort.typeId);
    },

    portViews() {
      return this.fullPortObject.views;
    },

    currentNodeState(): "configured" | "executed" {
      // metanodes have no configured state so they use the state of the selected output port
      if (isNodeMetaNode(this.selectedNode)) {
        const portState =
          this.selectedNode.outPorts[this.selectedPortIndex].nodeState;

        return portState === MetaNodePort.NodeStateEnum.CONFIGURED
          ? "configured"
          : "executed";
      }

      return this.selectedNode.state.executionState ===
        NodeState.ExecutionStateEnum.CONFIGURED
        ? "configured"
        : "executed";
    },

    shouldShowExecuteAction() {
      if (this.validationError && !this.hasNoDataValidationError) {
        return false;
      }

      const canSelectedNodeExecute = canExecute(
        this.selectedNode,
        this.selectedPortIndex,
      );

      if (this.hasNoDataValidationError) {
        return canSelectedNodeExecute;
      }

      const isFlowVariable = this.fullPortObject.kind === "flowVariable";
      return canSelectedNodeExecute && !isFlowVariable;
    },
  },

  watch: {
    validationError: {
      immediate: true,
      handler() {
        if (this.validationError) {
          this.$emit("outputStateChange", {
            loading: this.validationError.code === "NODE_BUSY",
            message: this.validationError.message,
            error: this.validationError,
          });
        } else {
          this.$emit("outputStateChange", null);
        }
      },
    },
  },

  methods: {
    onPortViewLoaderStateChange(newPortViewState: ViewStateChangeEvent | null) {
      this.portViewState = newPortViewState;

      switch (this.portViewState?.state) {
        case "loading": {
          this.$emit("outputStateChange", {
            message: "Loading data",
            loading: true,
          });
          return;
        }
        case "error": {
          this.$emit("outputStateChange", {
            message: this.portViewState.message,
          });
          return;
        }
        default: {
          this.$emit("outputStateChange", null);
        }
      }
    },
  },
});
</script>

<template>
  <PortViewTabToggles
    v-if="!validationError"
    :current-node-state="currentNodeState"
    :unique-port-key="uniquePortKey"
    :view-descriptors="portViews.descriptors"
    :view-descriptor-mapping="portViews.descriptorMapping"
  >
    <template #default="{ activeView }">
      <PortViewLoader
        v-if="!validationError && activeView !== null"
        v-bind="$attrs"
        :unique-port-key="`${uniquePortKey}/${activeView}`"
        :project-id="projectId"
        :workflow-id="workflowId"
        :selected-node="selectedNode"
        :selected-port-index="selectedPortIndex"
        :selected-view-index="activeView"
        @state-change="onPortViewLoaderStateChange"
      />
    </template>
  </PortViewTabToggles>

  <div v-if="shouldShowExecuteAction" class="execute-node-action">
    <span>To show the output, please execute the selected node.</span>
    <Button class="action-button" primary compact @click="$emit('executeNode')">
      <PlayIcon />
      Execute
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.execute-node-action {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  width: 440px;
  height: 110px;
  inset: v-bind("hasNoDataValidationError ? 0 : '130px'") 0 0 0;
  margin: auto;
  background: rgba(255 255 255 / 30%);
  backdrop-filter: blur(10px);
}

.action-button {
  margin-top: 20px;

  & svg {
    border-radius: 12px;
    background: var(--knime-white);
    border: 1px solid var(--knime-masala);
  }

  &:hover > svg {
    stroke: var(--knime-masala) !important;
  }
}
</style>
