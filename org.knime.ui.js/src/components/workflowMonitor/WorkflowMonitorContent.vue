<script setup lang="ts">
import { computed } from "vue";

import { Pill } from "@knime/components";
import WarningIcon from "@knime/styles/img/icons/sign-warning.svg";
import CloseIcon from "@knime/styles/img/icons/circle-close.svg";
import JoyIcon from "@knime/styles/img/icons/joy.svg";

import type { WorkflowMonitorMessage as WorkflowMonitorMessageType } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import * as $colors from "@/style/colors";

import WorkflowMonitorMessage from "./WorkflowMonitorMessage.vue";

const store = useStore();

const selectedNodes = computed(() => store.state.selection.selectedNodes);
const workflowMonitorState = computed(
  () => store.state.workflowMonitor.currentState,
);

const hasLoaded = computed(() => store.state.workflowMonitor.hasLoaded);

const errors = computed(() => workflowMonitorState.value.errors);
const warnings = computed(() => workflowMonitorState.value.warnings);

const shouldShowErrors = computed(() => errors.value.length > 0);
const shouldShowWarnings = computed(() => warnings.value.length > 0);

const shouldDisplayEmptyMessage = computed(() => {
  return (
    hasLoaded.value &&
    [errors, warnings].every((messages) => messages.value.length === 0)
  );
});

const getTemplate = (templateId: string) => {
  return store.state.nodeTemplates.cache[templateId];
};

const navigateToIssue = async (message: WorkflowMonitorMessageType) => {
  await store.dispatch("workflowMonitor/navigateToIssue", { message });
};

const isFromNestedNode = (message: WorkflowMonitorMessageType) => {
  return message.workflowId !== "root";
};

const isHighlighted = (message: WorkflowMonitorMessageType) => {
  return selectedNodes.value[message.nodeId];
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
        :component-info="error.componentInfo"
        :nested="isFromNestedNode(error)"
        :is-highlighted="isHighlighted(error)"
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
        :component-info="warning.componentInfo"
        :nested="isFromNestedNode(warning)"
        :is-highlighted="isHighlighted(warning)"
        @show-issue="navigateToIssue(warning)"
      />
    </TransitionGroup>
  </div>

  <div v-if="shouldDisplayEmptyMessage" class="empty-message">
    <JoyIcon />
    <div>There are no errors or warnings in your workflow.</div>
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
