<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";

import { useHint } from "@knime/components";
import type { Alert } from "@knime/ui-extension-service";

import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import { HINTS } from "@/hints/hints.config";
import type { ApplicationState } from "@/store/application";
import type { NodeOutputTabIdentifier } from "@/store/selection";
import type { WorkflowState } from "@/store/workflow";

import LoadingIndicator from "./LoadingIndicator.vue";
import PortTabs from "./PortTabs.vue";
import UIExtensionAlertsWrapper from "./UIExtensionAlertsWrapper.vue";
import ValidationInfo from "./ValidationInfo.vue";
import { buildMiddleware, validateSelection } from "./common/output-validator";
import type { UIExtensionLoadingState, ValidationError } from "./common/types";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "./common/utils";
import NodeViewTabOutput from "./nodeViews/NodeViewTabOutput.vue";
import PortViewTabOutput from "./portViews/PortViewTabOutput.vue";

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
  loadingState: UIExtensionLoadingState | null;
  currentValidationError: ValidationError | null;
  currentNodeViewAlert: { alert: Alert; nodeName?: string } | null;
  EMBEDDED_CONTENT_PANEL_ID__BOTTOM: typeof EMBEDDED_CONTENT_PANEL_ID__BOTTOM;
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
    UIExtensionAlertsWrapper,
  },
  setup() {
    const { createHint } = useHint();
    return { createHint };
  },
  data(): ComponentData {
    return {
      currentValidationError: null,
      loadingState: null,
      currentNodeViewAlert: null,
      EMBEDDED_CONTENT_PANEL_ID__BOTTOM,
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

    selectedTab: {
      get() {
        return this.$store.state.selection.activePortTab;
      },
      set(val: NodeOutputTabIdentifier) {
        this.$store.commit("selection/setActivePortTab", val);
      },
    },
    canSelectTabs() {
      // allow selecting tabs when:
      return (
        // doesn't have errors in the output state
        !this.currentValidationError ||
        // or when it doesn't have these specific error types
        this.currentValidationError.code !== "ALL_PORTS_UNSUPPORTED"
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
        this.loadingState?.value === "loading" && !this.currentValidationError
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
      handler(next, prev) {
        const isDifferentNode = next?.id !== prev?.id;
        if (!this.selectionValidationError && isDifferentNode) {
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
    currentValidationError() {
      // Validation takes precedence over any existing alert. So if a new
      // validation error is added we must reset the alert
      this.currentNodeViewAlert = null;
    },
  },
  methods: {
    async onPortViewLoadingState(state) {
      this.loadingState = state;
      if (state) {
        // wait some time as otherwise the click on the node closes the hint via on click outside
        await new Promise((r) => setTimeout(r, 100));
        this.createHint({
          hintId: HINTS.NODE_MONITOR,
          referenceSelector: `#${EMBEDDED_CONTENT_PANEL_ID__BOTTOM}`,
        });
      }
    },
    // select the first tab
    selectPort() {
      let { outPorts, kind: nodeKind } = this.singleSelectedNode;

      // if a node has a view it's the first tab
      if (this.singleSelectedNode.hasView) {
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
  <div class="output-container">
    <PortTabs
      v-if="singleSelectedNode && singleSelectedNode.outPorts.length"
      v-model="selectedTab"
      class="tabs"
      :has-view-tab="singleSelectedNode.hasView"
      :node="singleSelectedNode"
      :disabled="!canSelectTabs"
    />

    <div :id="EMBEDDED_CONTENT_PANEL_ID__BOTTOM" class="node-output-content">
      <LoadingIndicator v-if="showLoadingIndicator" :message="loadingMessage" />

      <UIExtensionAlertsWrapper
        v-if="currentNodeViewAlert"
        :alert="currentNodeViewAlert.alert"
        :node-id="singleSelectedNode.id"
        :node-name="currentNodeViewAlert.nodeName"
      />

      <ValidationInfo
        v-if="!currentNodeViewAlert"
        :validation-error="currentValidationError"
        :selected-node="singleSelectedNode"
        :selected-port-index="selectedPortIndex"
      />

      <template v-if="!selectionValidationError">
        <NodeViewTabOutput
          v-if="isViewTabSelected"
          :project-id="projectId!"
          :workflow-id="workflowId"
          :selected-node="singleSelectedNode"
          :available-port-types="availablePortTypes"
          @alert="currentNodeViewAlert = $event"
          @loading-state-change="loadingState = $event"
          @validation-error="currentValidationError = $event"
        />

        <PortViewTabOutput
          v-if="!isViewTabSelected"
          ref="portViewTabOutput"
          :project-id="projectId!"
          :workflow-id="workflowId"
          :selected-node="singleSelectedNode"
          :selected-port-index="selectedPortIndex!"
          :available-port-types="availablePortTypes"
          @loading-state-change="onPortViewLoadingState($event)"
          @validation-error="currentValidationError = $event"
        />
      </template>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.output-container {
  height: 100%;
  padding: 10px 10px 0;
  position: relative;
  display: flex;
  flex-direction: column;

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

  & .tabs {
    flex: 0 0 auto;
  }

  & .node-output-content {
    position: relative;
    flex: 1;
    overflow: auto;
  }
}
</style>
