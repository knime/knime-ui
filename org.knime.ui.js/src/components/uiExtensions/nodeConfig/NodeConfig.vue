<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { ToastStack } from "@knime/components";

import ManageVersionsWrapper from "@/components/workflowEditor/ManageVersionsWrapper.vue";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { EMBEDDED_CONTENT_PANEL_ID__RIGHT } from "../common/utils";

import IncompatibleNodeConfigPlaceholder from "./IncompatibleNodeConfigPlaceholder.vue";
import NodeConfigWrapper from "./NodeConfigWrapper.vue";

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
  // TODO: Should be removed once NXT-3761 is done.
  // The dialog element shouldn't be focused, according to the specs.
  panel.value!.focus();
});

const exitLargeMode = () => {
  isLargeMode.value = false;
};

useEventListener(panel, "click", (event) => {
  if (event.target === panel.value) {
    exitLargeMode();
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

    <NodeConfigWrapper>
      <template #inactive>
        <ManageVersionsWrapper
          v-if="versionsStore.isSidepanelOpen && !singleSelectedNode"
        />
        <IncompatibleNodeConfigPlaceholder v-else />
      </template>
    </NodeConfigWrapper>
  </dialog>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

/* style reset */
dialog {
  border: none;
  padding: 0;

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
  background-color: var(--knime-gray-ultra-light);

  &.small {
    display: block;
    position: relative;
  }

  &.large {
    height: 95vh;
    width: 95vw;
  }
}
</style>
