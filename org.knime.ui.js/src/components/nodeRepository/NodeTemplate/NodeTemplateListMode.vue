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

defineProps<Props>();

const emit = defineEmits(["helpIconClick"]);
</script>

<template>
  <div class="display-list">
    <div class="node-preview">
      <slot name="node-preview" />
    </div>

    <div class="content">
      <span class="node-name" :title="nodeTemplate.name">
        {{ nodeTemplate.name }}
      </span>

      <span class="extension-name">
        KNIME Python integration this is a very long text
      </span>
    </div>

    <KNIMETriangleIcon class="knime-icon" />

    <NodeTemplateHelpIcon
      v-if="showFloatingHelpIcon"
      class="help-icon"
      :is-selected="isSelected"
      :is-hovered="isHovered"
      @help-icon-click="emit('helpIconClick')"
    />
  </div>
</template>

<style lang="postcss" scoped>
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
      font-size: 11px;
    }

    & .extension-name {
      font-size: 9px;
      color: var(--knime-dove-gray);
    }
  }

  & .node-preview {
    width: 25px;
    height: 27px;
    margin-right: 5px;
  }

  & .knime-icon {
    width: 15px;
    height: 12px;
    margin: 0 6px 2px auto;
    fill: var(--knime-dove-gray);
  }

  & .help-icon {
    padding: 0;
    position: absolute;
    right: -4px;
    top: -4px;
  }
}
</style>
