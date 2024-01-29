<script setup lang="ts">
import { computed, toRefs } from "vue";
import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";
import NodeWorkflowIcon from "webapps-common/ui/assets/img/icons/node-workflow.svg";
import CloudWorkflowIcon from "webapps-common/ui/assets/img/icons/cloud-workflow.svg";
import CloudComponentIcon from "webapps-common/ui/assets/img/icons/cloud-component.svg";
import CloseButton from "@/components/common/CloseButton.vue";
import { SpaceProviderNS } from "@/api/custom-types";

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
  projectType?: string | null;
  isActive?: boolean;
  hasUnsavedChanges?: boolean;
  isHoveredOver?: boolean;
  windowWidth?: number;
  provider: string;
};

const props = withDefaults(defineProps<Props>(), {
  projectType: null,
  isActive: false,
  hasUnsavedChanges: false,
  isHoveredOver: false,
  windowWidth: 0,
});

const emit = defineEmits<{
  (e: "hover", projectId: string | null): void;
  (e: "switchWorkflow", projectId: string): void;
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

const onHover = (hoverValue: string | null) => {
  emit("hover", hoverValue);
};
</script>

<template>
  <ul>
    <li
      :class="{ active: isActive, hovered: isHoveredOver }"
      :title="shouldTruncateName ? name : undefined"
      @click.stop="isActive ? null : emit('switchWorkflow', projectId)"
      @mouseover="onHover(projectId)"
      @mouseleave="onHover(null)"
      @click.middle.stop="emit('closeProject', projectId)"
    >
      <!-- There are different icons for local workflows and for components -->
      <template v-if="isLocal">
        <NodeWorkflowIcon v-if="projectType === 'Component'" />
        <WorkflowIcon v-else />
      </template>
      <template v-else>
        <CloudComponentIcon v-if="projectType === 'Component'" />
        <CloudWorkflowIcon v-else />
      </template>

      <span class="text">{{ truncatedProjectName }}</span>
      <CloseButton
        class="close-icon"
        :has-unsaved-changes="hasUnsavedChanges"
        @close.stop="emit('closeProject', projectId)"
      />
    </li>
  </ul>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

ul {
  margin: 0;
  padding: 0;
}

li {
  height: 39px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0 1px;
  padding-left: 10px;
  padding-bottom: 1px;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  border-radius: 1px 1px 0 0;
  background-color: var(--knime-black);
  color: var(--knime-white);
  min-width: 80px;
  max-width: 300px;

  & svg {
    min-width: 18px;
    stroke: var(--knime-white);

    @mixin svg-icon-size 18;
  }

  &:hover {
    background-color: hsl(0deg 3% 12% / 30%);
  }

  & .text {
    color: var(--knime-white);
    font-size: 13px;
    font-weight: 500;
    padding: 10px 0 10px 5px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
    line-height: 21px;
    width: 100%;
    text-align: left;
  }

  & .close-icon {
    padding-left: 5px;

    & :deep(svg) {
      stroke: var(--knime-white);

      @mixin svg-icon-size 20;
    }
  }
}

li.active {
  background-color: var(--knime-yellow);
  color: var(--knime-black);
  cursor: inherit;

  & .text {
    color: var(--knime-black);
  }

  & svg {
    stroke: var(--knime-black);
  }

  & .close-icon {
    & :deep(svg) {
      stroke: var(--knime-black);

      &:hover {
        stroke: var(--knime-white);
        background: var(--knime-masala-semi);
      }
    }
  }

  &:hover,
  &:focus {
    cursor: inherit;
    background-color: var(--knime-yellow);
  }
}
</style>
