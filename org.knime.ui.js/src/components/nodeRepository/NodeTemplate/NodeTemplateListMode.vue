<script setup lang="ts">
import ExtensionCommunityIcon from "webapps-common/ui/assets/img/icons/extension-community.svg";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import NodeTemplateHelpIcon from "./NodeTemplateHelpIcon.vue";

export type Props = {
  nodeTemplate: NodeTemplateWithExtendedPorts;
  isHovered: boolean;
  displayMode?: NodeRepositoryDisplayModesType;
  showFloatingHelpIcon?: boolean;
  isSelected?: boolean;
  isDescriptionActive: boolean;
};

withDefaults(defineProps<Props>(), {
  isSelected: false,
  isDescriptionActive: false,
  showFloatingHelpIcon: false,
  displayMode: "icon",
});

const emit = defineEmits(["helpIconClick"]);
</script>

<template>
  <div
    class="display-list"
    :title="
      nodeTemplate.extension && nodeTemplate.extension.vendor
        ? `${nodeTemplate.extension.name} \nby “${nodeTemplate.extension.vendor.name}”`
        : undefined
    "
  >
    <div class="node-preview">
      <slot name="node-preview" />
    </div>

    <div class="content">
      <span class="node-name">
        {{ nodeTemplate.name }}
      </span>
    </div>

    <ExtensionCommunityIcon
      v-if="!nodeTemplate.extension?.vendor?.isKNIME"
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

.display-list {
  background-color: var(--knime-white);
  align-items: center;
  justify-content: left;
  max-height: 27px;
  position: relative;
  padding: 1px 0;

  & .content {
    display: flex;
    flex-direction: column;

    & .node-name {
      font-size: 13px;
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  & .node-preview {
    width: 25px;
    height: 27px;
    margin-right: 5px;
  }

  & .extension-community-icon {
    @mixin svg-icon-size 16;

    margin: 0 6px 2px auto;
    stroke: var(--knime-masala);
  }

  & .help-icon {
    padding: 0;
    position: absolute;
    right: -4px;
    top: -4px;
  }
}
</style>
