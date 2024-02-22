<script lang="ts">
import { defineComponent } from "vue";
import { mapState, mapGetters } from "vuex";

import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";

import type { ApplicationState } from "@/store/application";
import type { WorkflowState } from "@/store/workflow";
import { compatibility } from "@/environment";

import PortTabs from "./PortTabs.vue";
import PortViewTabOutput from "./portViews/PortViewTabOutput.vue";
import NodeViewTabOutput from "./nodeViews/NodeViewTabOutput.vue";

import { buildMiddleware, validateSelection } from "./common/output-validator";
import type { UIExtensionLoadingState, ValidationError } from "./common/types";
import LoadingIndicator from "./LoadingIndicator.vue";
import ValidationInfo from "./ValidationInfo.vue";

export const runValidationChecks = ({
  selectedNodes,
}: {
  selectedNodes: KnimeNode[];
}) => {
  const validationMiddleware = buildMiddleware(validateSelection);

  const result = validationMiddleware({ selectedNodes })();

  return Object.freeze(result);
};

interface ComponentData {
  // either 'view' or the number of the port as string
  selectedTab: "view" | Omit<string, "view"> | null;

  loadingState: UIExtensionLoadingState | null;
  currentValidationError: ValidationError | null;

  compatibility: typeof compatibility;
}

/**
 * Node output panel, displaying output port selection bar and port view if possible.
 * Port view will be rendered dynamically based on the port type
 */
export default defineComponent({
  components: {
    PortTabs,
    PortViewTabOutput,
    NodeViewTabOutput,
    LoadingIndicator,
    ValidationInfo,
  },
  data(): ComponentData {
    return {
      selectedTab: null,
      currentValidationError: null,
      loadingState: null,
      compatibility,
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
    }),
    ...mapGetters("selection", ["selectedNodes", "singleSelectedNode"]),

    canSelectTabs() {
      // allow selecting tabs when:
      return (
        // doesn't have errors in the output state
        !this.currentValidationError ||
        // or when it doesn't have these specific error types
        this.currentValidationError.code !== "NO_SUPPORTED_PORTS"
      );
    },

    isViewTabSelected() {
      return this.selectedTab === "view";
    },

    selectedPortIndex() {
      // tab values are port indexes if it's not the view tab as string
      return this.isViewTabSelected ? null : Number(this.selectedTab);
    },

    selectionValidationError() {
      const validationResult = runValidationChecks({
        selectedNodes: this.selectedNodes,
      });

      return validationResult?.error ?? null;
    },

    showLoadingIndicator() {
      return (
        this.loadingState?.value === "loading" ||
        this.currentValidationError?.code === "NODE_BUSY"
      );
    },

    loadingMessage() {
      if (this.loadingState?.value === "loading") {
        return this.loadingState.message;
      }

      if (this.currentValidationError?.code === "NODE_BUSY") {
        return this.currentValidationError.message;
      }

      return "";
    },
  },
  watch: {
    singleSelectedNode: {
      handler() {
        if (!this.selectionValidationError) {
          this.selectPort();
        }
      },
      deep: true,
    },
    selectionValidationError: {
      handler(selectionValidationError) {
        if (this.selectionValidationError) {
          this.currentValidationError = selectionValidationError;
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

    <LoadingIndicator v-if="showLoadingIndicator" :message="loadingMessage" />

    <ValidationInfo
      :validation-error="currentValidationError"
      :selected-node="singleSelectedNode"
      :selected-port-index="selectedPortIndex"
    />

    <template v-if="!selectionValidationError">
      <NodeViewTabOutput
        v-if="isViewTabSelected && $features.shouldDisplayEmbeddedViews()"
        :project-id="projectId!"
        :workflow-id="workflowId"
        :selected-node="singleSelectedNode"
        :available-port-types="availablePortTypes"
        @loading-state-change="loadingState = $event"
        @validation-error="currentValidationError = $event"
      />

      <PortViewTabOutput
        v-if="!isViewTabSelected"
        :project-id="projectId!"
        :workflow-id="workflowId"
        :selected-node="singleSelectedNode"
        :selected-port-index="selectedPortIndex!"
        :available-port-types="availablePortTypes"
        @loading-state-change="loadingState = $event"
        @validation-error="currentValidationError = $event"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
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
</style>
