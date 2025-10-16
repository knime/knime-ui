<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import ArrowPrevIcon from "@knime/styles/img/icons/arrow-prev.svg";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import WorkflowPortalLayers from "../../common/WorkflowPortalLayers.vue";

import DashedBorder from "./DashedBorder.vue";
import KaiInputQuickAction from "./KaiInputQuickAction.vue";
import QuickActions from "./QuickActions.vue";
import TemplatesQuickAction from "./TemplatesQuickAction.vue";

const props = defineProps<{ isDraggingOver: boolean }>();

const uiControls = useUIControlsStore();

const { containerSize } = storeToRefs(useWebGLCanvasStore());
const action = ref<"kai" | "template" | "upload">();

const subtitle = computed(() => {
  if (props.isDraggingOver) {
    return "Drop a node to add it to the canvas";
  }

  if (action.value === "kai") {
    return "Together with K-AI";
  }

  if (action.value === "template") {
    return "Select one of our pre-crafted examples";
  }

  return "Drag and drop nodes onto the canvas or choose a quick action below to get started";
});
</script>

<template>
  <div
    class="empty-workflow"
    :style="{
      width: containerSize.width + 'px',
      height: containerSize.height + 'px',
    }"
  >
    <DashedBorder class="dashed-border-wrapper" :container-size="containerSize">
      <!-- Define all Portals also for the empty workflow because some features rely on them -->
      <WorkflowPortalLayers v-if="uiControls.canEditWorkflow" />
    </DashedBorder>

    <div class="content">
      <div class="placeholder-text">
        <h1>Start building your workflow</h1>
        <p>
          {{ subtitle }}
        </p>
      </div>

      <template v-if="!isDraggingOver">
        <QuickActions v-if="!action" @action="action = $event" />

        <div v-else class="current-action">
          <div class="close">
            <Button compact with-border @click="action = undefined">
              <ArrowPrevIcon /> Go back
            </Button>
          </div>
          <KaiInputQuickAction v-if="action === 'kai'" />
          <TemplatesQuickAction v-if="action === 'template'" />
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.empty-workflow {
  position: relative;

  & .dashed-border-wrapper {
    position: absolute;
    top: 0;
    left: 0;
  }

  & .content {
    position: absolute;
    z-index: 1;
    inset: 0;
    margin: 30px;
    display: flex;
    justify-content: center;
    flex-direction: column;
    gap: 48px;

    & .placeholder-text {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;

      & h1 {
        margin-bottom: 0;
      }
    }
  }

  & .current-action {
    align-self: center;
    width: 1000px;

    & .close {
      margin-bottom: var(--space-8);
    }

    & svg {
      @mixin svg-icon-size 16;
    }
  }
}
</style>
