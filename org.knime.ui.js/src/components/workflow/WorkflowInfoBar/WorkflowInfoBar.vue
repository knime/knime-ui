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
  <div class="stack">
    <div v-if="isLinked || isInsideLinked" class="workflow-info">
      <span v-if="isInsideLinked" class="linked">
        This is a {{ containerType }} inside a linked {{ insideLinkedType }} and
        cannot be edited.
      </span>

      <span v-else-if="isLinked" class="linked">
        This is a linked {{ containerType }} and therefore cannot be edited.
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
  top: 10px;
  position: sticky;
  z-index: 1;
  pointer-events: none;
  user-select: none;
  justify-content: center;
  align-items: center;
  margin: 0 24px 0 10px;
  left: 10px;
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
