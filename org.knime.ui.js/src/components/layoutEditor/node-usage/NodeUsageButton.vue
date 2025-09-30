<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "@floating-ui/vue";

import { Button } from "@knime/components";
import CogIcon from "@knime/styles/img/icons/cog.svg";

import * as layoutEditorZIndices from "../z-indices";

import NodeUsageDialog from "./NodeUsageDialog.vue";

const show = ref(false);
const reference = ref(null);
const floating = ref(null);
const { floatingStyles } = useFloating(reference, floating, {
  placement: "bottom-start",
});
</script>

<template>
  <Button
    ref="reference"
    class="node-usage-button"
    compact
    with-border
    title="Node usage"
    @click="show = !show"
  >
    <CogIcon class="node-usage-icon" />
  </Button>

  <NodeUsageDialog
    v-if="show"
    ref="floating"
    :style="floatingStyles"
    class="node-usage-dialog"
  />

  <button
    v-if="show"
    class="dialog-overlay"
    @click.self.stop.prevent="show = false"
    @mousedown.prevent
  />
</template>

<style lang="postcss" scoped>
.button.compact.with-border.node-usage-button {
  padding: var(--space-4) var(--space-8);
  min-width: auto;

  & .node-usage-icon {
    margin-right: 0;
  }
}

/* full window overlay to prevent other actions while config dialog is open */
.dialog-overlay {
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background-color: transparent;
  position: fixed;
  inset: 0;
  z-index: v-bind("layoutEditorZIndices.dialogOverlay");
}
</style>
