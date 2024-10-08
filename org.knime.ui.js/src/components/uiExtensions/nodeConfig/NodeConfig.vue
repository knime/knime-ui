<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

import { FunctionButton } from "@knime/components";
import ArrowsCollapseIcon from "@knime/styles/img/icons/arrows-collapse.svg";
import ArrowsExpandIcon from "@knime/styles/img/icons/arrows-expand.svg";
import { UIExtensionPushEvents } from "@knime/ui-extension-service";
import { sleep } from "@knime/utils";

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

const isLargeMode = ref(false);

const toggleLarge = async () => {
  if (isLargeMode.value) {
    panel.value!.close();

    // wait for one event loop run, so that the <dialog> element gets layout-ed correctly
    await sleep(0);
    isLargeMode.value = false;
  } else {
    isLargeMode.value = true;

    await nextTick();
    panel.value!.showModal();
  }

  const mode = isLargeMode.value ? "large" : "small";

  store.state.nodeConfiguration.pushEventDispatcher({
    eventType: UIExtensionPushEvents.EventTypes.DisplayModeEvent,
    payload: { mode },
  });
};

const onDialogCancel = () => {
  if (isLargeMode.value) {
    toggleLarge();
  }
};
</script>

<template>
  <dialog
    :id="EMBEDDED_CONTENT_PANEL_ID__RIGHT"
    ref="panel"
    class="node-config-embedded-content-panel full-height"
    :class="{ large: isLargeMode, small: !isLargeMode }"
    @cancel="onDialogCancel"
  >
    <div v-if="isLargeMode" class="title-bar">
      <h2>{{ nodeName }}</h2>
    </div>

    <FunctionButton
      v-if="activeNode && canBeEnlarged"
      compact
      class="toggle-display-mode-btn"
      @click="toggleLarge"
    >
      <Component :is="isLargeMode ? ArrowsCollapseIcon : ArrowsExpandIcon" />
    </FunctionButton>

    <NodeConfigWrapper class="content-wrapper">
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

  & .toggle-display-mode-btn {
    position: absolute;
    z-index: 9;
    top: var(--space-4);
  }

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
      color: var(--knime-white);
      background-color: var(--knime-masala);
      max-width: 100%;
      padding: 0 var(--space-12);
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
