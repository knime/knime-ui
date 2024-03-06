<script setup lang="ts">
import type { Hotkeys } from "@/shortcuts/types";
import { mapKeyFormat, getSeparator } from "@/util/formatHotkeys";

interface Props {
  hotkey: Hotkeys | string[];
}

defineProps<Props>();
</script>

<template>
  <template v-for="(key, index) of mapKeyFormat(hotkey)" :key="index">
    <kbd>{{ key }}</kbd>
    <span v-if="index !== hotkey!.length - 1"> {{ getSeparator() }}</span>
  </template>
</template>

<style lang="postcss" scoped>
kbd {
  background: var(--knime-white);
  border: 1px solid var(--knime-white);
  box-shadow: 1px 1px 1px 1px var(--knime-gray-dark-semi);
  border-radius: 4px;
  padding: 3px 5px;
  vertical-align: middle;
  font-size: inherit;
  font-family: Roboto, sans-serif;
}

span {
  margin: 0 2px;
}
</style>
