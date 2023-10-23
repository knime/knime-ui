<script setup lang="ts">
import { computed } from "vue";

import * as $colors from "@/style/colors.mjs";
import { useStore } from "@/composables/useStore";
import RemoteWorkflowInfo from "./RemoteWorkflowInfo.vue";
import StreamingInfo from "./StreamingInfo.vue";

const store = useStore();

const isLinked = computed(() => store.getters["workflow/isLinked"]);
const isInsideLinked = computed(() => store.getters["workflow/isInsideLinked"]);
const isStreaming = computed(() => store.getters["workflow/isStreaming"]);
const isRemoteWorkflow = computed(
  () => store.getters["workflow/isRemoteWorkflow"],
);
const insideLinkedType = computed(
  () => store.getters["workflow/insideLinkedType"],
);
const containerType = computed(
  () => store.state.workflow.activeWorkflow.info.containerType,
);
</script>

<template>
  <div
    v-if="isLinked || isStreaming || isInsideLinked || isRemoteWorkflow"
    :class="['workflow-info', { 'only-streaming': isStreaming && !isLinked }]"
  >
    <span v-if="isInsideLinked" class="linked">
      This is a {{ containerType }} inside a linked {{ insideLinkedType }} and
      cannot be edited.
    </span>

    <span v-else-if="isLinked" class="linked">
      This is a linked {{ containerType }} and therefore cannot be edited.
    </span>

    <RemoteWorkflowInfo v-if="isRemoteWorkflow" />

    <StreamingInfo v-if="isStreaming" />
  </div>
</template>

<style lang="postcss" scoped>
.workflow-info {
  display: flex;
  margin: 0 24px 0 10px;
  min-height: 40px;
  margin-bottom: -40px;
  left: 10px;
  top: 10px;
  position: sticky;
  z-index: 1;
  pointer-events: none;
  user-select: none;
  justify-content: center;
  align-items: center;

  &:has(.linked) {
    background: v-bind("$colors.notificationBackground");
  }

  &.only-streaming {
    justify-content: flex-end;
  }
}
</style>
