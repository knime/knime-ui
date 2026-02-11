<script setup lang="ts">
import { computed } from "vue";

import ExtensionCommunityIcon from "@knime/styles/img/icons/extension-community.svg";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/util/dataMappers";

import NodeTemplateHelpIcon from "./NodeTemplateHelpIcon.vue";
import {
  isComponentNodeTemplate,
  shouldShowCommunityIcon,
} from "./nodeTemplateCommunityIcon";

type Props = {
  nodeTemplate:
    | NodeTemplateWithExtendedPorts
    | ComponentNodeTemplateWithExtendedPorts;
  isHovered: boolean;
  isDescriptionActive?: boolean;
  showFloatingHelpIcon?: boolean;
  isSelected?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isDescriptionActive: false,
  showFloatingHelpIcon: false,
});
const emit = defineEmits(["helpIconClick"]);
const extensionText = computed(() => {
  if (!props.nodeTemplate.extension || !props.nodeTemplate.extension.vendor) {
    return "";
  }
  return `\n———\n${props.nodeTemplate.extension.name}\nby ${props.nodeTemplate.extension.vendor.name}`;
});

const showCommunityIcon = computed(() =>
  shouldShowCommunityIcon(props.nodeTemplate),
);

const tileTitle = computed(() => {
  if (isComponentNodeTemplate(props.nodeTemplate)) {
    if (props.nodeTemplate.isOwnedByAnotherIdentity) {
      return "This component comes from outside your personal or team spaces.";
    } else {
      return props.nodeTemplate.name;
    }
  }

  return `${props.nodeTemplate.name}${extensionText.value}`;
});
</script>

<template>
  <div
    class="node-template-icon-mode"
    :title="tileTitle"
    data-test-id="node-template"
  >
    <div class="name-icon-wrapper">
      <span class="name" data-test-id="node-template-name">
        {{ nodeTemplate.name }}
      </span>

      <div class="node-preview">
        <slot name="node-preview" />
      </div>
    </div>

    <NodeTemplateHelpIcon
      v-if="showFloatingHelpIcon"
      class="help-icon"
      :is-selected="isDescriptionActive"
      :is-hovered="isHovered"
      @help-icon-click="emit('helpIconClick')"
    />

    <div class="extension-info">
      <ExtensionCommunityIcon
        v-if="showCommunityIcon"
        class="extension-community-icon"
      />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-template-icon-mode {
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 10px 10px 20px;

  & .name-icon-wrapper {
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;

    & .name {
      font-weight: 700;
      line-height: 1.15;
      max-height: 26px;
      min-width: 90px;
      max-width: 90px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-align: center;
      position: absolute;
      bottom: 58px;
    }

    & .node-preview {
      width: 70px;
    }
  }

  & .help-icon {
    padding: 0;
    position: absolute;
    top: -5px;
    right: -5px;
  }

  & .extension-info {
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    margin: -17px 0;
    padding: 0 2px;
    color: var(--knime-dove-gray);

    & .extension-community-icon {
      @mixin svg-icon-size 16;

      stroke: var(--knime-masala);
    }
  }
}
</style>
