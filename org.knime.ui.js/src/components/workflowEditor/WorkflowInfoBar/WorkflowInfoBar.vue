<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { isDesktop } from "@/environment";
import { useApplicationStore } from "@/store/application/application";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useWorkflowStore } from "@/store/workflow/workflow";

import RemoteWorkflowInfo from "./RemoteWorkflowInfo.vue";
import StreamingInfo from "./StreamingInfo.vue";

const {
  isLinked,
  isInsideLinked,
  insideLinkedType,
  isStreaming,
  isRemoteWorkflow,
  activeWorkflow,
} = storeToRefs(useWorkflowStore());
const { activeProjectOrigin: origin } = storeToRefs(useApplicationStore());
const width = computed(() => useCurrentCanvasStore().value.containerSize.width);

const containerType = computed(() => activeWorkflow.value!.info.containerType);
</script>

<template>
  <div v-if="width > 0" class="stack">
    <div
      v-if="isLinked || isInsideLinked || origin?.version"
      class="workflow-info"
    >
      <span v-if="isInsideLinked" class="linked">
        This is a {{ containerType }} inside a linked {{ insideLinkedType }} and
        cannot be edited.
      </span>

      <span v-else-if="isLinked" class="linked">
        This is a linked {{ containerType }} and therefore cannot be edited.
      </span>

      <span v-else-if="isDesktop() && origin?.version" class="linked">
        You are currently viewing version "{{ origin?.version.title }}" of this
        workflow.
      </span>
    </div>

    <div v-if="isRemoteWorkflow" class="workflow-info">
      <RemoteWorkflowInfo />
    </div>

    <div
      v-if="isStreaming"
      :class="['workflow-info', { 'only-streaming': isStreaming }]"
    >
      <StreamingInfo />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.stack {
  display: flex;
  flex-direction: column;
  position: absolute;
  z-index: v-bind("$zIndices.layerCanvasInfo");
  pointer-events: none;
  user-select: none;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  margin-left: 10px;

  /* we can't rely on top/left/bottom as we cannot set the parent to relative due to floating menu size calc */
  width: calc(v-bind(width) * 1px - 24px);
}

.workflow-info {
  min-height: 40px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  &:has(.linked) {
    background: v-bind("$colors.notifications.info");
  }

  &.only-streaming {
    justify-content: flex-end;
  }
}
</style>
