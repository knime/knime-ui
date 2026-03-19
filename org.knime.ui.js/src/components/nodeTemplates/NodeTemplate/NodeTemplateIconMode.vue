<script setup lang="ts">
import { computed, toRef } from "vue";

import ExtensionCommunityIcon from "@knime/styles/img/icons/extension-community.svg";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";

import NodeTemplateHelpIcon from "./NodeTemplateHelpIcon.vue";
import { useComponentOwnershipInfo } from "./useComponentOwnershipInfo";
import { useNodeTemplateExtensionInfo } from "./useNodeTemplateExtensionInfo";

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

const nodeTemplate = toRef(props, "nodeTemplate");

const { extensionInfo } = useNodeTemplateExtensionInfo({ nodeTemplate });
const { ownershipInfo } = useComponentOwnershipInfo({ nodeTemplate });

const showCommunityIcon = computed(
  () =>
    ownershipInfo.value?.isFromCommunity ||
    extensionInfo.value?.isFromCommunity,
);

const tileTitle = computed(() => {
  return ownershipInfo.value?.tooltip ?? extensionInfo.value?.tooltip ?? "";
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
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 20px;

  & .name-icon-wrapper {
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;

    & .name {
      position: absolute;
      bottom: 58px;
      display: -webkit-box;
      min-width: 90px;
      max-width: 90px;
      max-height: 26px;
      overflow: hidden;
      -webkit-line-clamp: 2;
      font-weight: 700;
      line-height: 1.15;
      text-align: center;
      -webkit-box-orient: vertical;
    }

    & .node-preview {
      width: 70px;
    }
  }

  & .help-icon {
    position: absolute;
    top: -5px;
    right: -5px;
    padding: 0;
  }

  & .extension-info {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2px;
    margin: -17px 0;
    overflow: hidden;
    color: var(--knime-dove-gray);

    & .extension-community-icon {
      @mixin svg-icon-size 16;

      stroke: var(--knime-masala);
    }
  }
}
</style>
