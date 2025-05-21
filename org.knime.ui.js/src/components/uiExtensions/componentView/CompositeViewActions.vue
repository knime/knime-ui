<script setup lang="ts">
import { computed } from "vue";

import { SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";

import type { ComponentNode } from "@/api/gateway-api/generated-api";
import {
  applyAndExecute,
  applyToDefaultAndExecute,
  isCompositeViewDefault,
  isCompositeViewDirty,
  resetToDefaults,
} from "@/composables/usePageBuilder/usePageBuilder";

const props = defineProps<{
  componentNode: ComponentNode;
}>();

const isExecuted = computed(() => {
  return props.componentNode.state?.executionState === "EXECUTED";
});

const isDirtyAndExecuted = computed(() => {
  return isCompositeViewDirty.value && isExecuted.value;
});
</script>

<template>
  <span class="composite-view-actions">
    <span
      class="unsaved-changes-indicator"
      :class="{ dirty: isDirtyAndExecuted }"
      title="Unapplied temporary changes"
    />

    <SubMenu
      :items="[
        {
          text: 'Execute with changes',
          metadata: { onClick: applyAndExecute },
          disabled: !isDirtyAndExecuted,
        },
        {
          text: 'Apply changes as new default',
          metadata: {
            onClick: () => applyToDefaultAndExecute(props.componentNode.id),
          },
          disabled: isCompositeViewDefault,
        },
        {
          text: 'Reset to default',
          metadata: { onClick: () => resetToDefaults(props.componentNode.id) },
          disabled: isCompositeViewDefault,
        },
      ]"
      :compact="true"
      button-title="Data App View Actions"
      orientation="top"
      :disabled="!isExecuted"
      class="action-button"
      @item-click="(_, item) => item.metadata?.onClick()"
    >
      <template #default="{ expanded }">
        <DropdownIcon class="dropdown-icon" :class="{ rotated: expanded }" />
      </template>
    </SubMenu>
  </span>
</template>

<style lang="postcss" scoped>
@import url("@knime/styles/css/mixins.css");

.composite-view-actions {
  width: 100%;
  height: 100%;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  margin-right: -8px;
}

.unsaved-changes-indicator {
  width: var(--space-6);
  height: var(--space-6);
  display: block;
  border-radius: 100%;
  background-color: transparent;
  margin-left: 1px;

  &.dirty {
    background-color: var(--knime-yellow);
    animation: pulse 1.5s infinite ease-in-out;
  }
}

.dropdown-icon {
  @mixin svg-icon-size 12;

  transition: transform 0.2s ease-in-out;

  &.rotated {
    transform: scaleY(-1);
  }
}

.action-button {
  cursor: pointer;
  margin-left: var(--space-4);
  display: inline-flex;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.25);
  }

  100% {
    transform: scale(1);
  }
}
</style>
