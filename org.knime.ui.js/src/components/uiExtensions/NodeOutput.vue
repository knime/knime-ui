<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { useHint } from "@knime/components";
import type { Alert } from "@knime/ui-extension-renderer/api";

import type { KnimeNode } from "@/api/custom-types";
import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";
import CompositeViewTabOutput from "@/components/uiExtensions/compositeView/CompositeViewTabOutput.vue";
import NodeViewTabOutput from "@/components/uiExtensions/nodeViews/NodeViewTabOutput.vue";
import { HINTS } from "@/hints/hints.config";
import { useApplicationStore } from "@/store/application/application";
import {
  type NodeOutputTabIdentifier,
  useNodeOutputStore,
} from "@/store/nodeOutput";
import { useSelectionStore } from "@/store/selection";
import { useExecutionStore } from "@/store/workflow/execution";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { workflowDomain } from "@/util/workflow-domain";

import LoadingIndicator from "./LoadingIndicator.vue";
import PortTabs from "./PortTabs.vue";
import UIExtensionAlertsWrapper from "./UIExtensionAlertsWrapper.vue";
import ValidationInfo from "./ValidationInfo.vue";
import { buildMiddleware, validateSelection } from "./common/output-validator";
import type { UIExtensionLoadingState, ValidationError } from "./common/types";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "./common/utils";
import PortViewTabOutput from "./portViews/PortViewTabOutput.vue";

const runValidationChecks = ({
  selectedNodes,
}: {
  selectedNodes: KnimeNode[];
}) => {
  const validationMiddleware = buildMiddleware(validateSelection);

  const result = validationMiddleware({ selectedNodes })();

  return Object.freeze(result);
};

/**
 * Node output panel, displaying output port selection bar and port view if possible.
 * Port view will be rendered dynamically based on the port type
 */

const { createHint } = useHint();

const executionStore = useExecutionStore();
const { hasExecutedNativeNode } = storeToRefs(executionStore);

const currentValidationError = ref<ValidationError | null>(null);
const loadingState = ref<UIExtensionLoadingState | null>(null);
const currentNodeViewAlert = ref<{ alert: Alert; nodeName?: string } | null>(
  null,
);

const { activeProjectId: projectId, availablePortTypes } = storeToRefs(
  useApplicationStore(),
);
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const workflowId = computed(() => activeWorkflow.value!.info.containerId);
const versionId = computed(() => activeWorkflow.value!.info.version);
const { querySelection } = useSelectionStore();
const { singleSelectedNode, getSelectedNodes: selectedNodes } =
  querySelection("committed");

const { isSelectionDelayedUntilDragCompletes } = storeToRefs(useMovingStore());

const { activePortTab } = storeToRefs(useNodeOutputStore());

const selectedTab = computed({
  get() {
    // eslint-disable-next-line no-undefined
    return activePortTab.value ?? undefined;
  },
  set(val: NodeOutputTabIdentifier) {
    activePortTab.value = val;
  },
});

const canSelectTabs = computed(() => {
  // allow selecting tabs when:
  return (
    // doesn't have errors in the output state
    !currentValidationError.value ||
    // or when it doesn't have these specific error types
    currentValidationError.value.code !== "ALL_PORTS_UNSUPPORTED"
  );
});

const isViewTabSelected = computed(() => {
  return selectedTab.value === "view";
});

const selectedPortIndex = computed(() => {
  // tab values are port indexes if it's not the view tab as string
  return isViewTabSelected.value ? null : Number(selectedTab.value);
});

const selectionValidationError = computed(() => {
  const validationResult = runValidationChecks({
    selectedNodes: selectedNodes.value,
  });

  return validationResult?.error ?? null;
});

const showLoadingIndicator = computed(() => {
  return (
    loadingState.value?.value === "loading" && !currentValidationError.value
  );
});

const loadingMessage = computed(() => {
  if (loadingState.value?.value === "loading") {
    return loadingState.value.message;
  }

  if (currentValidationError.value?.code === "NODE_BUSY") {
    return currentValidationError.value.message;
  }

  return "";
});

const hasViewTab = computed(() => {
  return singleSelectedNode.value ? singleSelectedNode.value.hasView : false;
});

