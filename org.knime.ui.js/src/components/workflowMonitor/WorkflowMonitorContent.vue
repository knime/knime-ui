<script setup lang="ts">
import { computed } from "vue";

import Pill from "webapps-common/ui/components/Pill.vue";
import WarningIcon from "webapps-common/ui/assets/img/icons/sign-warning.svg";
import CloseIcon from "webapps-common/ui/assets/img/icons/circle-close.svg";
import JoyIcon from "webapps-common/ui/assets/img/icons/joy.svg";

import type { WorkflowMonitorMessage as WorkflowMonitorMessageType } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import type { Filter } from "@/store/workflowMonitor";
import * as $colors from "@/style/colors.mjs";

import WorkflowMonitorMessage from "./WorkflowMonitorMessage.vue";

const store = useStore();

const workflowMonitorState = computed(
  () => store.state.workflowMonitor.currentState,
);

const hasLoaded = computed(() => store.state.workflowMonitor.hasLoaded);
const activeFilter = computed(() => store.state.workflowMonitor.activeFilter);

const errors = computed(() => workflowMonitorState.value.errors);
const warnings = computed(() => workflowMonitorState.value.warnings);

const shouldShowErrors = computed(() => errors.value.length > 0);
const shouldShowWarnings = computed(
  () => activeFilter.value === "SHOW_ALL" && warnings.value.length > 0,
);

type Messages = typeof errors;

const shouldDisplayEmptyMessage = computed(() => {
  const mapper: Record<Filter, Messages[]> = {
    SHOW_ERRORS: [errors],
    SHOW_ALL: [errors, warnings],
  };

  return (
    hasLoaded.value &&
    mapper[activeFilter.value].every((messages) => messages.value.length === 0)
  );
});

const getTemplate = (templateId: string) => {
  return store.state.nodeTemplates.cache[templateId];
};

const navigateToIssue = async (message: WorkflowMonitorMessageType) => {
  await store.dispatch("workflowMonitor/navigateToIssue", { message });
};

const emptyMessage = computed(() => {
  const isShowingAll = activeFilter.value === "SHOW_ALL";
  return `There are no errors ${
    isShowingAll ? "or warnings" : ""
  } in your workflow.`;
});

const isFromNestedNode = (message: WorkflowMonitorMessageType) => {
  return message.workflowId !== "root";
};
</script>

<template>
  <div v-show="shouldShowErrors" data-test-id="errors" class="messages">
    <div class="category">
      <Pill color="white"><CloseIcon class="error-icon" />Node errors</Pill>
    </div>

    <TransitionGroup name="slide" tag="div">
      <WorkflowMonitorMessage
        v-for="error in errors"
        :key="error.nodeId"
        :message="error"
        :node-template="getTemplate(error.templateId!)"
        :nested="isFromNestedNode(error)"
        @show-issue="navigateToIssue(error)"
      />
    </TransitionGroup>
  </div>

  <div v-show="shouldShowWarnings" data-test-id="warnings" class="messages">
    <div class="category">
      <Pill color="white">
        <WarningIcon class="warning-icon" />Node warnings
      </Pill>
    </div>

    <TransitionGroup name="slide" tag="div">
      <WorkflowMonitorMessage
        v-for="warning in warnings"
        :key="warning.nodeId"
        :message="warning"
        :node-template="getTemplate(warning.templateId!)"
        :nested="isFromNestedNode(warning)"
        @show-issue="navigateToIssue(warning)"
      />
    </TransitionGroup>
  </div>

  <div v-if="shouldDisplayEmptyMessage" class="empty-message">
    <JoyIcon />
    <div>{{ emptyMessage }}</div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.messages {
  align-self: start;
  width: 100%;
}

.category {
  text-align: center;
  padding: 20px;
}

.error-icon {
  &:deep(circle) {
    fill: v-bind("$colors.error");
    stroke: v-bind("$colors.error");
  }

  &:deep(path) {
    stroke: var(--knime-white);
    stroke-width: 5px;
  }
}

.warning-icon {
  &:deep(polygon) {
    fill: v-bind("$colors.warning");
  }
}

.empty-message {
  --color: var(--knime-gray-dark);

  text-align: center;
  padding-top: 150px;
  color: var(--color);

  & svg {
    stroke: var(--color);

    @mixin svg-icon-size 70;
  }
}

/* .slide-move, */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(-30px, 0);
}
</style>
