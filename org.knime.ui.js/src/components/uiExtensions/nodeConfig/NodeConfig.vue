<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useEventListener } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { FunctionButton, ToastStack } from "@knime/components";
import ArrowsCollapseIcon from "@knime/styles/img/icons/arrows-collapse.svg";
import type { UIExtensionPushEvents } from "@knime/ui-extension-renderer/api";

import ManageVersionsWrapper from "@/components/workflowEditor/ManageVersionsWrapper.vue";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";
import { EMBEDDED_CONTENT_PANEL_ID__RIGHT } from "../common/utils";

import IncompatibleNodeConfigPlaceholder from "./IncompatibleNodeConfigPlaceholder.vue";
import NodeConfigWrapper from "./NodeConfigWrapper.vue";

const nodeConfigurationStore = useNodeConfigurationStore();
const { activeNode, activeExtensionConfig } = storeToRefs(
  nodeConfigurationStore,
);
const { getNodeName } = storeToRefs(useNodeInteractionsStore());
const versionsStore = useWorkflowVersionsStore();

const canBeEnlarged = computed(
  () => activeExtensionConfig.value?.canBeEnlarged,
);

const panel = ref<HTMLDialogElement>();
const nodeName = computed(() =>
  activeNode.value ? getNodeName.value(activeNode.value.id) : "",
);

const isLargeMode = computed<boolean>({
  get: () => nodeConfigurationStore.isLargeMode,
  set: (value) => (nodeConfigurationStore.isLargeMode = value),
});

watch(isLargeMode, () => {
  if (isLargeMode.value) {
    panel.value!.showModal();
  } else {
    panel.value!.close();
  }

  nodeConfigurationStore.pushEventDispatcher({
    eventType:
      "DisplayModeEvent" satisfies UIExtensionPushEvents.KnownEventType,
    payload: { mode: isLargeMode.value ? "large" : "small" },
  });
});

const onDialogCancel = () => {
  isLargeMode.value = false;
};

const onExpandConfig = () => {
  isLargeMode.value = true;
};

useEventListener(panel, "click", (event) => {
  if (event.target === panel.value) {
    onDialogCancel();
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
    @cancel="onDialogCancel"
  >
    <ToastStack v-if="isLargeMode" class="large-mode-toasts" />
    <div v-if="isLargeMode" class="title-bar">
      <h2>{{ nodeName }}</h2>
      <FunctionButton
        v-if="activeNode && canBeEnlarged && isLargeMode"
        @click="isLargeMode = false"
      >
        <ArrowsCollapseIcon class="arrows-collapse-icon" />
      </FunctionButton>
    </div>

    <NodeConfigWrapper
      class="content-wrapper"
      :is-large-mode="isLargeMode"
      @expand="onExpandConfig"
    >
      <template #inactive>
        <ManageVersionsWrapper v-if="versionsStore.isSidepanelOpen" />
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

    & .content-wrapper {
      height: 100%;
    }
  }

  &.large {
    height: 95vh;
    width: 95vw;

    --title-bar-height: var(--space-32);

    & .title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--knime-white);
      background-color: var(--knime-masala);
      max-width: 100%;
      padding-left: var(--space-12);
      height: var(--title-bar-height);

      & h2 {
        margin: 0;
        font-size: 19px;
        line-height: var(--title-bar-height);
      }
    }

    & .content-wrapper {
      height: calc(100% - var(--title-bar-height));
    }

    & .arrows-collapse-icon {
      stroke: var(--knime-white);

      &:hover {
        outline: none;
        color: var(--theme-button-function-foreground-color-hover);
        background-color: transparent;
      }
    }
  }
}
</style>
