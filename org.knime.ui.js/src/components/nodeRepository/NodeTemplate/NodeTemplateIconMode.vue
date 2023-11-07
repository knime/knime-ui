<script setup lang="ts">
import KNIMETriangleIcon from "webapps-common/ui/assets/img/KNIME_Triangle.svg";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import NodeTemplateHelpIcon from "./NodeTemplateHelpIcon.vue";

type Props = {
  nodeTemplate: NodeTemplateWithExtendedPorts;
  showFloatingHelpIcon: boolean;
  displayMode: NodeRepositoryDisplayModesType;
  isHovered: boolean;
  isSelected?: boolean;
};

withDefaults(defineProps<Props>(), {
  isSelected: false,
});
const emit = defineEmits(["helpIconClick"]);
</script>

<template>
  <div class="display-icon">
    <div class="name-icon-wrapper">
      <span class="name" :title="nodeTemplate.name">
        {{ nodeTemplate.name }}
      </span>

      <div class="node-preview">
        <slot name="node-preview" />
      </div>
    </div>

    <NodeTemplateHelpIcon
      v-if="showFloatingHelpIcon"
      class="help-icon"
      :is-selected="isSelected"
      :is-hovered="isHovered"
      @help-icon-click="emit('helpIconClick')"
    />

    <div v-if="nodeTemplate.extension" class="extension-info">
      <span class="name">
        KNIME Python integration this is a very long text
      </span>
      <div v-if="nodeTemplate.extension.vendor?.isKNIME" class="icon-container">
        <KNIMETriangleIcon class="knime-icon" />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.display-icon {
  flex-direction: column;
  position: relative;
  padding: 10px;

  & .name-icon-wrapper {
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;

    & .name {
      font-weight: 700;
      max-height: 26px;
      min-width: 90px;
      max-width: 90px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-align: center;
      position: absolute;
      bottom: 55px;
    }

    & .node-preview {
      width: 70px;
    }
  }

  & .help-icon {
    padding: 0;
    position: absolute;
    top: -3px;
    right: 0;
  }

  & .extension-info {
    display: flex;
    overflow: hidden;
    align-items: center;
    margin: -10px 0;
    padding: 0 2px;
    color: var(--knime-dove-gray);

    & .knime-icon {
      width: 15px;
      height: 12px;
      fill: var(--knime-dove-gray);
    }

    & .name {
      line-height: 1.15;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      max-width: 90px;
      text-align: center;
      padding: 4px;
      font-size: 9px;
      max-height: 26px;
      text-overflow: ellipsis;
    }

    & .icon-container {
      padding: 3px 3px 5px;
      background-color: white;
      border-radius: 9999px;
      width: 16px;
      height: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
