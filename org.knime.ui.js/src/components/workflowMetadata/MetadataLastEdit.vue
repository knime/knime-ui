<script lang="ts">
import { defineComponent } from "vue";

import { formatDateString } from "@knime/utils";

export default defineComponent({
  props: {
    lastEdit: {
      type: String,
      default: null,
    },
  },
  methods: {
    formatDateString,
  },
});
</script>

<template>
  <div class="last-updated">
    <span v-if="lastEdit">Last update: {{ formatDateString(lastEdit) }}</span>
    <span v-else>Last update: no update yet</span>
  </div>
</template>

<style lang="postcss" scoped>
.last-updated {
  color: var(--knime-dove-gray);
  font-style: italic;
}
</style>
