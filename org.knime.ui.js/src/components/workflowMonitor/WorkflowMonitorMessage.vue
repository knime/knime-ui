<script setup lang="ts">
import { computed } from "vue";

import { FunctionButton, NodePreview } from "@knime/components";
import ArrowNextIcon from "@knime/styles/img/icons/arrow-next.svg";
import ArrowRightIcon from "@knime/styles/img/icons/arrow-right.svg";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type {
  ComponentNodeAndDescription,
  WorkflowMonitorMessage,
} from "@/api/gateway-api/generated-api";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

type Props = {
  message?: WorkflowMonitorMessage | null;
  nodeTemplate?: NodeTemplateWithExtendedPorts | null;
  componentInfo?: ComponentNodeAndDescription | null;
  skeleton?: boolean;
  nested?: boolean;
  isHighlighted?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  message: null,
  nodeTemplate: null,
  componentInfo: null,
  skeleton: false,
  nested: false,
  isHighlighted: false,
});

const emit = defineEmits<{
  showIssue: [];
}>();

const nodePreviewProps = computed(() => {
  if (props.componentInfo) {
    return {
      ...props.componentInfo,
      inPorts: [],
      outPorts: [],
      isComponent: true,
    };
  } else if (props.nodeTemplate) {
    return { ...props.nodeTemplate, isComponent: false };
  }
  return null;
});

const NODE_PREVIEW_SIZE_PX = 36;
const NODE_TEMPLATE_SKELETON_PADDING_PX = 8;
const NODE_TEMPLATE_SKELETON_SIZE_PX =
  NODE_PREVIEW_SIZE_PX - NODE_TEMPLATE_SKELETON_PADDING_PX * 2;

const isLoadingNodePreview = computed(
  () => !nodePreviewProps.value || props.skeleton,
);
</script>

<template>
  <div :class="['issue-message', { highlighted: isHighlighted }]">
    <div class="title">
      <span v-if="nested" class="nested-indicator"
        >… <ArrowNextIcon class="arrow"
      /></span>
      <div
        :class="[
          'node-preview',
          { 'node-preview-placeholder': isLoadingNodePreview },
        ]"
      >
        <SkeletonItem
          :width="`${NODE_TEMPLATE_SKELETON_SIZE_PX}px`"
          :height="`${NODE_TEMPLATE_SKELETON_SIZE_PX}px`"
          :loading="isLoadingNodePreview"
        >
          <NodePreview
            v-if="nodePreviewProps"
            :type="nodePreviewProps.type"
            :is-component="nodePreviewProps.isComponent"
            :in-ports="nodePreviewProps.inPorts"
            :out-ports="nodePreviewProps.outPorts"
            :icon="nodePreviewProps.icon"
          />
        </SkeletonItem>
      </div>

      <SkeletonItem width="70%" height="20px" :loading="skeleton">
        <span v-if="message" class="name">{{ message.name }}</span>
      </SkeletonItem>

      <div class="go-to-issue">
        <SkeletonItem
          type="icon-button"
          width="24px"
          height="24px"
          :loading="skeleton"
        >
          <FunctionButton title="Go to issue" @click="emit('showIssue')">
            <ArrowRightIcon />
          </FunctionButton>
        </SkeletonItem>
      </div>
    </div>

    <div class="content">
      <SkeletonItem :loading="skeleton" height="50px">
        <template v-if="message">{{ message.message }}</template>
      </SkeletonItem>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.issue-message {
  background: var(--knime-white);
  border-radius: 5px;
  width: 100%;
  border: 1px solid transparent;

  &.highlighted {
    border-color: var(--knime-cornflower);
  }

  --padding: 12px;

  &:not(:last-child) {
    margin-bottom: 10px;
  }

  & .title {
    --node-size: calc(v-bind(NODE_PREVIEW_SIZE_PX) * 1px);
    --center-correction-padding: 3px;

    display: flex;
    align-items: center;
    max-height: var(--node-size);
    padding-right: 4px;

    & .nested-indicator {
      padding-left: var(--padding);
      padding-top: var(--center-correction-padding);
      white-space: nowrap;

      & .arrow {
        @mixin svg-icon-size 10;
      }
    }

    & .node-preview {
      min-width: var(--node-size);
      width: var(--node-size);
      height: var(--node-size);
    }

    & .node-preview-placeholder {
      padding: calc(v-bind(NODE_TEMPLATE_SKELETON_PADDING_PX) * 1px);
    }

    & .name {
      padding-top: var(--center-correction-padding);
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }
  }

  & .content {
    padding: 4px var(--padding) var(--padding);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  & .go-to-issue {
    margin-left: auto;
    padding-left: 4px;
  }
}
</style>
