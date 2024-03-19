<script setup lang="ts">
import type { HotkeyText, Hotkeys } from "@/shortcuts/types";
import { mapKeyFormat, getSeparator } from "@/util/formatHotkeys";

interface Props {
  hotkey: Hotkeys;
}

const props = defineProps<Props>();

const isText = (keyOrText: Hotkeys[number]): keyOrText is HotkeyText => {
  return typeof keyOrText !== "string" && keyOrText.hasOwnProperty("text");
};

const getText = (keyOrText: Hotkeys[number]) => {
  return (keyOrText as HotkeyText).text;
};

const isNextItemText = (index: number) => {
  const item = props.hotkey.at(index + 1);
  return item ? isText(item) : false;
};

const isLast = (index: number) => {
  return index === props.hotkey.length - 1;
};
</script>

<template>
  <template v-for="(keyOrText, index) of mapKeyFormat(hotkey)" :key="index">
    <template v-if="isText(keyOrText)">
      <span class="text">{{ getText(keyOrText) }}</span>
    </template>
    <template v-else>
      <kbd>{{ keyOrText }}</kbd>
      <span v-if="!isLast(index) && !isNextItemText(index)">
        {{ getSeparator() }}
      </span>
    </template>
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

.text {
  padding: 0 3px;
}

span {
  margin: 0 2px;
}
</style>
