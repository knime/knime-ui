<script setup lang="ts">
import { computed } from "vue";
import { formatDateString } from "webapps-common/util/format";
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
  <div class="message-separator">
    {{ label }}
  </div>
</template>

<style lang="postcss" scoped>
& .message-separator {
  background-color: var(--knime-white);
  padding: 2px 10px;
  border-radius: 10px;
  margin: 30px 0;

  &:first-child {
    margin-top: 15px;
  }
}
</style>
