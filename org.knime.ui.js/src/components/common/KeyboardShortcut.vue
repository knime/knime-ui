<script setup lang="ts">
import type { Hotkeys } from "@/shortcuts/types";
import { mapKeyFormat, getSeparator } from "@/util/formatHotkeys";

interface Props {
  hotkey: Hotkeys | string[];
}

const props = defineProps<Props>();

const isText = (keyOrText: string) => {
  return keyOrText.startsWith("[") && keyOrText.endsWith("]");
};

const asText = (text: string) => {
  return text.substring(1, text.length - 1).replace("\n", "");
};

const nextItem = (index: number) => {
  return (props.hotkey.at(index + 1) ?? "") as string;
};

const isLast = (index: number) => {
  return index === props.hotkey.length - 1;
};
</script>

<template>
  <template v-for="(keyOrText, index) of mapKeyFormat(hotkey)" :key="index">
    <template v-if="isText(keyOrText)">
      <span class="text">{{ asText(keyOrText) }}</span>
    </template>
    <template v-else>
      <kbd>{{ keyOrText }}</kbd>
      <span v-if="!isLast(index) && !isText(nextItem(index))">
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
