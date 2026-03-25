<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { ToastStack } from "@knime/components";

import ManageVersionsWrapper from "@/components/workflowEditor/ManageVersionsWrapper.vue";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSelectionStore } from "@/store/selection";
import { usePanelStore } from "@/store/panel";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { EMBEDDED_CONTENT_PANEL_ID__RIGHT } from "../common/utils";

import IncompatibleNodeConfigPlaceholder from "./IncompatibleNodeConfigPlaceholder.vue";
import NodeConfigWrapper from "./NodeConfigWrapper.vue";

defineEmits<{ close: [] }>();

const nodeConfigurationStore = useNodeConfigurationStore();
const versionsStore = useWorkflowVersionsStore();

const { singleSelectedNode } = storeToRefs(useSelectionStore());

const panel = ref<HTMLDialogElement>();

const isLargeMode = computed<boolean>({
  get: () => nodeConfigurationStore.isLargeMode,
  set: (value) => (nodeConfigurationStore.isLargeMode = value),
});

watch(isLargeMode, () => {
  if (isLargeMode.value) {
    panel.value!.close();
    panel.value!.showModal();
  } else {
    panel.value!.close();
    panel.value!.show();
  }
});

const exitLargeMode = () => {
  if (isLargeMode.value) {
    nodeConfigurationStore.setIsLargeMode(false);
    // In modal mode, fully close the panel so onMounted re-fires on next open
    if (useApplicationSettingsStore().nodeConfigOpenMode === "modal") {
      usePanelStore().isRightPanelExpanded = false;
    }
  }
};

useEventListener(panel, "click", (event) => {
  if (event.target === panel.value) {
    exitLargeMode();
  }
});

// In "modal" mode every dialog opens as a modal (large mode) by default.
onMounted(() => {
  if (useApplicationSettingsStore().nodeConfigOpenMode === "modal") {
    nodeConfigurationStore.setIsLargeMode(true);
    // Always call showModal() explicitly because the watch won't fire if
    // isLargeMode was already true when this component mounted (e.g. set by
    // the double-click handler before the panel is rendered).
    panel.value!.close();
    panel.value!.showModal();
  }
});
</script>

<template>
  <dialog
    :id="EMBEDDED_CONTENT_PANEL_ID__RIGHT"
    ref="panel"
    class="node-config-embedded-content-panel full-height"
    :class="{
      large: isLargeMode,
      small: !isLargeMode,
    }"
    @cancel="exitLargeMode"
  >
    <ToastStack v-if="isLargeMode" class="large-mode-toasts" />

    <ManageVersionsWrapper
      v-if="versionsStore.isSidepanelOpen && !singleSelectedNode"
    />

    <NodeConfigWrapper v-else @escape-pressed="exitLargeMode" @close="$emit('close')">
      <template #inactive>
        <IncompatibleNodeConfigPlaceholder />
      </template>
    </NodeConfigWrapper>
  </dialog>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

/* style reset */
dialog {
  padding: 0;
  color: var(--knime-masala);
  border: none;

  &:focus-visible {
    outline: none;
  }
}

.large-mode-toasts {
  z-index: calc(v-bind("$zIndices.layerToasts"));
}

::backdrop {
  background-color: var(--knime-black-semi, hsl(0deg 3% 12% / 80%));
}

.full-height {
  height: 100%;
}

.node-config-embedded-content-panel {
  width: 100%;
  background-color: var(--kds-color-surface-default);

  &.small {
    position: relative;
    display: block;
  }

  &.large {
    width: 95vw;
    height: 95vh;
  }
}
</style>
