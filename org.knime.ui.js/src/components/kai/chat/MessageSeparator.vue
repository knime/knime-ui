<script setup lang="ts">
import { computed } from "vue";

import { Pill } from "@knime/components";
import { formatDateString } from "@knime/utils";

import { isToday, isYesterday } from "./utils";

interface Props {
  timestamp: number;
}
const props = defineProps<Props>();

const label = computed(() => {
  if (isToday(props.timestamp)) {
    return "Today";
  }

  if (isYesterday(props.timestamp)) {
    return "Yesterday";
  }

  return formatDateString(new Date(props.timestamp).toISOString());
});
</script>

<template>
  <Pill color="white" class="message-separator">
    {{ label }}
  </Pill>
</template>

<style lang="postcss" scoped>
& .message-separator {
  margin: 30px 0;

  &:first-child {
    margin-top: 15px;
  }
}
</style>
