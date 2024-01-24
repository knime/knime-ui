<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";

import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import Button from "webapps-common/ui/components/Button.vue";
import PlayIcon from "webapps-common/ui/assets/img/icons/play.svg";

import { canExecute, getNodeState } from "@/util/nodeUtil";
import type { ApplicationState } from "@/store/application";
import type { WorkflowState } from "@/store/workflow";

import PortTabs from "./PortTabs.vue";
import PortViewTabOutput from "./portViews/PortViewTabOutput.vue";
import NodeViewTabOutput from "./nodeViews/NodeViewTabOutput.vue";

import {
  buildMiddleware,
  validateDragging,
  validateSelection,
  type ValidationResult,
} from "./common/output-validator";

export const runValidationChecks = ({
  selectedNodes,
  isDragging,
}: {
  selectedNodes: KnimeNode[];
  isDragging: boolean;
}) => {
  const validationMiddleware = buildMiddleware(
    validateDragging,
    validateSelection,
  );

  const result = validationMiddleware({ selectedNodes, isDragging })();

  return Object.freeze(result);
};

interface ComponentData {
  // either 'view' or the number of the port as string
  selectedTab: "view" | Omit<string, "view"> | null;

  outputState: {
    loading?: boolean;
    message?: string;
    error?: ValidationResult["error"];
  } | null;
}

/**
 * Node output panel, displaying output port selection bar and port view if possible.
 * Port view will be rendered dynamically based on the port type
 */
export default defineComponent({
  components: {
    PortTabs,
    ReloadIcon,
    PortViewTabOutput,
    NodeViewTabOutput,
    Button,
    PlayIcon,
  },
  data(): ComponentData {
    return {
      selectedTab: null,
      outputState: null,
    };
  },
  computed: {
    ...mapState("application", {
      projectId: (state: unknown) =>
        (state as ApplicationState).activeProjectId as string | null,
      availablePortTypes: (state: unknown) =>
        (state as ApplicationState).availablePortTypes as AvailablePortTypes,
    }),
    ...mapState("workflow", {
      workflowId: (state: unknown) =>
        (state as WorkflowState).activeWorkflow!.info.containerId,
      isDragging: (state: unknown) => (state as WorkflowState).isDragging,
    }),
    ...mapGetters("selection", ["selectedNodes", "singleSelectedNode"]),

    canSelectTabs() {
      // allow selecting tabs when:
      return (
        // doesn't have errors in the output state
        !this.outputState?.error ||
        // or when it doesn't have these specific error types
        (this.outputState?.error?.code !== "NO_SUPPORTED_PORTS" &&
          this.outputState?.error?.code !== "NODE_DRAGGING")
      );
    },

    isViewTabSelected() {
      return this.selectedTab === "view";
    },

    selectedPortIndex() {
      // tab values are port indexes if it's not the view tab as string
      return this.isViewTabSelected ? null : Number(this.selectedTab);
    },

    validationErrors() {
      const validationResult = runValidationChecks({
        selectedNodes: this.selectedNodes,
        isDragging: this.isDragging,
      });

      return validationResult?.error ?? null;
    },

    canExecute() {
      return (
        this.selectedPortIndex &&
        canExecute(this.singleSelectedNode, this.selectedPortIndex)
      );
    },

    isExecuted() {
      if (this.selectedPortIndex === null) {
        return false;
      }

      const state = getNodeState(
        this.singleSelectedNode,
        this.selectedPortIndex,
      );

      return state === "EXECUTED";
    },
  },
  watch: {
    validationErrors: {
      handler(validationErrors) {
        if (this.validationErrors) {
          this.outputState = {
            message: this.validationErrors.message,
            error: validationErrors,
          };
        } else {
          this.selectPort();
        }
      },
      // trigger the port selection as soon as the component mounts, based on the validation results
      immediate: true,
      // watcher won't trigger when the value hasn't been assigned a new value (e.g it stays the same),
      // and that is the case because the computed property has cached it. But we deep watch to select the port
      // and update the output state every time the validations retrigger
      deep: true,
    },
  },
  methods: {
    // select the first tab
    selectPort() {
      let { outPorts, kind: nodeKind } = this.singleSelectedNode;

      // if a node has a view it's the first tab
      if (
        this.singleSelectedNode.hasView &&
        this.$features.shouldDisplayEmbeddedViews()
      ) {
        this.selectedTab = "view";
        return;
      }

      // choose the first node of a metanode
      if (nodeKind === "metanode") {
        this.selectedTab = "0";
        return;
      }

      // node is component or native node
      // select mickey-mouse port, if it is the only one, otherwise the first regular port
      this.selectedTab = outPorts.length > 1 ? "1" : "0";
    },

    openLegacyPortView(executeNode = false) {
      this.$store.dispatch("workflow/openLegacyPortView", {
        nodeId: this.singleSelectedNode.id,
        portIndex: this.selectedPortIndex,
        executeNode,
      });
    },
  },
});
</script>

