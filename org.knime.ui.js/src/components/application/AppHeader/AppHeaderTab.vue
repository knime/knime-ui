<script setup lang="ts">
import { computed, toRefs } from "vue";

import CloudComponentIcon from "@knime/styles/img/icons/cloud-component.svg";
import CloudWorkflowIcon from "@knime/styles/img/icons/cloud-workflow.svg";
import NodeWorkflowIcon from "@knime/styles/img/icons/node-workflow.svg";
import WorkflowIcon from "@knime/styles/img/icons/workflow.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import CloseButton from "@/components/common/CloseButton.vue";

/* eslint-disable no-magic-numbers */
const maxCharSwitch = [
  (width: number) => (width < 600 ? 10 : 0),
  (width: number) => (width < 900 ? 20 : 0),
  (width: number) => (width < 1280 ? 50 : 0),
  (width: number) => (width < 1680 ? 100 : 0),
  (width: number) => (width < 2180 ? 150 : 0),
  (width: number) => (width < 2800 ? 200 : 0),
  (width: number) => (width >= 2800 ? 256 : 0),
];
/* eslint-enable no-magic-numbers */

const maxCharFunction = (windowWidth: number) => {
  const getMaxChars = maxCharSwitch.find((fn) => fn(windowWidth))!;
  return getMaxChars(windowWidth);
};

type Props = {
  name: string;
  projectId: string;
  version: number | null;
  provider: string;
  projectType?: string | null;
  isActive?: boolean;
  hasUnsavedChanges?: boolean;
  windowWidth?: number;
  disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  projectType: null,
  isActive: false,
  hasUnsavedChanges: false,
  windowWidth: 0,
  disabled: false,
});

const emit = defineEmits<{
  (e: "hover", projectId: string | null): void;
  (e: "switchWorkflow", projectId: string, version: number | null): void;
  (e: "closeProject", projectId: string): void;
}>();

const { windowWidth, name, provider } = toRefs(props);

const shouldTruncateName = computed(() => {
  const maxChars = maxCharFunction(windowWidth.value);
  return name.value.length > maxChars;
});

const truncatedProjectName = computed(() => {
  const maxChars = maxCharFunction(windowWidth.value);

  return shouldTruncateName.value
    ? `${name.value.slice(0, maxChars)} …`
    : name.value;
});

const isLocal = computed(
  () => provider.value.toUpperCase() === SpaceProviderNS.TypeEnum.LOCAL,
);

const tooltipContent = computed(() => {
  return `${name.value}`;
});

const activateTab = () => {
  if (props.disabled || props.isActive) {
    return;
  }

  emit("switchWorkflow", props.projectId, props.version);
};
</script>

<template>
  <div
    class="tab-item"
    :class="{ active: isActive }"
    :title="shouldTruncateName ? name : undefined"
    :data-test-id="name"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    :aria-selected="isActive"
    :aria-labelledby="`tab-title-${projectId}`"
    role="tab"
    @click.stop="activateTab"
    @keydown.enter="activateTab"
    @click.middle.stop="!disabled && emit('closeProject', projectId)"
  >
    <!-- There are different icons for local workflows and for components -->
    <template v-if="isLocal">
      <NodeWorkflowIcon
        v-if="projectType === 'Component'"
        aria-hidden="true"
        focusable="false"
      />
      <WorkflowIcon v-else aria-hidden="true" focusable="false" />
    </template>
    <template v-else>
      <CloudComponentIcon
        v-if="projectType === 'Component'"
        aria-hidden="true"
        focusable="false"
      />
      <CloudWorkflowIcon v-else aria-hidden="true" focusable="false" />
    </template>

    <span :id="`tab-title-${projectId}`" class="text" :title="tooltipContent">
      {{ truncatedProjectName }}
    </span>
    <CloseButton
      :disabled="disabled"
      class="close-icon"
      :has-unsaved-changes="hasUnsavedChanges"
      aria-label="Close project"
      title="Close project"
      @close.stop="emit('closeProject', projectId)"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.tab-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 80px;
  max-width: 240px;
  height: 39px;
  padding-bottom: 1px;
  padding-left: 10px;
  margin: 0 1px;
  color: var(--knime-white);
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  background-color: var(--knime-black);
  border-radius: 1px 1px 0 0;

  & svg {
    min-width: 18px;
    stroke: var(--knime-white);

    @mixin svg-icon-size 18;
  }

  &:hover:not([aria-disabled="true"]) {
    background-color: hsl(0deg 3% 12% / 30%);
  }

  & .text {
    width: 100%;
    min-width: 0;
    padding: 10px 0 10px 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
    font-weight: 500;
    line-height: 21px;
    color: var(--knime-white);
    text-align: left;
    white-space: nowrap;
  }

  & .close-icon {
    padding-left: 5px;

    & :deep(svg) {
      stroke: var(--knime-white);

      @mixin svg-icon-size 20;
    }
  }

  &:focus-visible:not([aria-disabled="false"]) {
    outline: none;
  }

  &:focus-visible:not([aria-disabled="true"]) {
    text-decoration: underline;
    outline: none;
    background-color: hsl(0deg 3% 12% / 30%);
  }
}

.tab-item.active {
  color: var(--knime-black);
  cursor: inherit;
  background-color: var(--knime-yellow);

  & .text {
    color: var(--knime-black);
  }

  & svg {
    stroke: var(--knime-black);
  }

  & .close-icon {
    & :deep(svg) {
      stroke: var(--knime-black);
    }
  }

  &:not([aria-disabled="true"]) .close-icon {
    & :deep(svg) {
      &:hover {
        background: var(--knime-masala-semi);
        stroke: var(--knime-white);
      }
    }
  }

  &:hover:not([aria-disabled="true"]),
  &:focus:not([aria-disabled="true"]) {
    cursor: inherit;
    background-color: var(--knime-yellow);
  }
}
</style>