// select the first tab
const selectPort = () => {
  if (!singleSelectedNode.value) {
    return;
  }

  let { outPorts } = singleSelectedNode.value;

  // if a node/component has a view it's the first tab
  if (hasViewTab.value) {
    selectedTab.value = "view";
    return;
  }

  // choose the first node of a metanode
  if (workflowDomain.node.isMetaNode(singleSelectedNode.value)) {
    selectedTab.value = "0";
    return;
  }

  // node is component or native node
  // select mickey-mouse port, if it is the only one, otherwise the first regular port
  selectedTab.value = outPorts.length > 1 ? "1" : "0";
};

watch(
  singleSelectedNode,
  (next, prev) => {
    const isDifferentNode = next?.id !== prev?.id;
    if (!selectionValidationError.value && isDifferentNode) {
      selectPort();
    }
  },
  { deep: true },
);

watch(
  selectionValidationError,
  () => {
    if (selectionValidationError.value) {
      currentValidationError.value = selectionValidationError.value;
    } else {
      selectPort();
    }
  },
  {
    // trigger the port selection as soon as the component mounts, based on the validation results
    immediate: true,
    // watcher won't trigger when the value hasn't been assigned a new value (e.g it stays the same),
    // and that is the case because the computed property has cached it. But we deep watch to select the port
    // and update the output state every time the validations retrigger
    deep: true,
  },
);

watch(currentValidationError, () => {
  // Validation takes precedence over any existing alert. So if a new
  // validation error is added we must reset the alert
  currentNodeViewAlert.value = null;
});

const onPortViewLoadingState = async (
  state: UIExtensionLoadingState | null,
) => {
  loadingState.value = state;
  if (state) {
    // wait some time as otherwise the click on the node closes the hint via on click outside
    await new Promise((r) => setTimeout(r, 100));
    createHint({
      hintId: HINTS.NODE_MONITOR,
      referenceSelector: `#${EMBEDDED_CONTENT_PANEL_ID__BOTTOM}`,
      isVisibleCondition: hasExecutedNativeNode,
    });
  }
};
</script>

<template>
  <div class="output-container">
    <PortTabs
      v-if="
        !isSelectionDelayedUntilDragCompletes &&
        singleSelectedNode &&
        singleSelectedNode.outPorts.length
      "
      v-model="selectedTab"
      class="tabs"
      :has-view-tab="hasViewTab"
      :node="singleSelectedNode"
      :disabled="!canSelectTabs"
    />

    <div :id="EMBEDDED_CONTENT_PANEL_ID__BOTTOM" class="node-output-content">
      <LoadingIndicator v-if="showLoadingIndicator" :message="loadingMessage" />

      <UIExtensionAlertsWrapper
        v-if="currentNodeViewAlert"
        :alert="currentNodeViewAlert.alert"
        :node-id="singleSelectedNode!.id"
        :node-name="currentNodeViewAlert.nodeName"
      />

      <ValidationInfo
        v-if="!currentNodeViewAlert"
        :validation-error="currentValidationError"
        :selected-node="singleSelectedNode"
        :selected-port-index="selectedPortIndex"
      />

      <template
        v-if="
          !selectionValidationError &&
          singleSelectedNode &&
          !isSelectionDelayedUntilDragCompletes
        "
      >
        <NodeViewTabOutput
          v-if="isViewTabSelected && singleSelectedNode.kind === 'node'"
          :project-id="projectId!"
          :workflow-id="workflowId"
          :version-id="versionId"
          :selected-node="singleSelectedNode as NativeNode"
          :available-port-types="availablePortTypes"
          @alert="currentNodeViewAlert = $event"
          @loading-state-change="loadingState = $event"
          @validation-error="currentValidationError = $event"
        />

        <CompositeViewTabOutput
          v-if="isViewTabSelected && singleSelectedNode.kind === 'component'"
          :project-id="projectId!"
          :workflow-id="workflowId"
          :selected-node="singleSelectedNode as ComponentNode"
          :available-port-types="availablePortTypes"
          @loading-state-change="loadingState = $event"
          @validation-error="currentValidationError = $event"
        />

        <PortViewTabOutput
          v-if="!isViewTabSelected"
          ref="portViewTabOutput"
          :project-id="projectId!"
          :workflow-id="workflowId"
          :version-id="versionId"
          :selected-node="singleSelectedNode!"
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
