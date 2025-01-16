<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { FunctionButton } from "@knime/components";
import ArrowsCollapseIcon from "@knime/styles/img/icons/arrows-collapse.svg";
import { UIExtensionPushEvents } from "@knime/ui-extension-service";

import type { NativeNode } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { EMBEDDED_CONTENT_PANEL_ID__RIGHT } from "../common/utils";

import IncompatibleNodeConfigPlaceholder from "./IncompatibleNodeConfigPlaceholder.vue";
import NodeConfigWrapper from "./NodeConfigWrapper.vue";

const store = useStore();

const activeNode = computed<NativeNode | null>(
  () => store.getters["nodeConfiguration/activeNode"],
);

const canBeEnlarged = computed(
  () => store.state.nodeConfiguration.activeExtensionConfig?.canBeEnlarged,
);

const panel = ref<HTMLDialogElement>();
const nodeName = computed(() =>
  activeNode.value
    ? store.getters["workflow/getNodeName"](activeNode.value.id)
    : "",
);

const isLargeMode = computed<boolean>({
  get: () => store.state.nodeConfiguration.isLargeMode,
  set: (value) => (store.state.nodeConfiguration.isLargeMode = value),
});

watch(isLargeMode, () => {
  if (isLargeMode.value) {
    panel.value!.showModal();
  } else {
    panel.value!.close();
  }
  store.state.nodeConfiguration.pushEventDispatcher({
    eventType: UIExtensionPushEvents.EventTypes.DisplayModeEvent,
    payload: { mode: isLargeMode.value ? "large" : "small" },
  });
});

const onDialogCancel = () => {
  isLargeMode.value = false;
};

const onExpandConfig = () => {
  isLargeMode.value = true;
};
</script>

<template>
  <!--  below the deprecated @cancel event is used. Trying to use @keydown.esc instead resulted in the NodeConfig for the "Expression" node to disappear after using ESC to exit large mode -->
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
    <div v-if="isLargeMode" class="title-bar">
      <h2>{{ nodeName }}</h2>
      <FunctionButton
        v-if="activeNode && canBeEnlarged && isLargeMode"
        @click="isLargeMode = false"
      >
        <ArrowsCollapseIcon />
      </FunctionButton>
    </div>

    <NodeConfigWrapper
      class="content-wrapper"
      :is-large-mode="isLargeMode"
      @expand="onExpandConfig"
    >
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
  border: none;
  padding: 0;
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

    & .toggle-display-mode-btn {
      right: var(--space-16);
    }

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

    & .toggle-display-mode-btn {
      top: 2px;
      right: var(--space-8);

      & :deep(svg) {
        stroke: var(--knime-white);
      }
    }

    & .content-wrapper {
      height: calc(100% - var(--title-bar-height));
    }
  }
}
</style>
