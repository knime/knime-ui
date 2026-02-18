<script setup lang="ts">
import { computed, toRef } from "vue";

import ExtensionCommunityIcon from "@knime/styles/img/icons/extension-community.svg";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";

import NodeTemplateHelpIcon from "./NodeTemplateHelpIcon.vue";
import { useComponentOwnershipInfo } from "./useComponentOwnershipInfo";

type Props = {
  nodeTemplate:
    | NodeTemplateWithExtendedPorts
    | ComponentNodeTemplateWithExtendedPorts;
  isHovered: boolean;
  showFloatingHelpIcon?: boolean;
  isSelected?: boolean;
  isDescriptionActive?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isDescriptionActive: false,
  showFloatingHelpIcon: false,
});

const emit = defineEmits(["helpIconClick"]);

const nodeTemplateRef = toRef(props, "nodeTemplate");
const ownershipInfo = useComponentOwnershipInfo(nodeTemplateRef);
const showCommunityIcon = computed(() => ownershipInfo.showCommunityIcon.value);
const tileTitle = computed(() => {
  if (ownershipInfo.isComponent.value) {
    return ownershipInfo.componentTooltipText.value || null;
  }

  return props.nodeTemplate.extension && props.nodeTemplate.extension.vendor
    ? `${props.nodeTemplate.extension.name} \nby “${props.nodeTemplate.extension.vendor.name}”`
    : null;
});
</script>

<template>
  <div
    class="node-template-list-mode"
    :class="{ 'with-community-icon': showCommunityIcon }"
    :title="tileTitle"
    data-test-id="node-template"
  >
    <div class="node-preview">
      <slot name="node-preview" />
    </div>

    <div class="node-template-content">
      <span class="node-name" data-test-id="node-template-name">
        {{ nodeTemplate.name }}
      </span>
    </div>

    <ExtensionCommunityIcon
      v-if="showCommunityIcon"
      class="extension-community-icon"
    />

    <NodeTemplateHelpIcon
      v-if="showFloatingHelpIcon"
      class="help-icon"
      :is-selected="isDescriptionActive"
      :is-hovered="isHovered"
      @help-icon-click="emit('helpIconClick')"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-template-list-mode {
  display: flex;
  background-color: transparent;
  align-items: center;
  justify-content: left;
  max-height: 24px;
  position: relative;
  width: 100%;

  --space-for-icons: 52px;

  &.with-community-icon {
    --space-for-icons: 72px;
  }

  & .node-template-content {
    display: flex;
    max-width: calc(100% - var(--space-for-icons));
    align-items: center;
    align-self: center;

    & .node-name {
      display: block;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  & .node-preview {
    flex: 0 0 24px;
    height: 24px;
    margin-right: var(--space-4);
  }

  & .extension-community-icon {
    @mixin svg-icon-size 12;

    margin: 0 var(--space-4);
    stroke: var(--knime-masala);
  }

  & .help-icon {
    padding: 0;
    margin: 0;
    position: absolute;
    right: var(--space-4);
  }
}
</style>
