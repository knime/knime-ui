<script setup lang="ts">
import { computed } from "vue";

import { hotkeys } from "@knime/utils";

import type { HotkeyText, Hotkeys } from "@/services/shortcuts/types";

interface Props {
  hotkey: Hotkeys;
}

const props = defineProps<Props>();

const isText = (keyOrText: Hotkeys[number]): keyOrText is HotkeyText => {
  return typeof keyOrText !== "string" && keyOrText.hasOwnProperty("text");
};

const isNextItemText = (index: number) => {
  const item = props.hotkey.at(index + 1);
  return item ? isText(item) : false;
};

const isLast = (index: number) => index === props.hotkey.length - 1;

const keys = computed(() =>
  props.hotkey.map((key) => (isText(key) ? key : hotkeys.formatHotkey(key))),
);
</script>

<template>
  <template v-for="(keyOrText, index) of keys" :key="index">
    <template v-if="isText(keyOrText)">
      <span class="text">{{ keyOrText.text }}</span>
    </template>
    <template v-else>
      <kbd>{{ keyOrText }}</kbd>
      <span v-if="!isLast(index) && !isNextItemText(index)">
        {{ hotkeys.getDefaultSeparator() }}
      </span>
    </template>
  </template>
</template>

<style lang="postcss" scoped>
kbd {
  padding: 3px 5px;
  font-family: Roboto, sans-serif;
  font-size: inherit;
  vertical-align: middle;
  background: var(--knime-white);
  border: 1px solid var(--knime-white);
  border-radius: 4px;
  box-shadow: 1px 1px 1px 1px var(--knime-gray-dark-semi);
}

.text {
  padding: 0 3px;
}

span {
  margin: 0 2px;
}
</style>
