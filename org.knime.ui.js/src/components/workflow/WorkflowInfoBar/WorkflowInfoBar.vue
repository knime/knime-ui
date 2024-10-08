<script setup lang="ts">
import { computed } from "vue";

import type { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { isDesktop } from "@/environment";
import * as $colors from "@/style/colors";

import RemoteWorkflowInfo from "./RemoteWorkflowInfo.vue";
import StreamingInfo from "./StreamingInfo.vue";

const store = useStore();

const width = computed(() => store.state.canvas.containerSize.width);

const isLinked = computed(() => store.getters["workflow/isLinked"]);
const isInsideLinked = computed(() => store.getters["workflow/isInsideLinked"]);
const origin = computed<SpaceItemReference>(
  () => store.getters["application/activeProjectOrigin"],
);
const isStreaming = computed(() => store.getters["workflow/isStreaming"]);
const isRemoteWorkflow = computed(
  () => store.getters["workflow/isRemoteWorkflow"],
);
const insideLinkedType = computed(
  () => store.getters["workflow/insideLinkedType"],
);
const containerType = computed(
  () => store.state.workflow.activeWorkflow!.info.containerType,
);
</script>

<template>
  <div class="stack">
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

      <span v-else-if="isDesktop && origin?.version" class="linked">
        This is an outdated version of this workflow (Currently viewing: "{{
          origin?.version.title
        }}").
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
  z-index: 1;
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
