<script setup lang="ts">
import SwitchIcon from "webapps-common/ui/assets/img/icons/arrow-prev.svg";

interface Props {
  expanded?: boolean;
  disabled?: boolean;
  /**
   *  Expanded width of the panel's content.
   *  Should be a fixed width.
   */
  width?: string;
  /**
   * The hover title to be shown when the panel is collapsed
   */
  title?: string | null;
}

withDefaults(defineProps<Props>(), {
  expanded: false,
  disabled: false,
  width: "250px",
  title: null,
});

interface Emits {
  (e: "toggleExpand"): void;
}

defineEmits<Emits>();
</script>

<template>
  <div class="panel">
    <div class="container" :style="{ width: expanded ? width : 0 }">
      <div class="hidden-content" :style="{ width }">
        <slot />
      </div>
    </div>

    <button
      :title="expanded ? undefined : title ?? undefined"
      :disabled="disabled"
      data-test-id="left-panel-handler"
      @click="$emit('toggleExpand')"
    >
      <SwitchIcon :style="{ transform: expanded ? undefined : 'scaleX(-1)' }" />
    </button>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.panel {
  display: flex;
  height: 100%;
}

.container {
  background-color: var(--sidebar-background-color);
  overflow-x: hidden;
}

.hidden-content {
  height: 100%;
}

button {
  border: none;
  border-left: 1px solid var(--knime-silver-sand);
  width: 10px;
  padding: 0;
  background-color: var(--sidebar-background-color);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background-color: var(--knime-silver-sand-semi);
  }

  & svg {
    @mixin svg-icon-size 10;

    stroke: var(--knime-masala);
  }
}
</style>
