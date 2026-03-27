<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { useHint } from "@knime/components";
import type { Alert } from "@knime/ui-extension-renderer/api";

import type { AvailablePortTypes, KnimeNode } from "@/api/custom-types";
import type {
  ComponentNode,
  NativeNode,
} from "@/api/gateway-api/generated-api";
import CompositeViewTabOutput from "@/components/uiExtensions/compositeView/CompositeViewTabOutput.vue";
import NodeViewTabOutput from "@/components/uiExtensions/nodeViews/NodeViewTabOutput.vue";
import { HINTS } from "@/hints/hints.config";
import { workflowDomain } from "@/lib/workflow-domain";
import { type NodeOutputTabIdentifier } from "@/store/nodeOutput";
import { useExecutionStore } from "@/store/workflow/execution";
import { useMovingStore } from "@/store/workflow/moving";

import LoadingIndicator from "./LoadingIndicator.vue";
import PortTabs from "./PortTabs.vue";
import UIExtensionAlertsWrapper from "./UIExtensionAlertsWrapper.vue";
import ValidationInfo from "./ValidationInfo.vue";
import type { UIExtensionLoadingState, ValidationError } from "./common/types";
import { EMBEDDED_CONTENT_PANEL_ID__BOTTOM } from "./common/utils";
import PortViewTabOutput from "./portViews/PortViewTabOutput.vue";

/**
 * Per-node output pane: port tab bar + port/view output content.
 * Manages its own tab selection state; can be controlled via v-model.
 */

type Props = {
  node: KnimeNode;
  projectId: string;
  workflowId: string;
  versionId?: string;
  availablePortTypes: AvailablePortTypes;
  /**
   * Controlled tab value (v-model). When provided, the pane's tab selection
   * is driven by this value and changes are emitted via update:modelValue.
   * When omitted, the pane manages its own local tab state.
   */
  modelValue?: NodeOutputTabIdentifier;
  /** Applied as id on the content div — used as hint anchor. Pass only for pane 0. */
  panelId?: string;
  /** When true, shows the node name above the port tabs (used in split view). */
  isInSplitView?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  isInSplitView: false,
});

const emit = defineEmits<{
  "update:modelValue": [tab: NodeOutputTabIdentifier];
}>();

const { createHint } = useHint();
const { hasExecutedNativeNode } = storeToRefs(useExecutionStore());
const { isSelectionDelayedUntilDragCompletes } = storeToRefs(useMovingStore());

const currentValidationError = ref<ValidationError | null>(null);
const loadingState = ref<UIExtensionLoadingState | null>(null);
const currentNodeViewAlert = ref<{ alert: Alert; nodeName?: string } | null>(
  null,
);

// Local tab state used when modelValue prop is not provided (uncontrolled mode)
const localSelectedTab = ref<NodeOutputTabIdentifier | null>(null);

const selectedTab = computed({
  get(): NodeOutputTabIdentifier | undefined {
    // eslint-disable-next-line no-undefined
    if (props.modelValue !== undefined) {
      // eslint-disable-next-line no-undefined
      return props.modelValue ?? undefined;
    }
    // eslint-disable-next-line no-undefined
    return localSelectedTab.value ?? undefined;
  },
  set(val: NodeOutputTabIdentifier) {
    localSelectedTab.value = val;
    emit("update:modelValue", val);
  },
});

const canSelectTabs = computed(
  () =>
    !currentValidationError.value ||
    currentValidationError.value.code !== "ALL_PORTS_UNSUPPORTED",
);

const isViewTabSelected = computed(() => selectedTab.value === "view");

const selectedPortIndex = computed(() =>
  isViewTabSelected.value ? null : Number(selectedTab.value),
);

const hasViewTab = computed(() => props.node?.hasView ?? false);

const showLoadingIndicator = computed(
  () => loadingState.value?.value === "loading" && !currentValidationError.value,
);

const loadingMessage = computed(() => {
  if (loadingState.value?.value === "loading") return loadingState.value.message;
  if (currentValidationError.value?.code === "NODE_BUSY")
    return currentValidationError.value.message;
  return "";
});

const selectPort = () => {
  const { outPorts } = props.node;

  // if a node/component has a view it's the first tab
  if (hasViewTab.value) {
    selectedTab.value = "view";
    return;
  }

  // choose the first port of a metanode
  if (workflowDomain.node.isMetaNode(props.node)) {
    selectedTab.value = "0";
    return;
  }

  // node is component or native node
  // select mickey-mouse port, if it is the only one, otherwise the first regular port
  selectedTab.value = outPorts.length > 1 ? "1" : "0";
};

watch(
  () => props.node,
  (next, prev) => {
    if (next?.id !== prev?.id) {
      // Clear stale port-level errors from previous node
      currentValidationError.value = null;
      currentNodeViewAlert.value = null;
      selectPort();
    }
  },
  { deep: true, immediate: true },
);

watch(currentValidationError, () => {
  // Validation takes precedence over any existing alert
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
  <div class="pane-container">
    <div v-if="isInSplitView" class="pane-node-name" :title="node.name">
      {{ node.name }}
    </div>

    <PortTabs
      v-if="!isSelectionDelayedUntilDragCompletes && node.outPorts.length"
      v-model="selectedTab"
      class="tabs"
      :has-view-tab="hasViewTab"
      :node="node"
      :disabled="!canSelectTabs"
    />

    <div :id="panelId" class="node-output-content">
      <LoadingIndicator v-if="showLoadingIndicator" :message="loadingMessage" />

      <UIExtensionAlertsWrapper
        v-if="currentNodeViewAlert"
        :alert="currentNodeViewAlert.alert"
        :node-id="node.id"
        :node-name="currentNodeViewAlert.nodeName"
      />

      <ValidationInfo
        v-if="!currentNodeViewAlert"
        :validation-error="currentValidationError"
        :selected-node="node"
        :selected-port-index="selectedPortIndex"
      />

      <template v-if="!isSelectionDelayedUntilDragCompletes">
        <NodeViewTabOutput
          v-if="isViewTabSelected && node.kind === 'node'"
          :project-id="projectId"
          :workflow-id="workflowId"
          :version-id="versionId"
          :selected-node="node as NativeNode"
          :available-port-types="availablePortTypes"
          @alert="currentNodeViewAlert = $event"
          @loading-state-change="loadingState = $event"
          @validation-error="currentValidationError = $event"
        />

        <CompositeViewTabOutput
          v-if="isViewTabSelected && node.kind === 'component'"
          :project-id="projectId"
          :workflow-id="workflowId"
          :selected-node="node as ComponentNode"
          :available-port-types="availablePortTypes"
          @loading-state-change="loadingState = $event"
          @validation-error="currentValidationError = $event"
        />

        <PortViewTabOutput
          v-if="!isViewTabSelected && selectedTab !== undefined"
          :project-id="projectId"
          :workflow-id="workflowId"
          :version-id="versionId"
          :selected-node="node"
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
.pane-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  & .pane-node-name {
    flex: 0 0 auto;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--knime-stone-gray);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-bottom: 1px solid var(--knime-silver-sand);
  }

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
