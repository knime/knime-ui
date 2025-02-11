<script setup lang="ts">
import { computed, ref } from "vue";

import KaiNodeConfiguration from "@/components/kai/quickInteractions/KaiNodeConfiguration.vue";
import { getFloatingMenuComponent } from "@/components/workflowEditor/CanvasAnchoredComponents/getFloatingMenuComponent";
import { useCanvasStore } from "@/store/canvas";

const { FloatingMenu } = getFloatingMenuComponent();

export type QuickInteractionMenuState =
  | "PROCESSING"
  | "RESULT"
  | "INPUT"
  | "NONE";

export type KaiQuickInteractionMenuProps = {
  nodeId: string | null;
};

withDefaults(defineProps<KaiQuickInteractionMenuProps>(), {
  nodeId: null,
});

const SCROLLBAR_OFFSET = 30;

const menuWidth = 360;

defineEmits(["menuClose"]);

const quickBuildState = ref<QuickInteractionMenuState>("INPUT");
const updateQuickBuildState = (newState: QuickInteractionMenuState) =>
  (quickBuildState.value = newState);

const canvasPosition = computed(() => {
  const visibleFrame = useCanvasStore().getVisibleFrame;

  return {
    x: visibleFrame.right - SCROLLBAR_OFFSET,
    y: visibleFrame.bottom - SCROLLBAR_OFFSET,
  };
});
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    aria-label="K-AI Node Configuration Mode"
    anchor="bottom-right"
    focus-trap
    :prevent-overflow="false"
    @menu-close="$emit('menuClose')"
  >
    <!-- this will be portalled to the canvas -->
    <div class="quick-action-content" :style="{ width: `${menuWidth}px` }">
      <KaiNodeConfiguration
        :node-id="nodeId"
        :start-position="canvasPosition"
        @quick-build-state-changed="updateQuickBuildState"
      />
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-action-content {
  box-shadow: var(--shadow-elevation-1);
  background: var(--knime-gray-ultra-light);
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;

  & .footer {
    flex: none;
    height: 46px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px solid var(--knime-silver-sand);

    & button {
      height: 30px;
      padding: 0 15px;
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      line-height: 0.9;

      & svg {
        @mixin svg-icon-size 18;
      }
    }
  }
}
</style>