<template>
  <div id="node-output" class="output-container">
    <PortTabs
      v-if="singleSelectedNode && singleSelectedNode.outPorts.length"
      v-model="selectedTab"
      :has-view-tab="singleSelectedNode.hasView"
      :node="singleSelectedNode"
      :disabled="!canSelectTabs"
    />

    <!-- Error Message / Placeholder message -->
    <div
      v-if="outputState"
      :class="['placeholder', { 'is-viewer-loading': outputState.loading }]"
    >
      <span>
        <ReloadIcon v-if="outputState.loading" class="loading-icon" />
        {{ outputState.message }}
        <div
          v-if="outputState?.error?.code === 'NO_SUPPORTED_VIEW'"
          data-testid="execute-open-legacy-view-action"
        >
          <Button
            v-if="!isExecuted"
            class="action-button action-execute"
            primary
            :disabled="!canExecute"
            compact
            @click="openLegacyPortView(true)"
          >
            <PlayIcon />
            Execute and open legacy port view
          </Button>
          <Button
            :with-border="!isExecuted"
            :class="['action-button', { 'dim-border': !isExecuted }]"
            :primary="isExecuted"
            compact
            @click="openLegacyPortView(false)"
          >
            Open legacy port view
          </Button>
        </div>
      </span>
    </div>

    <template v-if="!validationErrors">
      <NodeViewTabOutput
        v-if="isViewTabSelected && $features.shouldDisplayEmbeddedViews()"
        :project-id="projectId!"
        :workflow-id="workflowId"
        :selected-node="singleSelectedNode"
        :available-port-types="availablePortTypes"
        class="output"
        @output-state-change="outputState = $event"
      />

      <PortViewTabOutput
        v-if="!isViewTabSelected"
        :project-id="projectId!"
        :workflow-id="workflowId"
        :selected-node="singleSelectedNode"
        :selected-port-index="selectedPortIndex!"
        :available-port-types="availablePortTypes"
        class="output"
        @output-state-change="outputState = $event"
        @execute-node="
          $store.dispatch('workflow/executeNodes', [singleSelectedNode.id])
        "
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes show {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.output {
  flex-shrink: 1;
  overflow-y: auto;
}

.placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;

  & .is-viewer-loading {
    /* Wait for a short amount of time before rendering loading placeholder
       to prevent flickering when the table loads very quickly */
    animation: show 100ms ease-in 150ms;
    animation-fill-mode: both;
  }

  & span {
    font-size: 16px;
    text-align: center;
    font-style: italic;
    color: var(--knime-masala);

    & .loading-icon {
      @mixin svg-icon-size 24;

      animation: spin 2s linear infinite;
      margin: auto;
      stroke: var(--knime-masala);
      vertical-align: -6px;
      margin-right: 10px;
    }
  }
}

.output-container {
  height: 100%;
  padding: 10px 10px 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  contain: strict;

  & :deep(.tab-bar) {
    padding-top: 0;
    padding-bottom: 0;

    & span {
      font-size: 13px;
      line-height: 61px;
    }
  }

  /* TODO NXT-1569 Find a real solution */
  & :deep(.table-view-wrapper) {
    & .table-header th:first-child {
      margin-left: 0;
      padding-left: 10px;
      font-style: italic;
    }

    & tr.row.no-sub-menu.compact-mode td:first-child {
      background-color: var(--knime-porcelain);
      font-style: italic;
      padding-left: 10px;
      margin-left: 0;
    }
  }
}

.action-button {
  margin-top: 20px;
}

.action-execute {
  margin-right: 5px;
}

.dim-border {
  --theme-button-small-border-color: var(--knime-silver-sand);
}
</style>
